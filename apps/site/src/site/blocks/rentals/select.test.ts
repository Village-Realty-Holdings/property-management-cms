import { describe, expect, it } from "vitest"

import type { Rental } from "../../fixtures/types"
import { featured, largeGroup } from "./select"

const rental = (id: string, sleeps: number): Rental => ({
  id,
  name: id,
  type: "Cabin",
  location: "Sevierville",
  bedrooms: 2,
  baths: 1,
  sleeps,
  petFriendly: false,
  rating: 5,
  reviews: 1,
  features: [],
  photo: { src: "/x.webp", alt: "x" },
  url: "https://example.com",
})

const rentals = [
  rental("a", 4),
  rental("b", 16),
  rental("c", 12),
  rental("d", 9),
  rental("e", 20),
]

const ids = (list: Rental[]) => list.map((r) => r.id)

describe("featured", () => {
  it("is the first `count` Rentals, in fixture order", () => {
    expect(ids(featured(rentals, 3))).toEqual(["a", "b", "c"])
  })

  it("is every Rental when the count is larger than the fixtures", () => {
    expect(ids(featured(rentals, 12))).toEqual(["a", "b", "c", "d", "e"])
  })

  it("is empty for no Rentals, and for a count of zero or less", () => {
    expect(featured([], 3)).toEqual([])
    expect(featured(rentals, 0)).toEqual([])
    expect(featured(rentals, -2)).toEqual([])
  })

  it("rounds a fractional count down", () => {
    expect(ids(featured(rentals, 2.9))).toEqual(["a", "b"])
  })

  it("falls back to three when the count is missing or not a number", () => {
    expect(ids(featured(rentals, undefined))).toEqual(["a", "b", "c"])
    expect(ids(featured(rentals, null))).toEqual(["a", "b", "c"])
    expect(ids(featured(rentals, Number.NaN))).toEqual(["a", "b", "c"])
  })

  it("does not change its input", () => {
    const copy = [...rentals]
    featured(rentals, 2)
    expect(rentals).toEqual(copy)
  })
})

describe("largeGroup", () => {
  it("is every Rental that sleeps at least the minimum, in fixture order", () => {
    expect(ids(largeGroup(rentals, 12))).toEqual(["b", "c", "e"])
  })

  it("includes a Rental that sleeps exactly the minimum", () => {
    expect(ids(largeGroup(rentals, 16))).toEqual(["b", "e"])
  })

  it("is empty when none is that large", () => {
    expect(largeGroup(rentals, 99)).toEqual([])
    expect(largeGroup([], 1)).toEqual([])
  })

  it("is every Rental when the minimum is zero or less", () => {
    expect(largeGroup(rentals, 0)).toHaveLength(5)
    expect(largeGroup(rentals, -1)).toHaveLength(5)
  })

  it("shows none when the minimum is missing or not a number", () => {
    expect(largeGroup(rentals, undefined)).toEqual([])
    expect(largeGroup(rentals, null)).toEqual([])
    expect(largeGroup(rentals, Number.NaN)).toEqual([])
  })
})
