import { describe, expect, it } from "vitest"

import type { Rental } from "../../fixtures/types"
import {
  bedroomOptions,
  browse,
  filterRentals,
  locationOptions,
  noFilters,
  paginate,
  sortRentals,
} from "./grid"

let serial = 0
function rental(overrides: Partial<Rental> = {}): Rental {
  serial += 1
  return {
    id: `r${serial}`,
    name: `Rental ${serial}`,
    type: "Cabin",
    location: "Gatlinburg",
    bedrooms: 2,
    baths: 1,
    sleeps: 4,
    petFriendly: false,
    rating: 4,
    reviews: 10,
    features: [],
    photo: { src: "/x.webp", alt: "x" },
    url: "https://example.com",
    ...overrides,
  }
}

const cabins = [
  rental({
    id: "a",
    name: "Alpine",
    bedrooms: 1,
    sleeps: 2,
    location: "Gatlinburg",
    petFriendly: true,
    rating: 4.2,
  }),
  rental({
    id: "b",
    name: "Bluff",
    bedrooms: 3,
    sleeps: 8,
    location: "Sevierville",
    petFriendly: false,
    rating: 4.9,
  }),
  rental({
    id: "c",
    name: "Cedar",
    bedrooms: 4,
    sleeps: 10,
    location: "Sevierville",
    petFriendly: true,
    rating: 3.8,
  }),
  rental({
    id: "d",
    name: "Dogwood",
    bedrooms: 4,
    sleeps: 12,
    location: "Pigeon Forge",
    petFriendly: true,
    rating: 4.9,
    reviews: 50,
  }),
]

const ids = (rentals: readonly Rental[]) => rentals.map((r) => r.id)

describe("filterRentals", () => {
  it("keeps everything with no filters, in order", () => {
    expect(ids(filterRentals(cabins, noFilters))).toEqual(["a", "b", "c", "d"])
  })

  it("does not change the list it is given", () => {
    const copy = [...cabins]
    filterRentals(cabins, { ...noFilters, petFriendly: true })
    expect(cabins).toEqual(copy)
  })

  it("keeps Rentals with at least the bedrooms asked for", () => {
    expect(
      ids(filterRentals(cabins, { ...noFilters, minBedrooms: 3 }))
    ).toEqual(["b", "c", "d"])
    expect(
      ids(filterRentals(cabins, { ...noFilters, minBedrooms: 5 }))
    ).toEqual([])
  })

  it("keeps only pet friendly Rentals when pets are asked for", () => {
    expect(
      ids(filterRentals(cabins, { ...noFilters, petFriendly: true }))
    ).toEqual(["a", "c", "d"])
  })

  it("keeps Rentals in any of the chosen locations", () => {
    expect(
      ids(filterRentals(cabins, { ...noFilters, locations: ["Sevierville"] }))
    ).toEqual(["b", "c"])
    expect(
      ids(
        filterRentals(cabins, {
          ...noFilters,
          locations: ["Sevierville", "Pigeon Forge"],
        })
      )
    ).toEqual(["b", "c", "d"])
  })

  it("matches a location without regard to case or spacing", () => {
    expect(
      ids(
        filterRentals(cabins, {
          ...noFilters,
          locations: ["  pigeon   FORGE "],
        })
      )
    ).toEqual(["d"])
  })

  it("never matches a Rental with no location to a chosen location", () => {
    const blank = rental({ id: "e", location: "  " })
    expect(
      ids(filterRentals([blank], { ...noFilters, locations: ["Gatlinburg"] }))
    ).toEqual([])
    expect(ids(filterRentals([blank], noFilters))).toEqual(["e"])
  })

  it("combines filters: a Rental must pass all of them", () => {
    expect(
      ids(
        filterRentals(cabins, {
          minBedrooms: 4,
          petFriendly: true,
          locations: ["Sevierville"],
        })
      )
    ).toEqual(["c"])
    expect(
      ids(
        filterRentals(cabins, {
          minBedrooms: 4,
          petFriendly: false,
          locations: ["Gatlinburg"],
        })
      )
    ).toEqual([])
  })
})

