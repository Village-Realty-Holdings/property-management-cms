import { currentSite } from "../env"
import { SubmissionError } from "../queries/submit"
import {
  effectiveStayPolicy,
  noLegacyUrls,
  variableValuesFrom,
  propertyPath,
  propertyTypeLabel,
  resolveAmenityPresentation,
  toPagePath,
  type CuratedListRule,
} from "../shared"
import type {
  Amenity,
  ContentAdapter,
  CuratedListSort,
  GuideDoc,
  LocationRef,
  Paginated,
  PropertySummary,
  PropertyType,
  Seo,
  SitemapEntry,
  SpecialDoc,
} from "../types"
import {
  amenities,
  fakeSites,
  propertyTypes,
  type FakeLocation,
  type FakeProperty,
  type FakeSite,
} from "./data"

/**
 * In-memory adapter (CONTENT_ADAPTER=fake). Same rules as the CMS applies to
 * a SiteReader: only the SITE's documents, Active Properties, visible
 * Locations, published Pages/Guides/Curated Lists, shown Reviews, and shown,
 * unexpired Specials. Output shapes match the REST adapter's.
 */

const noSeo: Seo = { title: null, description: null, image: null }

function site(): FakeSite {
  const slug = currentSite()
  const data = fakeSites[slug]
  if (!data) throw new Error(`No fake content for SITE=${slug}`)
  return data
}

const visibleLocations = (s: FakeSite) =>
  s.locations.filter((l) => l.visible && l.status === "active")

const activeProperties = (s: FakeSite) =>
  s.properties.filter((p) => p.status === "active")

/** Root first; null when an ancestor isn't visible (unreachable, as in REST). */
function locationPath(s: FakeSite, location: FakeLocation) {
  const visible = visibleLocations(s)
  const chain: FakeLocation[] = []
  let current: FakeLocation | undefined = location
  while (current) {
    chain.unshift(current)
    const parentId: string | null = current.parentId
    if (parentId === null) return chain
    current = visible.find((l) => l.id === parentId)
  }
  return null
}

function locationRef(s: FakeSite, location: FakeLocation): LocationRef | null {
  const chain = locationPath(s, location)
  if (!chain) return null
  return {
    id: location.id,
    name: location.displayName || location.name,
    slug: location.slug,
    level: location.level,
    path: chain.map((l) => l.slug),
  }
}

const refs = (s: FakeSite, locations: FakeLocation[]) =>
  locations
    .map((l) => locationRef(s, l))
    .filter((ref): ref is LocationRef => ref !== null)

/** The Location and every Location inside it. */
function locationAndDescendants(s: FakeSite, id: string): Set<string> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const l of s.locations) {
      if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) {
        ids.add(l.id)
        grew = true
      }
    }
  }
  return ids
}

function presentAmenities(s: FakeSite, ids?: string[]): Amenity[] {
  const docs = ids ? amenities.filter((a) => ids.includes(a.id)) : amenities
  return resolveAmenityPresentation(s.settings, docs).map((view) => ({
    id: String(view.id),
    feedId: view.feedId,
    name: view.label,
    group: view.group,
    icon: view.icon,
    filter: view.filter,
  }))
}

function propertyType(s: FakeSite, id: string): PropertyType | null {
  const type = propertyTypes.find((t) => t.id === id)
  return type ? { ...type, name: propertyTypeLabel(s.settings, type) } : null
}

function summary(s: FakeSite, p: FakeProperty): PropertySummary {
  const location = visibleLocations(s).find((l) => l.id === p.locationId)
  return {
    id: p.id,
    feedId: p.feedId,
    slug: p.slug,
    name: p.headline ?? p.name,
    summary: p.feedDescription,
    featured: p.featured,
    location: location ? locationRef(s, location) : null,
    propertyType: propertyType(s, p.propertyTypeId),
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sleeps: p.sleeps,
    petsAllowed: p.petsAllowed,
    rating: p.rating,
    reviewCount: p.reviewCount,
    image: null,
  }
}

/** The same semantics as `curatedListWhere` (shared). */
function matches(s: FakeSite, p: FakeProperty, rule: CuratedListRule) {
  if (rule.locationId) {
    if (!locationAndDescendants(s, rule.locationId).has(p.locationId))
      return false
  }
  if (rule.amenityIds?.some((id) => !p.amenityIds.includes(id))) return false
  if (
    rule.propertyTypeIds?.length &&
    !rule.propertyTypeIds.includes(p.propertyTypeId)
  )
    return false
  if (rule.minBedrooms != null && p.bedrooms < rule.minBedrooms) return false
  if (rule.minSleeps != null && p.sleeps < rule.minSleeps) return false
  // `true`: pets allowed; unset or `false`: any.
  if (rule.petsAllowed === true && !p.petsAllowed) return false
  return true
}

