import {
  curatedListPrefilter,
  curatedListWhere,
  effectiveStayPolicy,
  propertiesWithAllAmenities,
  type CuratedListRule,
  type Where,
} from "../shared"
import type {
  CuratedListSort,
  Paginated,
  PropertyDetail,
  PropertySummary,
  Review,
  SearchFilter,
} from "../types"
import type { PropertyDoc, ReviewDoc } from "./docs"
import {
  amenities,
  feedPhoto,
  plainText,
  propertySummary,
  richText,
  seo,
  text,
  type LocationTree,
  type SummaryContext,
} from "./map"
import {
  amenityPopulate,
  loadLocationTree,
  loadSite,
  paginated,
  positive,
  propertyTypePopulate,
  type QueryContext,
} from "./context"
import { applicableSpecials } from "./specials"

/** The Property fields a PropertySummary needs. */
export const summarySelect = {
  slug: true,
  feedId: true,
  featured: true,
  feedName: true,
  headline: true,
  summary: true,
  feedDescription: true,
  location: true,
  propertyType: true,
  bedrooms: true,
  bathrooms: true,
  sleeps: true,
  petsAllowed: true,
  rating: true,
  reviewCount: true,
  photos: true,
  seo: true,
}

/** Populated relationships: only what the mapping reads. */
export const summaryPopulate = {
  locations: { slug: true },
  "property-types": propertyTypePopulate,
  amenities: amenityPopulate,
}

const detailSelect = {
  ...summarySelect,
  amenities: true,
  description: true,
  highlights: true,
  rooms: true,
  address: true,
  geo: true,
  virtualTourUrl: true,
  onlineBookable: true,
  stayPolicy: true,
}

const active: Where = { status: { equals: "active" } }

const sorts: Record<CuratedListSort, string[]> = {
  featured: ["-featured", "feedName", "id"],
  rating: ["-rating", "feedName", "id"],
  sleeps: ["-sleeps", "feedName", "id"],
  bedrooms: ["-bedrooms", "feedName", "id"],
  name: ["feedName", "id"],
}

/** The REST `sort` for a Curated List sort; unknown values sort as Featured. */
export function propertySort(sort: string | null | undefined): string[] {
  return sorts[(sort ?? "featured") as CuratedListSort] ?? sorts.featured
}

/**
 * The `where` for a rule (ADR-0003): descendants of its Location from the
 * Site's Location tree, and for two or more Amenities the two-step lookup
 * `curatedListPrefilter` → `propertiesWithAllAmenities`.
 */
export async function ruleWhere(
  ctx: QueryContext,
  rule: CuratedListRule,
  tree: LocationTree
): Promise<Where> {
  const descendantLocationIds = rule.locationId
    ? tree.descendants(rule.locationId)
    : []
  const prefilter = curatedListPrefilter(rule, { descendantLocationIds })
  if (!prefilter) return curatedListWhere(rule, { descendantLocationIds })

  const { docs } = await ctx.client.find<Pick<PropertyDoc, "id" | "amenities">>(
    "properties",
    {
      where: prefilter,
      select: { amenities: true },
      depth: 0,
      pagination: false,
    }
  )
  return curatedListWhere(rule, {
    descendantLocationIds,
    propertyIdsWithAllAmenities: propertiesWithAllAmenities(docs, rule),
  })
}