describe("sortRentals", () => {
  it("sorts by name, A to Z, ignoring case and counting digits as numbers", () => {
    const named = [
      rental({ id: "1", name: "unit 10" }),
      rental({ id: "2", name: "Unit 2" }),
      rental({ id: "3", name: "Aqua" }),
    ]
    expect(ids(sortRentals(named, "name"))).toEqual(["3", "2", "1"])
  })

  it("sorts by sleeps, most first, then by name", () => {
    const sleepy = [
      rental({ id: "1", name: "B", sleeps: 6 }),
      rental({ id: "2", name: "A", sleeps: 6 }),
      rental({ id: "3", name: "C", sleeps: 12 }),
    ]
    expect(ids(sortRentals(sleepy, "sleeps"))).toEqual(["3", "2", "1"])
  })

  it("sorts by rating, best first, then by reviews, then by name", () => {
    expect(ids(sortRentals(cabins, "rating"))).toEqual(["d", "b", "a", "c"])
  })

  it("puts Rentals with no reviews last when sorting by rating", () => {
    const fresh = rental({ id: "n", name: "New", rating: 5, reviews: 0 })
    expect(ids(sortRentals([fresh, ...cabins], "rating")).at(-1)).toBe("n")
  })

  it("returns a new list and leaves the given one alone", () => {
    const copy = [...cabins]
    const sorted = sortRentals(cabins, "sleeps")
    expect(sorted).not.toBe(cabins)
    expect(cabins).toEqual(copy)
  })
})

describe("paginate", () => {
  const items = Array.from({ length: 13 }, (_, i) => i + 1)

  it("gives the first page", () => {
    expect(paginate(items, 1, 6)).toEqual({
      items: [1, 2, 3, 4, 5, 6],
      page: 1,
      pageCount: 3,
      total: 13,
      first: 1,
      last: 6,
    })
  })

  it("gives a short last page", () => {
    expect(paginate(items, 3, 6)).toMatchObject({
      items: [13],
      page: 3,
      first: 13,
      last: 13,
    })
  })

  it("has no extra page when the items fill the last one exactly", () => {
    expect(paginate(items.slice(0, 12), 2, 6)).toMatchObject({
      pageCount: 2,
      items: [7, 8, 9, 10, 11, 12],
    })
  })

  it("clamps a page that is too low, too high or not a number", () => {
    expect(paginate(items, 0, 6).page).toBe(1)
    expect(paginate(items, -4, 6).page).toBe(1)
    expect(paginate(items, 99, 6).page).toBe(3)
    expect(paginate(items, Number.NaN, 6).page).toBe(1)
  })

  it("is one empty page for no items", () => {
    expect(paginate([], 1, 6)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      first: 0,
      last: 0,
    })
  })

  it("falls back to six a page for a page size that cannot be used", () => {
    expect(paginate(items, 1, 0).items).toHaveLength(6)
    expect(paginate(items, 1, null).items).toHaveLength(6)
    expect(paginate(items, 1, Number.NaN).items).toHaveLength(6)
    expect(paginate(items, 1, 4.9).items).toHaveLength(4)
  })
})

describe("options", () => {
  it("offers a location chip per town, once, in alphabetical order", () => {
    const rentals = [
      rental({ location: "Sevierville" }),
      rental({ location: "gatlinburg" }),
      rental({ location: " Gatlinburg " }),
      rental({ location: "" }),
    ]
    expect(locationOptions(rentals)).toEqual(["gatlinburg", "Sevierville"])
  })

  it("offers no location chips when no Rental has a location", () => {
    expect(locationOptions([rental({ location: "" })])).toEqual([])
    expect(locationOptions([])).toEqual([])
  })

  it("offers bedroom chips only up to what some Rental has", () => {
    expect(bedroomOptions(cabins)).toEqual([2, 3, 4])
    expect(bedroomOptions([rental({ bedrooms: 8 })])).toEqual([2, 3, 4, 5])
    expect(bedroomOptions([rental({ bedrooms: 1 })])).toEqual([])
    expect(bedroomOptions([])).toEqual([])
  })
})

describe("browse", () => {
  it("filters, sorts, then pages, and counts what the filters kept", () => {
    const view = browse(
      cabins,
      { ...noFilters, petFriendly: true, sort: "sleeps", page: 2 },
      2
    )
    expect(ids(view.items)).toEqual(["a"])
    expect(view).toMatchObject({
      total: 3,
      page: 2,
      pageCount: 2,
      first: 3,
      last: 3,
    })
  })

  it("reports no matches as an empty, single page", () => {
    const view = browse(
      cabins,
      { ...noFilters, minBedrooms: 9, sort: "name", page: 1 },
      6
    )
    expect(view).toMatchObject({ items: [], total: 0, pageCount: 1 })
  })
})
