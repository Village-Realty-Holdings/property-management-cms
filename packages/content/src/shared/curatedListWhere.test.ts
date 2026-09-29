import { describe, expect, it } from "vitest"

import {
  curatedListPrefilter,
  curatedListRuleFrom,
  curatedListWhere,
  propertiesWithAllAmenities,
} from "./index"

const active = { status: { equals: "active" } }

describe("curatedListWhere", () => {
  it("matches every Active Property for an empty rule", () => {
    expect(curatedListWhere({})).toEqual({ and: [active] })
  })

  it("includes the Location and its descendants", () => {
    expect(
      curatedListWhere(
        { locationId: "1" },
        { descendantLocationIds: ["2", "3", "1"] }
      )
    ).toEqual({ and: [active, { location: { in: ["1", "2", "3"] } }] })
  })

  it("ignores descendants when the rule has no Location", () => {
    expect(curatedListWhere({}, { descendantLocationIds: ["2"] })).toEqual({
      and: [active],
    })
  })

  it("compiles every condition", () => {
    expect(
      curatedListWhere({
        locationId: "1",
        amenityIds: ["7"],
        propertyTypeIds: ["4", "5"],
        minBedrooms: 3,
        minSleeps: 6,
        petsAllowed: true,
      })
    ).toEqual({
      and: [
        active,
        { location: { in: ["1"] } },
        { propertyType: { in: ["4", "5"] } },
        { bedrooms: { greater_than_equal: 3 } },
        { sleeps: { greater_than_equal: 6 } },
        { petsAllowed: { equals: true } },
        { amenities: { in: ["7"] } },
      ],
    })
  })

  it("skips empty lists, zero minimums and petsAllowed false", () => {
    expect(
      curatedListWhere({
        amenityIds: [],
        propertyTypeIds: [],
        minBedrooms: 0,
        minSleeps: 0,
        petsAllowed: false,
      })
    ).toEqual({ and: [active] })
  })

  it("treats a repeated Amenity as one", () => {
    expect(curatedListWhere({ amenityIds: ["7", "7"] })).toEqual({
      and: [active, { amenities: { in: ["7"] } }],
    })
    expect(curatedListPrefilter({ amenityIds: ["7", "7"] })).toBeNull()
  })

  describe("with several Amenities", () => {
    const rule = { locationId: "1", amenityIds: ["7", "8"], minSleeps: 4 }

    it("prefilters on any of them plus the other conditions", () => {
      expect(curatedListPrefilter(rule)).toEqual({
        and: [
          active,
          { location: { in: ["1"] } },
          { sleeps: { greater_than_equal: 4 } },
          { amenities: { in: ["7", "8"] } },
        ],
      })
      expect(curatedListPrefilter({ amenityIds: ["7"] })).toBeNull()
    })

    it("keeps only Properties with all of them", () => {
      expect(
        propertiesWithAllAmenities(
          [
            { id: 1, amenities: [7, 8, 9] },
            { id: 2, amenities: [{ id: 7 }] },
            { id: 3, amenities: [{ id: "8" }, "7"] },
            { id: 4, amenities: null },
          ],
          rule
        )
      ).toEqual(["1", "3"])
    })

    it("matches those Properties by ID", () => {
      expect(
        curatedListWhere(rule, { propertyIdsWithAllAmenities: ["1", "3"] })
      ).toEqual({
        and: [
          active,
          { location: { in: ["1"] } },
          { sleeps: { greater_than_equal: 4 } },
          { id: { in: ["1", "3"] } },
        ],
      })
    })

    it("matches nothing, in a query-string-safe way, when none qualify", () => {
      expect(
        curatedListWhere(rule, { propertyIdsWithAllAmenities: [] }).and
      ).toContainEqual({ id: { exists: false } })
    })

    it("refuses to compile without the resolved Properties", () => {
      expect(() => curatedListWhere(rule)).toThrow(
        /propertyIdsWithAllAmenities/
      )
    })
  })
})

describe("curatedListRuleFrom", () => {
  it("maps the stored rule group, IDs or populated documents", () => {
    expect(
      curatedListRuleFrom({
        location: { id: 1 },
        amenities: [7, { id: 8 }, null],
        propertyTypes: [],
        minBedrooms: null,
        minSleeps: 6,
        petsAllowed: false,
      })
    ).toEqual({ locationId: "1", amenityIds: ["7", "8"], minSleeps: 6 })
  })

  it("returns an empty rule for a missing group", () => {
    expect(curatedListRuleFrom(undefined)).toEqual({})
    expect(curatedListRuleFrom({ petsAllowed: true })).toEqual({
      petsAllowed: true,
    })
  })
})
