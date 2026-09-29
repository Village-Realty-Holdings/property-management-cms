import type {
  Amenity,
  ContentAdapter,
  CuratedListRule,
  CuratedListSort,
  LocationRef,
  PropertySummary,
  SearchFilter,
} from "@workspace/content/queries"

import {
  browseHref,
  emptyParams,
  type BrowseParams,
  withChange,
} from "./params"

/**
 * What the /rentals filters offer, from the Site's content: its Locations
 * that hold Active Properties (and their parents), its filter Amenities and
 * its Property Types, each keyed by the value the URL carries.
 */

export type LocationOption = {
  id: string
  /** The URL value: the slug path, e.g. "park-city/deer-valley". */
  key: string
  name: string
  /** 0 for a top-level Location. */
  depth: number
}

export type FilterOption = {
  id: string
  /** The URL value: the Feed ID. */
  key: string
  name: string
  icon: string | null
}

export type BrowseOptions = {
  locations: LocationOption[]
  /** The Site's chosen search filter Amenities, in its order. */
  amenityFilters: FilterOption[]
  /** The Site's other Amenities, offered behind "More amenities". */
  moreAmenities: FilterOption[]
  propertyTypes: FilterOption[]
}

const PAGE_SIZE = 100
/** A ceiling on pages read to find Locations (10,000 Properties). */
const MAX_PAGES = 100

async function allActiveProperties(
  content: ContentAdapter
): Promise<PropertySummary[]> {
  const first = await content.searchProperties({
    limit: PAGE_SIZE,
    sort: "name",
  })
  const pages = Math.min(first.totalPages, MAX_PAGES)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      content.searchProperties({ limit: PAGE_SIZE, sort: "name", page: i + 2 })
    )
  )
  return [first, ...rest].flatMap((result) => result.docs)
}

const keyOf = (location: Pick<LocationRef, "path">) => location.path.join("/")

/**
 * Locations holding Active Properties plus their ancestors, in tree order
 * (parents before children, siblings by name). Content has no Location list,
 * so they come from the Properties and `getLocation` (both cached).
 */
async function locationOptions(
  content: ContentAdapter
): Promise<LocationOption[]> {
  const properties = await allActiveProperties(content)
  const direct = new Map<string, LocationRef>()
  for (const { location } of properties) {
    if (location && location.path.length > 0)
      direct.set(keyOf(location), location)
  }
  const pages = await Promise.all(
    [...direct.values()].map((location) => content.getLocation(location.path))
  )
  const byKey = new Map<string, LocationRef>(direct)
  for (const page of pages) {
    if (!page) continue
    byKey.set(keyOf(page), page)
    for (const ancestor of page.ancestors) byKey.set(keyOf(ancestor), ancestor)
  }

  // Sort by the chain of names from the root, so children follow parents.
  const names = (location: LocationRef): string[] =>
    location.path.map(
      (_, i) => byKey.get(location.path.slice(0, i + 1).join("/"))?.name ?? ""
    )
  const compare = (a: string[], b: string[]): number => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const order = a[i]!.localeCompare(b[i]!)
      if (order !== 0) return order
    }
    return a.length - b.length
  }
  return [...byKey.values()]
    .sort((a, b) => compare(names(a), names(b)))
    .map((location) => ({
      id: location.id,
      key: keyOf(location),
      name: location.name,
      depth: location.path.length - 1,
    }))
}

const amenityOption = (amenity: Amenity): FilterOption => ({
  id: amenity.id,
  key: amenity.feedId,
  name: amenity.name,
  icon: amenity.icon,
})

export async function loadBrowseOptions(
  content: ContentAdapter
): Promise<BrowseOptions> {
  const [settings, locations] = await Promise.all([
    content.getSiteSettings(),
    locationOptions(content),
  ])
  const filterIds = new Set(settings.amenityFilters.map((a) => a.id))
  return {
    locations,
    amenityFilters: settings.amenityFilters.map(amenityOption),
    moreAmenities: settings.amenities
      .filter((amenity) => !filterIds.has(amenity.id))
      .map(amenityOption),
    propertyTypes: settings.propertyTypes.map((type) => ({
      id: type.id,
      key: type.feedId,
      name: type.name,
      icon: null,
    })),
  }
}

/** One set filter, as the summary shows it, with the URL that removes it. */
export type ActiveFilter = {
  id: string
  label: string
  removeHref: string
  /** The URL value matches nothing on this Site. */
  unknown: boolean
}

