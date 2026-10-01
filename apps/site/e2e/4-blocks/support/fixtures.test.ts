import { describe, expect, it } from "vitest"

import {
  AVADA_RENTALS,
  WARREN_BEACH_RENTALS,
  bedsOnCard,
  isSorted,
  matching,
  rentalNamed,
  sleepingAtLeast,
  sleepsOnCard,
} from "./fixtures"

describe("the expected Rental selections", () => {
  it("keeps every Rental that sleeps at least the minimum", () => {
    expect(sleepingAtLeast(WARREN_BEACH_RENTALS, 16)).toEqual([
      "122 Kelly St",
      "Beach & Boat",
      "Sea Lover",
      "Seacrets",
      "Top Shelf",
    ])
    expect(sleepingAtLeast(AVADA_RENTALS, 99)).toEqual([])
  })

  it("filters by pets, location and bedrooms together", () => {
    expect(matching(AVADA_RENTALS, { pets: true })).toEqual([
      "A Family Tradition",
      "An Indian Dream",
      "Majestic Overlook",
      "The Ruby 301",
    ])
    expect(matching(AVADA_RENTALS, { location: "gatlinburg" })).toEqual([
      "A Family Tradition",
      "Blue Mist Vista",
      "Yeti Lodge",
    ])
    expect(
      matching(AVADA_RENTALS, { pets: true, location: "Sevierville" })
    ).toEqual(["An Indian Dream", "Majestic Overlook"])
    expect(matching(AVADA_RENTALS, { beds: 4 })).toEqual([
      "Majestic Overlook",
      "Serenity Awaits",
      "Whispering Pines",
    ])
    expect(matching(AVADA_RENTALS, { minBeds: 4 })).toHaveLength(4)
  })

  it("finds a Rental by name whatever the quotes and case", () => {
    expect(rentalNamed(AVADA_RENTALS, "just fur relaxin’")?.sleeps).toBe(4)
    expect(rentalNamed(AVADA_RENTALS, "Nowhere")).toBeUndefined()
  })
})

describe("reading a Rental card", () => {
  it("reads how many it sleeps", () => {
    expect(sleepsOnCard("Cabin · Sleeps 12 · 4 bedrooms")).toBe(12)
    expect(sleepsOnCard("Sleeps: 9")).toBe(9)
    expect(sleepsOnCard("16 guests")).toBe(16)
    expect(sleepsOnCard("A lovely cabin")).toBeNull()
  })

  it("reads its bedrooms", () => {
    expect(bedsOnCard("Sleeps 12 · 4 bedrooms")).toBe(4)
    expect(bedsOnCard("3 BR · 2 BA")).toBe(3)
    expect(bedsOnCard("1 bed")).toBe(1)
    expect(bedsOnCard("Sleeps 6")).toBeNull()
  })
})

describe("isSorted", () => {
  it("accepts either direction but not a flat or shuffled run", () => {
    expect(isSorted([4, 6, 6, 12])).toBe(true)
    expect(isSorted([16, 12, 9, 4])).toBe(true)
    expect(isSorted([4, 12, 6])).toBe(false)
    expect(isSorted([6, 6, 6])).toBe(false)
    expect(isSorted([6])).toBe(false)
  })
})
