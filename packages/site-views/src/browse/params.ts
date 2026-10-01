import type { CuratedListSort } from "@workspace/content/queries"

/**
 * The /rentals URL: every filter lives in the query string so a search can
 * be shared, bookmarked and walked back with the browser's Back button.
 * Pure, so the server page and the client filter form agree on it.
 *
 *   location   a Location's slug path, e.g. "park-city/deer-valley"
 *   amenity    an Amenity's Feed ID; repeat for more (all must match)
 *   type       a Property Type's Feed ID; repeat for more (any may match)
 *   minBedrooms, minSleeps   whole numbers
 *   pets       "1": pet-friendly only
 *   sort       featured (default) | rating | sleeps | bedrooms | name
 *   page       1-based; omitted on page 1
 */

export type BrowseParams = {
  location: string | null
  amenities: string[]
  types: string[]
  minBedrooms: number | null
  minSleeps: number | null
  pets: boolean
  sort: CuratedListSort
  page: number
}

export type RawSearchParams = Record<string, string | string[] | undefined>

export const sortOptions: { value: CuratedListSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "rating", label: "Top rated" },
  { value: "sleeps", label: "Most guests" },
  { value: "bedrooms", label: "Most bedrooms" },
  { value: "name", label: "Name (A–Z)" },
]

const sorts = new Set<string>(sortOptions.map((option) => option.value))

/** The largest `minBedrooms` / `minSleeps` the URL accepts. */
export const MAX_COUNT = 50

export const emptyParams: BrowseParams = {
  location: null,
  amenities: [],
  types: [],
  minBedrooms: null,
  minSleeps: null,
  pets: false,
  sort: "featured",
  page: 1,
}

const all = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value])
    .map((v) => v.trim())
    .filter(Boolean)

const first = (value: string | string[] | undefined): string | null =>
  all(value)[0] ?? null

function count(value: string | string[] | undefined): number | null {
  const raw = first(value)
  if (raw === null || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return n >= 1 ? Math.min(n, MAX_COUNT) : null
}

const unique = (values: string[]) => [...new Set(values)]

/** Reads the /rentals query string; malformed values are ignored. */
export function parseBrowseParams(raw: RawSearchParams): BrowseParams {
  const sort = first(raw.sort)
  const page = first(raw.page)
  return {
    location: first(raw.location)?.replace(/^\/+|\/+$/g, "") || null,
    amenities: unique(all(raw.amenity)),
    types: unique(all(raw.type)),
    minBedrooms: count(raw.minBedrooms),
    minSleeps: count(raw.minSleeps),
    pets: first(raw.pets) === "1" || first(raw.pets) === "true",
    sort: sort && sorts.has(sort) ? (sort as CuratedListSort) : "featured",
    page: page && /^\d+$/.test(page) && Number(page) >= 1 ? Number(page) : 1,
  }
}

/** The query string for `params` ("" when nothing is set), in a stable order. */
export function browseQuery(params: BrowseParams): string {
  const search = new URLSearchParams()
  if (params.location) search.set("location", params.location)
  for (const amenity of params.amenities) search.append("amenity", amenity)
  for (const type of params.types) search.append("type", type)
  if (params.minBedrooms) search.set("minBedrooms", String(params.minBedrooms))
  if (params.minSleeps) search.set("minSleeps", String(params.minSleeps))
  if (params.pets) search.set("pets", "1")
  if (params.sort !== "featured") search.set("sort", params.sort)
  if (params.page > 1) search.set("page", String(params.page))
  // Keep Location paths readable ("a/b", not "a%2Fb"); "/" is valid in a query.
  return search.toString().replace(/%2F/gi, "/")
}

export const RENTALS_PATH = "/rentals"

/** The /rentals URL for `params`. */
export function browseHref(params: BrowseParams): string {
  const query = browseQuery(params)
  return query ? `${RENTALS_PATH}?${query}` : RENTALS_PATH
}

/**
 * `params` with `change` applied. Any filter change goes back to page 1, so
 * nobody lands on a page past the end of a smaller result set.
 */
export function withChange(
  params: BrowseParams,
  change: Partial<BrowseParams>
): BrowseParams {
  return { ...params, page: 1, ...change }
}

/** How many filters are set (sort and page don't count). */
export function activeFilterCount(params: BrowseParams): number {
  return (
    (params.location ? 1 : 0) +
    params.amenities.length +
    params.types.length +
    (params.minBedrooms ? 1 : 0) +
    (params.minSleeps ? 1 : 0) +
    (params.pets ? 1 : 0)
  )
}

/** Every filter cleared; the sort is kept. */
export const clearedParams = (params: BrowseParams): BrowseParams => ({
  ...emptyParams,
  sort: params.sort,
})

export const toggle = (values: string[], value: string): string[] =>
  values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value]