const byName = (a: FakeProperty, b: FakeProperty) =>
  a.name.localeCompare(b.name)

const sorts: Record<
  CuratedListSort,
  (a: FakeProperty, b: FakeProperty) => number
> = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || byName(a, b),
  rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || byName(a, b),
  sleeps: (a, b) => b.sleeps - a.sleeps || byName(a, b),
  bedrooms: (a, b) => b.bedrooms - a.bedrooms || byName(a, b),
  name: byName,
}

function members(s: FakeSite, rule: CuratedListRule, sort?: CuratedListSort) {
  return activeProperties(s)
    .filter((p) => matches(s, p, rule))
    .sort(sorts[sort ?? "featured"])
}

function paginate<T>(all: T[], page = 1, limit = 12): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(all.length / limit))
  return {
    docs: all.slice((page - 1) * limit, page * limit),
    totalDocs: all.length,
    page,
    totalPages,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

/**
 * "Today" for the fake adapter. Its Specials end either long ago or far in
 * the future, so a fixed date gives the same answer as the clock, and keeps
 * `new Date()` out of prerendering (Cache Components rejects it there).
 */
const FAKE_NOW = "2026-01-01T00:00:00.000Z"

function shownSpecials(s: FakeSite): SpecialDoc[] {
  const now = FAKE_NOW
  return s.specials
    .filter((sp) => sp.showOnSite && (!sp.validTo || sp.validTo >= now))
    .map((sp) => ({
      id: sp.id,
      slug: sp.slug,
      code: sp.code,
      title: sp.title,
      description: sp.description,
      body: null,
      terms: null,
      disclaimer: null,
      heroImage: null,
      validFrom: sp.validFrom,
      validTo: sp.validTo,
      propertyIds: sp.propertyIds,
    }))
}

function publishedGuides(s: FakeSite): GuideDoc[] {
  return s.guides
    .filter((g) => g.status === "published")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      excerpt: g.excerpt,
      publishedAt: g.publishedAt,
      locationIds: g.locationIds,
      propertyIds: g.propertyIds ?? [],
      heroImage: null,
      body: null,
      seo: noSeo,
    }))
}

/** Submissions stored by the fake adapter, per Site. */
export const fakeSubmissions: Record<string, unknown[]> = {}

