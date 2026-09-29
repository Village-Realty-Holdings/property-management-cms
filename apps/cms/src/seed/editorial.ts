import type { Payload, Where } from "payload"

import type {
  Amenity,
  CuratedList,
  Location,
  Page,
  Property,
  Site,
} from "@workspace/cms-types"

import type { AmenityRef, LocationLevel, SiteSpec } from "./demo"
import { bullets, heading, richText } from "../lexical"
import { seedWrite, upsert } from "./upsert"

type ID = number

export type EditorialReport = {
  pages: number
  lists: number
  guides: number
  locations: number
  properties: number
  specials: number
  /** What was skipped because the Sync hasn't created what it needs. */
  skipped: string[]
}

const onSite = (site: Site, where: Where = {}): Where => ({
  and: [{ site: { equals: site.id } }, where],
})

const published = { _status: "published" as const }

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s-])([a-z])/g,
      (_, gap: string, c: string) => gap + c.toUpperCase()
    )
}

async function findAll<T>(
  payload: Payload,
  collection: "locations" | "properties" | "specials",
  where: Where,
  sort = "feedId"
): Promise<T[]> {
  const { docs } = await payload.find({
    collection,
    where,
    sort,
    pagination: false,
    overrideAccess: true,
    depth: 0,
  })
  return docs as T[]
}

/**
 * Location Levels are an Admin's choice the Sync never makes. Gives each of
 * the Site's Locations without one a Level by its depth in the tree (all
 * Locations, Withdrawn included): roots are Destinations, their children
 * Areas, anything deeper Complexes. Levels already set are kept. Returns the
 * Active Locations.
 */
async function ensureLocationLevels(
  payload: Payload,
  site: Site
): Promise<Location[]> {
  const all = await findAll<Location>(payload, "locations", onSite(site))
  const byId = new Map(all.map((l) => [l.id, l]))
  const depthOf = (location: Location): number => {
    let depth = 0
    let parent = location.parent
    while (parent != null && depth < 10) {
      const next = byId.get(typeof parent === "object" ? parent.id : parent)
      if (!next) break
      depth++
      parent = next.parent
    }
    return depth
  }
  const locations = all.filter((l) => l.status === "active")
  for (const location of locations) {
    if (location.level) continue
    const depth = depthOf(location)
    const level: LocationLevel =
      depth === 0 ? "destination" : depth === 1 ? "area" : "complex"
    await payload.update({
      collection: "locations",
      id: location.id,
      data: { level },
      ...seedWrite,
    })
    location.level = level
  }
  return locations
}

const locationIntro = (spec: SiteSpec, name: string, level: LocationLevel) => {
  switch (level) {
    case "destination":
      return richText(
        heading(`Stay in ${name}`),
        `${name} is where ${spec.place} are at their best. Browse our ${spec.noun} here, all looked after by our local team.`
      )
    case "area":
      return richText(
        `A favourite corner of ${spec.place}. Our ${spec.noun} in ${name} put you close to everything that makes a trip here special.`
      )
    case "complex":
      return richText(
        `${name} brings shared amenities, easy check-in and on-site help together in one place.`,
        bullets(["Shared amenities for every guest", "Parking on site"])
      )
  }
}

async function seedLocations(
  payload: Payload,
  spec: SiteSpec,
  locations: Location[]
) {
  let count = 0
  for (const location of locations) {
    if (!location.level) continue
    const displayName = location.displayName || titleCase(location.name)
    await payload.update({
      collection: "locations",
      id: location.id,
      data: {
        displayName,
        intro: locationIntro(spec, displayName, location.level),
      },
      ...seedWrite,
    })
    count++
  }
  return count
}

/** Headline, summary and highlights on the Site's first five Properties. */
async function seedProperties(
  payload: Payload,
  spec: SiteSpec,
  properties: Property[]
) {
  const picked = properties.slice(0, 5)
  for (const [index, property] of picked.entries()) {
    const name = property.feedName ?? `Home ${index + 1}`
    const sleeps = property.sleeps ? `sleeps ${property.sleeps}` : "cosy"
    await payload.update({
      collection: "properties",
      id: property.id,
      data: {
        headline: `${titleCase(name)}: ${sleeps}, made for ${spec.place}`,
        summary: `One of our favourite ${spec.noun}, with everything you need for a relaxed stay.`,
        description: richText(
          `${titleCase(name)} is a guest favourite. Our team prepares it before every stay and is a phone call away while you're here.`
        ),
        highlights: [
          { text: "Hand-checked before every stay" },
          { text: "Local support, day and night" },
        ],
        featured: index < 3,
      },
      ...seedWrite,
    })
  }
  return picked.length
}

