import type { Rental } from "../../fixtures/types"

/** How many Rentals a page shows when the Block's page size is unusable. */
export const defaultPageSize = 6

/** The bedroom chips on offer: "2+", "3+", "4+" and "5+". */
const bedroomSteps = [2, 3, 4, 5] as const

export type SortKey = "name" | "sleeps" | "rating"

/** What the grid's chips can narrow the Rentals to. All must hold at once. */
export type GridFilters = {
  /** At least this many bedrooms; null for any. */
  minBedrooms: number | null
  /** Only Rentals that welcome pets. */
  petFriendly: boolean
  /** Rentals in any one of these towns; none chosen means any. */
  locations: readonly string[]
}

export const noFilters: GridFilters = {
  minBedrooms: null,
  petFriendly: false,
  locations: [],
}

/** What a visitor has chosen: the filters, a sort and a page. */
export type GridState = GridFilters & { sort: SortKey; page: number }

export type Page<T> = {
  items: T[]
  /** The page shown, 1-based, after clamping into range. */
  page: number
  pageCount: number
  /** How many items there are across all pages. */
  total: number
  /** The 1-based position of the first and last item shown; 0 when none. */
  first: number
  last: number
}

/** A town compared without case, edge or doubled spaces. */
const townKey = (location: string) =>
  location.replace(/\s+/g, " ").trim().toLowerCase()

/** The Rentals that pass every filter, in their given order. */
export function filterRentals(
  rentals: readonly Rental[],
  filters: GridFilters
): Rental[] {
  const towns = new Set(filters.locations.map(townKey))
  return rentals.filter(
    (rental) =>
      (filters.minBedrooms === null ||
        rental.bedrooms >= filters.minBedrooms) &&
      (!filters.petFriendly || rental.petFriendly) &&
      (towns.size === 0 || towns.has(townKey(rental.location)))
  )
}

const byName = (a: Rental, b: Rental) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true })

/**
 * A sorted copy: by name (A to Z), by how many it sleeps (most first) or by
 * rating (best first, Rentals with no reviews last). Ties fall to the name.
 */
export function sortRentals(
  rentals: readonly Rental[],
  key: SortKey
): Rental[] {
  const compare: (a: Rental, b: Rental) => number =
    key === "sleeps"
      ? (a, b) => b.sleeps - a.sleeps
      : key === "rating"
        ? (a, b) =>
            Number(b.reviews > 0) - Number(a.reviews > 0) ||
            b.rating - a.rating ||
            b.reviews - a.reviews
        : () => 0
  return [...rentals].sort((a, b) => compare(a, b) || byName(a, b))
}

/** One page of `items`; a page out of range is clamped to the nearest one. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number | null | undefined
): Page<T> {
  const size =
    typeof pageSize === "number" && Number.isFinite(pageSize) && pageSize >= 1
      ? Math.floor(pageSize)
      : defaultPageSize
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const wanted = Number.isFinite(page) ? Math.floor(page) : 1
  const current = Math.min(Math.max(wanted, 1), pageCount)
  const start = (current - 1) * size
  const shown = items.slice(start, start + size)
  return {
    items: shown,
    page: current,
    pageCount,
    total: items.length,
    first: shown.length === 0 ? 0 : start + 1,
    last: start + shown.length,
  }
}

/** The bedroom chips worth showing: each step some Rental reaches. */
export function bedroomOptions(rentals: readonly Rental[]): number[] {
  const most = Math.max(0, ...rentals.map((rental) => rental.bedrooms))
  return bedroomSteps.filter((step) => step <= most)
}

/** One chip per town (spelled as first met), alphabetical; blanks skipped. */
export function locationOptions(rentals: readonly Rental[]): string[] {
  const towns = new Map<string, string>()
  for (const { location } of rentals) {
    const key = townKey(location)
    if (key && !towns.has(key)) towns.set(key, location.trim())
  }
  return [...towns.values()].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  )
}

/** The page of Rentals a state shows: filter, then sort, then paginate. */
export function browse(
  rentals: readonly Rental[],
  state: GridState,
  pageSize: number | null | undefined
): Page<Rental> {
  return paginate(
    sortRentals(filterRentals(rentals, state), state.sort),
    state.page,
    pageSize
  )
}
