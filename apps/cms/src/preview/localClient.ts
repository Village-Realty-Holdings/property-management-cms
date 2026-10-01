import type { CollectionSlug, Payload, TypedUser, Where } from "payload"

import type {
  ContentClient,
  ContentQuery,
  PaginatedResponse,
} from "@workspace/content/queries"

import { siteShows } from "../access"

type ID = number | string

/** Vocabularies: Awayday-wide, not Site-scoped (ADR-0013). */
const unscoped = new Set(["amenities", "property-types"])
const draftable = new Set(["pages", "guides", "curated-lists"])

/**
 * The queries' `ContentClient` over the Local API, as the Staff User asking
 * for a Preview (`overrideAccess: false`). It reads what that Site's
 * deployment would: only the Site's own documents, and only what the Site
 * shows (`siteShows`), except the Drafts a query asks for. A Staff User with
 * several Sites never sees another Site's Page at the same path.
 */
export function localContentClient({
  payload,
  user,
  siteId,
  baseURL,
}: {
  payload: Payload
  user: TypedUser
  siteId: ID
  /** Prefix for relative upload URLs; "" keeps them on the CMS's origin. */
  baseURL: string
}): ContentClient {
  function where(collection: string, query: ContentQuery): Where {
    const conditions: Where[] = []
    if (query.where) conditions.push(query.where as Where)
    if (collection === "sites") conditions.push({ id: { equals: siteId } })
    else if (!unscoped.has(collection)) {
      conditions.push({ site: { equals: siteId } })
    }
    const readsDrafts = query.draft === true && draftable.has(collection)
    const shows = readsDrafts ? undefined : siteShows(collection)
    if (shows) conditions.push(shows)
    return { and: conditions }
  }

  return {
    baseURL,
    async find<T>(collection: string, query: ContentQuery = {}) {
      const result = await payload.find({
        collection: collection as CollectionSlug,
        where: where(collection, query),
        select: query.select,
        populate: query.populate,
        depth: query.depth,
        limit: query.limit,
        page: query.page,
        pagination: query.pagination,
        sort: query.sort,
        draft: query.draft,
        overrideAccess: false,
        user,
      } as Parameters<Payload["find"]>[0])
      return result as unknown as PaginatedResponse<T>
    },
    async create() {
      throw new Error("A Preview doesn't store anything")
    },
  }
}