/** Public copy for the Site's Active Specials, shown on the Site. */
async function seedSpecials(payload: Payload, site: Site) {
  const specials = await findAll<{
    id: ID
    title?: string | null
    code?: string | null
    discountSummary?: string | null
  }>(payload, "specials", onSite(site, { status: { equals: "active" } }))
  for (const special of specials) {
    const title =
      special.title ||
      special.discountSummary ||
      (special.code ? `Special offer ${special.code}` : "Special offer")
    await payload.update({
      collection: "specials",
      id: special.id,
      data: {
        title,
        showOnSite: true,
        summary: special.discountSummary || "A limited-time offer.",
      },
      ...seedWrite,
    })
  }
  return specials.length
}

async function findAmenity(payload: Payload, ref: AmenityRef) {
  const { docs } = await payload.find({
    collection: "amenities",
    where: {
      or: [
        { feedId: { in: ref.feedIds } },
        ...ref.names.map((name) => ({ name: { like: name } })),
      ],
    },
    pagination: false,
    overrideAccess: true,
    depth: 0,
  })
  // In order of preference: Feed IDs, exact names, then names contained.
  const lower = (value: string) => value.toLowerCase()
  const match =
    ref.feedIds
      .map((id) => docs.find((doc) => doc.feedId === id))
      .find(Boolean) ??
    ref.names
      .map((name) => docs.find((doc) => lower(doc.name) === lower(name)))
      .find(Boolean) ??
    ref.names
      .map((name) => docs.find((doc) => lower(doc.name).includes(lower(name))))
      .find(Boolean)
  return match as Amenity | undefined
}

async function seedLists(
  payload: Payload,
  site: Site,
  spec: SiteSpec,
  locations: Location[],
  skipped: string[]
) {
  const destinations = locations.filter((l) => l.level === "destination")
  // Scoped to the destination only when there's no doubt which one.
  const location = destinations.length === 1 ? destinations[0]!.id : null
  const lists: CuratedList[] = []
  for (const list of spec.lists) {
    let amenities: ID[] = []
    if (list.amenity) {
      const amenity = await findAmenity(payload, list.amenity)
      if (!amenity) {
        skipped.push(
          `Curated List "${list.title}": no Amenity ${list.amenity.feedIds[0]}`
        )
        continue
      }
      amenities = [amenity.id]
    }
    const { doc } = await upsert(
      payload,
      "curated-lists",
      onSite(site, { slug: { equals: list.slug } }),
      {
        site: site.id,
        title: list.title,
        slug: list.slug,
        intro: richText(list.intro),
        rule: {
          location,
          amenities,
          minSleeps: list.minSleeps ?? null,
          petsAllowed: list.petsAllowed ?? false,
        },
        sort: list.sort ?? "featured",
        seo: { description: list.intro },
        ...published,
      }
    )
    lists.push(doc)
  }
  return lists
}

async function seedGuides(
  payload: Payload,
  site: Site,
  spec: SiteSpec,
  locations: Location[],
  properties: Property[],
  skipped: string[]
) {
  let count = 0
  for (const guide of spec.guides) {
    const linked = locations.filter(
      (l) => l.level && guide.locationLevels.includes(l.level)
    )
    if (linked.length === 0) {
      skipped.push(
        `Guide "${guide.title}": no ${guide.locationLevels.join("/")} Locations`
      )
      continue
    }
    await upsert(
      payload,
      "guides",
      onSite(site, { slug: { equals: guide.slug } }),
      {
        site: site.id,
        title: guide.title,
        slug: guide.slug,
        excerpt: guide.excerpt,
        body: guide.body,
        locations: linked.map((l) => l.id),
        properties: properties.slice(0, guide.propertyCount).map((p) => p.id),
        seo: { description: guide.excerpt },
        ...published,
      }
    )
    count++
  }
  return count
}

type Layout = NonNullable<Page["layout"]>

/**
 * A `form` Block (ADR-0014). Cast so the seed typechecks before the
 * generated types include the Block.
 */
const formBlock = (block: {
  kind: "inquiry" | "ownerLead" | "contact"
  heading: string
  intro?: string
  submitLabel?: string
}) => ({ blockType: "form", ...block }) as unknown as Layout[number]

