/**
 * The single cache-tag vocabulary (ADR-0009). apps/site tags cached reads with
 * these; apps/cms sends the same tags to the owning Site's deployment, whose
 * `/api/revalidate` route revalidates them. Pure and deterministic: the same
 * input always gives the same tag.
 *
 * Tags are per Site deployment, so they never carry the Site.
 */

declare const cacheTagBrand: unique symbol

/**
 * A cache tag string. Branded so tags come from `cacheTags` (or, for input
 * from the wire, `isCacheTag`), never from hand-written strings.
 */
export type CacheTag = string & { readonly [cacheTagBrand]: true }

const tag = (value: string) => value as CacheTag

export const cacheTags = {
  property: (slug: string): CacheTag => tag(`property:${slug}`),
  properties: tag("properties"),
  location: (id: string | number): CacheTag => tag(`location:${id}`),
  locations: tag("locations"),
  curatedList: (slug: string): CacheTag => tag(`curated-list:${slug}`),
  curatedLists: tag("curated-lists"),
  /** `path` is a Page path as stored in the CMS ("/", "/about"); see `toPagePath`. */
  page: (path: string): CacheTag => tag(`page:${path}`),
  pages: tag("pages"),
  guide: (slug: string): CacheTag => tag(`guide:${slug}`),
  guides: tag("guides"),
  specials: tag("specials"),
  siteSettings: tag("site-settings"),
} as const

/** Next.js ignores longer tags (`cacheTag`, `revalidateTag`). */
const MAX_TAG_LENGTH = 256

/**
 * Whether `value` is a well-formed tag: a non-empty string without
 * whitespace, at most 256 characters. For the site's revalidate route, which
 * receives tags as JSON.
 */
export function isCacheTag(value: unknown): value is CacheTag {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_TAG_LENGTH &&
    !/\s/.test(value)
  )
}

/** De-duplicates tags, keeping first-seen order. */
export function uniqueTags(tags: Iterable<CacheTag>): CacheTag[] {
  return [...new Set(tags)]
}