export const fakeAdapter: ContentAdapter = {
  async getProperty(slug) {
    const s = site()
    const p = activeProperties(s).find((x) => x.slug === slug)
    if (!p) return null
    return {
      ...summary(s, p),
      amenities: presentAmenities(s, p.amenityIds),
      description: p.description ?? p.feedDescription,
      richDescription: null,
      highlights: [],
      photos: [],
      rooms: [],
      address: null,
      geo: null,
      virtualTourUrl: null,
      onlineBookable: true,
      stayPolicy: effectiveStayPolicy(p, s.settings),
      reviews: p.reviews
        .filter((r) => r.moderation === "shown")
        .map(({ id, rating, body }) => ({
          id,
          rating,
          body,
          title: null,
          guestName: null,
          stayDate: null,
          managerResponse: null,
        })),
      specials: shownSpecials(s).filter((sp) => sp.propertyIds.includes(p.id)),
      seo: noSeo,
    }
  },

  async getProperties(feedIds) {
    const s = site()
    const byFeedId = new Map(activeProperties(s).map((p) => [p.feedId, p]))
    return feedIds.flatMap((id) => {
      const p = byFeedId.get(id)
      return p ? [summary(s, p)] : []
    })
  },

  async searchProperties({ page, limit, sort, ...rule }) {
    const s = site()
    const hits = members(s, rule, sort).map((p) => summary(s, p))
    return paginate(hits, page, limit)
  },

  async getLocation(path) {
    const s = site()
    const location = visibleLocations(s).find(
      (l) => locationRef(s, l)?.path.join("/") === path.join("/")
    )
    const ref = location && locationRef(s, location)
    if (!location || !ref) return null
    return {
      ...ref,
      description: location.description,
      intro: null,
      heroImage: null,
      complex:
        location.level === "complex"
          ? {
              address: location.complex?.address ?? null,
              sharedAmenities: presentAmenities(
                s,
                location.complex?.sharedAmenityIds ?? []
              ),
              checkInInfo: null,
              housekeeping: null,
              feeNotes: null,
            }
          : null,
      ancestors: refs(s, locationPath(s, location)?.slice(0, -1) ?? []),
      children: refs(
        s,
        visibleLocations(s).filter((l) => l.parentId === location.id)
      ).sort((a, b) => a.name.localeCompare(b.name)),
      seo: noSeo,
    }
  },

  async getCuratedList(slug) {
    const s = site()
    const list = s.curatedLists.find(
      (c) => c.slug === slug && c.status === "published"
    )
    if (!list) return null
    const sort = list.sort ?? "featured"
    return {
      id: list.id,
      slug: list.slug,
      title: list.title,
      description: list.description,
      intro: null,
      heroImage: null,
      rule: list.rule,
      sort,
      properties: members(s, list.rule, sort).map((p) => summary(s, p)),
      seo: noSeo,
    }
  },

  async getPage(path) {
    const s = site()
    const stored = toPagePath(path)
    const page = s.pages.find(
      (p) => p.path === stored && p.status === "published"
    )
    if (!page) return null
    return {
      id: page.id,
      title: page.title,
      path: page.path,
      template: page.template ?? "blank",
      blocks: page.blocks,
      seo: noSeo,
    }
  },

  async getGuide(slug) {
    return publishedGuides(site()).find((g) => g.slug === slug) ?? null
  },

  async listGuides(filter = {}) {
    const guides = publishedGuides(site()).filter(
      (g) => !filter.locationId || g.locationIds.includes(filter.locationId)
    )
    return paginate(guides, filter.page, filter.limit)
  },

  async listSpecials() {
    return shownSpecials(site())
  },

  async getSpecial(slug) {
    return shownSpecials(site()).find((sp) => sp.slug === slug) ?? null
  },

  async getSiteSettings() {
    const s = site()
    const { settings } = s
    const all = presentAmenities(s)
    return {
      slug: settings.slug,
      name: settings.name,
      domain: settings.domain,
      branding: settings.branding,
      client: {
        name: settings.client?.name ?? null,
        url: settings.client?.website ?? null,
      },
      variables: variableValuesFrom(settings),
      navigation: s.pages
        .filter((p) => p.status === "published" && p.showInNav)
        .sort(
          (a, b) =>
            (a.navOrder ?? Infinity) - (b.navOrder ?? Infinity) ||
            a.title.localeCompare(b.title)
        )
        .map((p) => ({ label: p.title, href: p.path })),
      contact: {
        email: settings.branding.email ?? null,
        phone: settings.branding.phone ?? null,
      },
      amenities: all,
      amenityFilters: all.filter((a) => a.filter),
      propertyTypes: propertyTypes
        .map((t) => propertyType(s, t.id))
        .filter((t): t is PropertyType => t !== null),
      stayPolicyDefaults: effectiveStayPolicy(null, settings),
      legacyUrls: settings.legacyUrls ?? noLegacyUrls,
    }
  },

  async listSitemapEntries() {
    const s = site()
    // The fake content has no timestamps.
    const entry = (kind: SitemapEntry["kind"], path: string): SitemapEntry => ({
      kind,
      path,
      lastModified: null,
    })
    return [
      ...s.pages
        .filter((p) => p.status === "published")
        .map((p) => entry("page", p.path)),
      ...activeProperties(s).map((p) =>
        entry("property", propertyPath(p.slug))
      ),
      ...refs(s, visibleLocations(s)).map((ref) =>
        entry("location", `/areas/${ref.path.join("/")}`)
      ),
      ...s.curatedLists
        .filter((c) => c.status === "published")
        .map((c) => entry("curatedList", `/lists/${c.slug}`)),
      ...publishedGuides(s).map((g) => entry("guide", `/guides/${g.slug}`)),
      ...shownSpecials(s).map((sp) => entry("special", `/specials/${sp.slug}`)),
    ]
  },

  async submit(input) {
    if (input.website) {
      throw new SubmissionError("Submission rejected.", [
        { path: "website", message: "Submission rejected." },
      ])
    }
    const slug = site().settings.slug
    const stored = (fakeSubmissions[slug] ??= [])
    stored.push(input)
    return { id: `${slug}-submission-${stored.length}` }
  },
}