function pageSpecs(
  site: Site,
  spec: SiteSpec,
  lists: CuratedList[]
): { title: string; path: string; navOrder?: number; layout: Layout }[] {
  const featured =
    lists.find((list) => list.slug === spec.featuredList) ?? lists[0]
  const phone = (spec.branding.phone as string).replace(/[^+\d]/g, "")
  const email = spec.branding.email as string
  return [
    {
      title: "Home",
      path: "/",
      layout: [
        {
          blockType: "hero",
          heading: spec.hero.heading,
          subheading: spec.hero.subheading,
          cta: { label: "Browse rentals", href: "/rentals" },
        },
        ...(featured
          ? [
              {
                blockType: "propertyGrid" as const,
                heading: featured.title,
                source: "curatedList" as const,
                curatedList: featured.id,
                limit: 6,
              },
            ]
          : []),
        ...(lists.length > 0
          ? [
              {
                blockType: "curatedListCards" as const,
                heading: `Find your kind of ${spec.noun}`,
                lists: lists.map((list) => list.id),
              },
            ]
          : []),
        { blockType: "richText", content: spec.welcome },
        {
          blockType: "faq",
          heading: "Good to know",
          items: spec.faq.map(({ question, answer }) => ({
            question,
            answer: richText(answer),
          })),
        },
        {
          blockType: "callToAction",
          heading: "Own a home here?",
          body: `Let ${site.name} look after it and your guests.`,
          button: { label: "List your property", href: "/owners" },
          style: "primary",
        },
      ],
    },
    {
      title: "About us",
      path: "/about",
      navOrder: 10,
      layout: [
        { blockType: "richText", content: spec.about },
        {
          blockType: "callToAction",
          heading: "Questions before you book?",
          button: { label: "Contact us", href: "/contact" },
          style: "secondary",
        },
      ],
    },
    {
      title: "Owners",
      path: "/owners",
      navOrder: 20,
      layout: [
        {
          blockType: "hero",
          heading: "List your property",
          subheading: `Earn more from your home with ${site.name}.`,
          cta: { label: "Get in touch", href: "/contact" },
        },
        { blockType: "richText", content: spec.owners },
        formBlock({
          kind: "ownerLead",
          heading: "Tell us about your home",
          intro:
            "Share a few details and our owner team will send you a free rental projection.",
          submitLabel: "Request a projection",
        }),
        {
          blockType: "callToAction",
          heading: "Ready to talk?",
          body: "Tell us about your home and we'll send a free rental projection.",
          button: { label: "Contact our owner team", href: "/contact" },
          style: "inverted",
        },
      ],
    },
    {
      title: "Contact",
      path: "/contact",
      navOrder: 30,
      layout: [
        { blockType: "richText", content: spec.contact },
        formBlock({
          kind: "contact",
          heading: "Send us a message",
          submitLabel: "Send message",
        }),
        {
          blockType: "callToAction",
          heading: "Prefer to call?",
          body: `Email ${email} or call us.`,
          button: { label: "Call us", href: `tel:${phone}` },
          style: "primary",
        },
      ],
    },
  ]
}

async function seedPages(
  payload: Payload,
  site: Site,
  spec: SiteSpec,
  lists: CuratedList[]
) {
  const pages = pageSpecs(site, spec, lists)
  for (const page of pages) {
    await upsert(
      payload,
      "pages",
      onSite(site, { path: { equals: page.path } }),
      {
        site: site.id,
        title: page.title,
        path: page.path,
        showInNav: page.navOrder !== undefined,
        navOrder: page.navOrder ?? null,
        layout: page.layout,
        seo: { title: `${page.title} | ${site.name}` },
        ...published,
      }
    )
  }
  return pages.length
}

/**
 * The Site's Editorial Content, on top of what the Sync created: Location
 * landing copy, Property and Special copy, Curated Lists, Guides and Pages,
 * all published. Items that need Locations or Amenities the Sync hasn't
 * created yet are skipped and listed in the report.
 */
export async function seedEditorial(
  payload: Payload,
  site: Site,
  spec: SiteSpec
): Promise<EditorialReport> {
  const skipped: string[] = []
  const locations = await ensureLocationLevels(payload, site)
  const properties = await findAll<Property>(
    payload,
    "properties",
    onSite(site, { status: { equals: "active" } })
  )

  const report: EditorialReport = {
    locations: await seedLocations(payload, spec, locations),
    properties: await seedProperties(payload, spec, properties),
    specials: await seedSpecials(payload, site),
    lists: 0,
    guides: 0,
    pages: 0,
    skipped,
  }
  const lists = await seedLists(payload, site, spec, locations, skipped)
  report.lists = lists.length
  report.guides = await seedGuides(
    payload,
    site,
    spec,
    locations,
    properties,
    skipped
  )
  report.pages = await seedPages(payload, site, spec, lists)

  if (locations.length === 0)
    skipped.push("Location landing copy: no Locations")
  if (properties.length === 0) skipped.push("Property copy: no Properties")
  for (const reason of skipped) {
    payload.logger.warn(`Seed ${site.slug}: skipped ${reason}`)
  }
  return report
}