/** An Active Property by slug; null when unknown or Withdrawn. */
export async function getProperty(
  ctx: QueryContext,
  slug: string
): Promise<PropertyDetail | null> {
  if (!slug) return null
  const [site, tree, found] = await Promise.all([
    loadSite(ctx),
    loadLocationTree(ctx),
    ctx.client.find<PropertyDoc>("properties", {
      where: { and: [active, { slug: { equals: slug } }] },
      select: detailSelect,
      populate: summaryPopulate,
      depth: 1,
      limit: 1,
    }),
  ])
  const doc = found.docs[0]
  if (!doc) return null

  const [reviews, specials] = await Promise.all([
    shownReviews(ctx, doc.id),
    applicableSpecials(ctx, doc.id),
  ])
  const baseURL = ctx.client.baseURL
  const summary = propertySummary(doc, { site, tree, baseURL })
  const richDescription = richText(doc.description)

  return {
    ...summary,
    amenities: amenities(site, doc.amenities),
    description: plainText(richDescription) ?? text(doc.feedDescription),
    richDescription,
    highlights: (doc.highlights ?? []).flatMap((h) => {
      const value = text(h.text)
      return value ? [value] : []
    }),
    photos: (doc.photos ?? [])
      .filter((photo) => photo.url)
      .map((photo) => feedPhoto(photo, summary.name, baseURL)),
    rooms: (doc.rooms ?? []).map((room) => ({
      name: text(room.name),
      sleeps: room.sleeps ?? null,
      beds: (room.beds ?? []).map((bed) => ({
        type: bed.type,
        count: bed.count ?? 1,
      })),
    })),
    address: mapAddress(doc.address),
    geo:
      typeof doc.geo?.lat === "number" && typeof doc.geo?.lng === "number"
        ? { lat: doc.geo.lat, lng: doc.geo.lng }
        : null,
    virtualTourUrl: text(doc.virtualTourUrl),
    onlineBookable: doc.onlineBookable !== false,
    stayPolicy: effectiveStayPolicy(doc, site),
    reviews,
    specials,
    seo: seo(doc.seo, baseURL),
  }
}

function mapAddress(address: PropertyDoc["address"]) {
  if (!address) return null
  const mapped = {
    line1: text(address.line1),
    city: text(address.city),
    region: text(address.region),
    postalCode: text(address.postalCode),
    country: text(address.country),
  }
  return Object.values(mapped).some((v) => v !== null) ? mapped : null
}

/** Shown, active Reviews of a Property, newest stay first. */
async function shownReviews(
  ctx: QueryContext,
  propertyId: string | number
): Promise<Review[]> {
  const { docs } = await ctx.client.find<ReviewDoc>("reviews", {
    where: {
      and: [
        { property: { equals: propertyId } },
        { moderation: { equals: "shown" } },
        { status: { equals: "active" } },
      ],
    },
    select: {
      rating: true,
      title: true,
      body: true,
      guestName: true,
      stayDate: true,
      managerResponse: true,
    },
    depth: 0,
    limit: 50,
    sort: ["-stayDate", "-createdAt"],
  })
  return docs.map((doc) => ({
    id: String(doc.id),
    rating: doc.rating ?? null,
    body: text(doc.body),
    title: text(doc.title),
    guestName: text(doc.guestName),
    stayDate: doc.stayDate ?? null,
    managerResponse: text(doc.managerResponse),
  }))
}

/** Summaries for Feed IDs (a Feed search result), in the given order. */
export async function getProperties(
  ctx: QueryContext,
  feedIds: string[]
): Promise<PropertySummary[]> {
  const wanted = [...new Set(feedIds.filter(Boolean))]
  if (wanted.length === 0) return []
  const [site, tree, found] = await Promise.all([
    loadSite(ctx),
    loadLocationTree(ctx),
    ctx.client.find<PropertyDoc>("properties", {
      where: { and: [active, { feedId: { in: wanted } }] },
      select: summarySelect,
      populate: summaryPopulate,
      depth: 1,
      pagination: false,
    }),
  ])
  const summaries = new Map(
    found.docs.map((doc) => [
      doc.feedId,
      propertySummary(doc, { site, tree, baseURL: ctx.client.baseURL }),
    ])
  )
  return feedIds.flatMap((id) => {
    const summary = summaries.get(id)
    return summary ? [summary] : []
  })
}

/** Non-dated browse: a rule over Property Facts and Location, paginated. */
export async function searchProperties(
  ctx: QueryContext,
  { page, limit, sort, ...rule }: SearchFilter
): Promise<Paginated<PropertySummary>> {
  const [site, tree] = await Promise.all([loadSite(ctx), loadLocationTree(ctx)])
  const where = await ruleWhere(ctx, rule, tree)
  const found = await ctx.client.find<PropertyDoc>("properties", {
    where,
    select: summarySelect,
    populate: summaryPopulate,
    depth: 1,
    page: positive(page, 1),
    limit: Math.min(positive(limit, 12), 100),
    sort: propertySort(sort),
  })
  const summaryContext: SummaryContext = {
    site,
    tree,
    baseURL: ctx.client.baseURL,
  }
  return paginated(found, (doc) => propertySummary(doc, summaryContext))
}
