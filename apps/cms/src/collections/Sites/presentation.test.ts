import { describe, expect, it } from "vitest"

import {
  type AmenityInput,
  propertyTypeLabel,
  resolveAmenityPresentation,
} from "./presentation"

const amenity = (
  id: number,
  name: string,
  extra: Partial<AmenityInput> = {}
): AmenityInput => ({
  id,
  feedId: `feed-${id}`,
  name,
  group: "Outdoors",
  icon: `icon-${id}`,
  status: "active",
  ...extra,
})

const hotTub = amenity(1, "Hot tub")
const pool = amenity(2, "Pool")
const wifi = amenity(3, "Wi-Fi", { group: "Essentials" })
const sauna = amenity(4, "Sauna", { status: "withdrawn" })
const bbq = amenity(5, "BBQ")
const vocabulary = [hotTub, pool, wifi, sauna, bbq]

describe("resolveAmenityPresentation", () => {
  it("lists every active Amenity by name when the Site has no presentation", () => {
    const views = resolveAmenityPresentation({}, vocabulary)
    expect(views.map((v) => v.label)).toEqual([
      "BBQ",
      "Hot tub",
      "Pool",
      "Wi-Fi",
    ])
    expect(views.every((v) => !v.filter)).toBe(true)
    expect(views.find((v) => v.id === 3)).toEqual({
      id: 3,
      feedId: "feed-3",
      label: "Wi-Fi",
      icon: "icon-3",
      group: "Essentials",
      filter: false,
    })
  })

  it("puts the Site's filters first, in its order, with its overrides", () => {
    const views = resolveAmenityPresentation(
      {
        amenityPresentation: {
          filters: [
            { amenity: 2, label: "Swimming pool", icon: " ", group: "Fun" },
            // Populated (depth > 0).
            {
              amenity: {
                ...hotTub,
                id: 1,
                status: "active",
                updatedAt: "",
                createdAt: "",
              },
            },
          ],
        },
      },
      vocabulary
    )
    expect(views.map((v) => [v.label, v.filter])).toEqual([
      ["Swimming pool", true],
      ["Hot tub", true],
      ["BBQ", false],
      ["Wi-Fi", false],
    ])
    // A blank override falls back to the Feed's value.
    expect(views[0]).toMatchObject({ icon: "icon-2", group: "Fun" })
    expect(views[1]).toMatchObject({ icon: "icon-1", group: "Outdoors" })
  })

  it("drops hidden and withdrawn Amenities, even when they are filters", () => {
    const views = resolveAmenityPresentation(
      {
        amenityPresentation: {
          filters: [{ amenity: 4 }, { amenity: 5 }, { amenity: 1 }],
          hidden: [5, 3],
        },
      },
      vocabulary
    )
    expect(views.map((v) => v.id)).toEqual([1, 2])
    expect(views.map((v) => v.filter)).toEqual([true, false])
  })

  it("only presents the Amenities it is given (e.g. a Property's)", () => {
    const views = resolveAmenityPresentation(
      { amenityPresentation: { filters: [{ amenity: 2 }, { amenity: 1 }] } },
      [hotTub, wifi]
    )
    expect(views.map((v) => v.id)).toEqual([1, 3])
  })

  it("ignores a repeated filter row", () => {
    const views = resolveAmenityPresentation(
      {
        amenityPresentation: {
          filters: [
            { amenity: 1, label: "First" },
            { amenity: 1, label: "Second" },
          ],
        },
      },
      [hotTub]
    )
    expect(views).toHaveLength(1)
    expect(views[0]?.label).toBe("First")
  })
})

describe("propertyTypeLabel", () => {
  const cabin = { id: 7, name: "Cabin" }

  it("uses the Site's label, else the Feed's name", () => {
    const site = {
      propertyTypeLabels: { labels: [{ propertyType: 7, label: "Log cabin" }] },
    }
    expect(propertyTypeLabel(site, cabin)).toBe("Log cabin")
    expect(propertyTypeLabel(site, { id: 8, name: "Condo" })).toBe("Condo")
    expect(propertyTypeLabel({}, cabin)).toBe("Cabin")
  })
})