export type ResolvedSearch = {
  filter: SearchFilter
  active: ActiveFilter[]
  /** Some URL value matches nothing, so nothing can match. */
  hasUnknown: boolean
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/**
 * Turns the URL's keys into a `SearchFilter` of CMS IDs, and lists what is
 * set so each filter can be removed on its own. A value that matches nothing
 * (an old link, a removed Amenity) is kept and shown, never dropped.
 */
export function resolveSearch(
  params: BrowseParams,
  options: BrowseOptions,
  limit: number
): ResolvedSearch {
  const active: ActiveFilter[] = []
  const remove = (change: Partial<BrowseParams>) =>
    browseHref(withChange(params, change))
  let hasUnknown = false

  let locationId: string | undefined
  if (params.location) {
    const match = options.locations.find((l) => l.key === params.location)
    locationId = match?.id
    if (!match) hasUnknown = true
    active.push({
      id: `location:${params.location}`,
      label: match ? `In ${match.name}` : `Unknown place “${params.location}”`,
      removeHref: remove({ location: null }),
      unknown: !match,
    })
  }

  const amenities = [...options.amenityFilters, ...options.moreAmenities]
  const amenityIds: string[] = []
  for (const key of params.amenities) {
    const match = amenities.find((a) => a.key === key)
    if (match) amenityIds.push(match.id)
    else hasUnknown = true
    active.push({
      id: `amenity:${key}`,
      label: match ? match.name : `Unknown amenity “${key}”`,
      removeHref: remove({
        amenities: params.amenities.filter((a) => a !== key),
      }),
      unknown: !match,
    })
  }

  const propertyTypeIds: string[] = []
  for (const key of params.types) {
    const match = options.propertyTypes.find((t) => t.key === key)
    if (match) propertyTypeIds.push(match.id)
    else hasUnknown = true
    active.push({
      id: `type:${key}`,
      label: match ? match.name : `Unknown type “${key}”`,
      removeHref: remove({ types: params.types.filter((t) => t !== key) }),
      unknown: !match,
    })
  }

  if (params.minBedrooms) {
    active.push({
      id: "minBedrooms",
      label: `${plural(params.minBedrooms, "bedroom", "bedrooms")} or more`,
      removeHref: remove({ minBedrooms: null }),
      unknown: false,
    })
  }
  if (params.minSleeps) {
    active.push({
      id: "minSleeps",
      label: `Sleeps ${params.minSleeps} or more`,
      removeHref: remove({ minSleeps: null }),
      unknown: false,
    })
  }
  if (params.pets) {
    active.push({
      id: "pets",
      label: "Pet friendly",
      removeHref: remove({ pets: false }),
      unknown: false,
    })
  }

  const filter: SearchFilter = {
    page: params.page,
    limit,
    sort: params.sort,
    ...(locationId && { locationId }),
    ...(amenityIds.length > 0 && { amenityIds }),
    ...(propertyTypeIds.length > 0 && { propertyTypeIds }),
    ...(params.minBedrooms && { minBedrooms: params.minBedrooms }),
    ...(params.minSleeps && { minSleeps: params.minSleeps }),
    ...(params.pets && { petsAllowed: true }),
  }
  return { filter, active, hasUnknown }
}

/**
 * The /rentals URL for a Curated List's rule, so a guest can refine the
 * list with the filters. Null when the rule uses something the filters
 * can't express (e.g. a Location without Active Properties).
 */
export function ruleHref(
  rule: CuratedListRule,
  options: BrowseOptions,
  sort: CuratedListSort = "featured"
): string | null {
  const amenities = [...options.amenityFilters, ...options.moreAmenities]
  const keyFor = (list: FilterOption[] | LocationOption[], id: string) =>
    list.find((option) => option.id === id)?.key
  const location = rule.locationId
    ? keyFor(options.locations, rule.locationId)
    : null
  const amenityKeys = (rule.amenityIds ?? []).map((id) => keyFor(amenities, id))
  const typeKeys = (rule.propertyTypeIds ?? []).map((id) =>
    keyFor(options.propertyTypes, id)
  )
  if (
    location === undefined ||
    amenityKeys.includes(undefined) ||
    typeKeys.includes(undefined)
  ) {
    return null
  }
  return browseHref({
    ...emptyParams,
    location,
    amenities: amenityKeys as string[],
    types: typeKeys as string[],
    minBedrooms: rule.minBedrooms ?? null,
    minSleeps: rule.minSleeps ?? null,
    pets: rule.petsAllowed === true,
    sort,
  })
}
