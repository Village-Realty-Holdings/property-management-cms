import { existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { fixturesFor } from "."
import { fixtures as avada } from "./avada"
import { fixtures as beachside } from "./beachside"
import type { SiteFixtures } from "./types"
import { fixtures as warrenBeach } from "./warren_beach"

const empty = { rentals: [], posts: [] }

describe("fixturesFor", () => {
  it("is empty for a schema with no fixture module", () => {
    expect(fixturesFor("ms_1_nobody")).toEqual(empty)
  })

  it("is empty when there is no schema", () => {
    expect(fixturesFor(undefined)).toEqual(empty)
    expect(fixturesFor(null)).toEqual(empty)
    expect(fixturesFor("")).toEqual(empty)
  })

  it("is empty for names that only look like a module path", () => {
    for (const schema of [
      "../avada",
      "avada/../x",
      "constructor",
      "__proto__",
    ]) {
      expect(fixturesFor(schema)).toEqual(empty)
    }
  })

  it("returns each Site's own module", () => {
    expect(fixturesFor("warren_beach")).toBe(warrenBeach)
    expect(fixturesFor("avada")).toBe(avada)
    expect(fixturesFor("beachside")).toBe(beachside)
  })

  it("never hands out a shared empty object that a caller could change", () => {
    expect(fixturesFor("unknown")).not.toBe(fixturesFor("unknown"))
  })
})

const publicDir = join(__dirname, "..", "..", "..", "public")

const sites: [string, SiteFixtures][] = [
  ["warren_beach", warrenBeach],
  ["avada", avada],
]

describe.each(sites)("%s fixtures", (schema, site) => {
  const images = [
    ...site.rentals.map((rental) => rental.photo),
    ...site.posts.map((post) => post.image),
  ]

  it("has a photo on disk, under public/fixtures/<schema>/, for every image", () => {
    for (const { src } of images) {
      expect(src.startsWith(`/fixtures/${schema}/`)).toBe(true)
      expect(existsSync(join(publicDir, src)), src).toBe(true)
    }
  })

  it("has real alt text on every image", () => {
    for (const { alt } of images) {
      expect(alt.trim().length).toBeGreaterThan(15)
    }
  })

  it("has unique Rental ids and names, each linking out to its source", () => {
    const ids = site.rentals.map((rental) => rental.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(site.rentals.map((rental) => rental.name)).size).toBe(
      ids.length
    )
    for (const rental of site.rentals) {
      expect(rental.url).toMatch(/^https:\/\//)
      expect(rental.sleeps).toBeGreaterThanOrEqual(rental.bedrooms)
      expect(rental.rating).toBeGreaterThan(0)
    }
  })

  it("has 3 blog posts that link out, newest first", () => {
    expect(site.posts).toHaveLength(3)
    for (const post of site.posts) {
      expect(post.url).toMatch(/^https:\/\//)
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(post.title).not.toBe("")
      expect(post.excerpt).not.toBe("")
    }
    const dates = site.posts.map((post) => post.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })
})

describe("warren_beach fixtures", () => {
  it("has the 12 Rentals of the brand research", () => {
    expect(warrenBeach.rentals.map((rental) => rental.name)).toEqual([
      "Aqua 2107",
      "122 Kelly St",
      "Crescent 217 Destin",
      "Calypso 2308W",
      "214 Toledo Place",
      "Seacrets",
      "Top Shelf",
      "Sea Lover",
      "Family Ties",
      "Bell & Tide",
      "Beach & Boat",
      "Villas at Laguna Beach 8",
    ])
  })

  it("maps the research fields", () => {
    const seacrets = warrenBeach.rentals.find((r) => r.name === "Seacrets")
    expect(seacrets).toMatchObject({
      id: "seacrets",
      type: "House",
      bedrooms: 5,
      baths: 4,
      sleeps: 19,
      reviews: 23,
      petFriendly: false,
      url: "https://warrenbeachrentals.com/property-details/seacrets",
      photo: { src: "/fixtures/warren_beach/rental-seacrets.webp" },
    })
  })
})

describe("avada fixtures", () => {
  it("has the 12 Rentals of the brand research", () => {
    expect(avada.rentals.map((rental) => rental.name)).toEqual([
      "Just Fur Relaxin'",
      "A Family Tradition",
      "The Blessing Cabin",
      "Bearfoot Splash Hideaway",
      "Whispering Pines",
      "Friends in High Places 2",
      "Serenity Awaits",
      "Yeti Lodge",
      "Blue Mist Vista",
      "An Indian Dream",
      "Majestic Overlook",
      "The Ruby 301",
    ])
  })

  it("maps beds to bedrooms and keeps the town, title-cased", () => {
    const tradition = avada.rentals.find((r) => r.name === "A Family Tradition")
    expect(tradition).toMatchObject({
      bedrooms: 8,
      baths: 7,
      sleeps: 16,
      location: "Gatlinburg",
      type: "House",
    })
    expect(new Set(avada.rentals.map((r) => r.location))).toEqual(
      new Set(["Sevierville", "Gatlinburg", "Pigeon Forge"])
    )
  })

  it("is pet friendly where the research says so, by type or feature", () => {
    const pets = avada.rentals.filter((r) => r.petFriendly).map((r) => r.name)
    expect(pets.sort()).toEqual([
      "A Family Tradition",
      "An Indian Dream",
      "Majestic Overlook",
      "The Ruby 301",
    ])
  })
})
