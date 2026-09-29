import type { Paginated } from "../types"
import type { ContentClient, ContentQuery, PaginatedResponse } from "./client"
import type { LocationDoc, SiteDoc } from "./docs"
import { LocationTree } from "./map"

/**
 * What every query needs: the CMS client (the Site's reader key, or the
 * Staff User asking for a Preview), the Site's slug, and whether to read
 * Drafts.
 */
export type QueryContext = {
  client: ContentClient
  /** The Site's slug. */
  site: string
  /** Preview: read the latest Drafts of Pages, Guides and Curated Lists. */
  draft?: boolean
}

/** Amenity fields the Site's presentation needs, when populated. */
export const amenityPopulate = {
  feedId: true,
  name: true,
  group: true,
  icon: true,
  status: true,
}

export const propertyTypePopulate = { feedId: true, name: true }

const siteSelect = {
  name: true,
  slug: true,
  domain: true,
  branding: true,
  amenityPresentation: true,
  propertyTypeLabels: true,
  stayPolicyDefaults: true,
  legacyUrls: true,
  client: true,
  customVariables: true,
}

/**
 * The deployment's Site document. The reader key can only read its own Site,
 * so a key for another Site finds nothing and this throws.
 */
export async function loadSite(ctx: QueryContext): Promise<SiteDoc> {
  const { docs } = await ctx.client.find<SiteDoc>("sites", {
    where: { slug: { equals: ctx.site } },
    select: siteSelect,
    populate: {
      amenities: amenityPopulate,
      "property-types": propertyTypePopulate,
    },
    depth: 1,
    limit: 1,
  })
  const site = docs[0]
  if (!site || site.slug !== ctx.site) {
    throw new Error(
      `Site "${ctx.site}" not found: check SITE and that CMS_READER_KEY belongs to that Site`
    )
  }
  return site
}

/** Every visible Location of the Site: small, fetched whole. */
export async function loadLocationTree(
  ctx: QueryContext
): Promise<LocationTree> {
  const { docs } = await ctx.client.find<LocationDoc>("locations", {
    where: {
      and: [{ status: { equals: "active" } }, { visible: { equals: true } }],
    },
    select: {
      name: true,
      displayName: true,
      slug: true,
      level: true,
      parent: true,
    },
    depth: 0,
    pagination: false,
  })
  return new LocationTree(docs)
}

/**
 * One document of a drafts-enabled collection (Pages, Guides, Curated
 * Lists): its latest version, Draft or published, when the context reads
 * Drafts (Preview), else its published version.
 */
export async function findOneDraftable<T>(
  ctx: QueryContext,
  collection: string,
  query: ContentQuery
): Promise<T | undefined> {
  const { docs } = await ctx.client.find<T>(collection, {
    ...query,
    limit: 1,
    ...(ctx.draft ? { draft: true } : {}),
  })
  return docs[0]
}

export function paginated<T, U>(
  response: PaginatedResponse<T>,
  map: (doc: T) => U
): Paginated<U> {
  return {
    docs: response.docs.map(map),
    totalDocs: response.totalDocs,
    page: response.page ?? 1,
    totalPages: Math.max(1, response.totalPages),
    limit: response.limit,
    hasNextPage: response.hasNextPage,
    hasPrevPage: response.hasPrevPage,
  }
}

/** A positive whole number, else the default. */
export function positive(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback
}
