import { describe, expect, it } from "vitest"

import { createFakeFeed } from "./fakeFeed"
import { UnknownFeedAccountError, type FeedListing } from "./feed"
import { demoFeedData } from "./fixtures"
import { mapListing, toTimestamp } from "./mapListing"
import { mapNode, mapPromo, mapReview } from "./mapRecords"
import { hasFields, sameValue } from "./mirror"

const listing = (): FeedListing => {
  const found = demoFeedData().accounts["demo-mountain"]?.listings[0]
  if (!found) throw new Error("fixture missing")
  return found
}

const refs = {
  location: (feedId: string) => ({ N111: 11 })[feedId],
  propertyType: (feedId: string) => ({ cabin: 3 })[feedId],
  amenity: (feedId: string) =>
    ({ "hot-tub": 1, wifi: 2, fireplace: 4 })[feedId],
}

describe("mapListing", () => {
  it("maps a Feed Listing to Property Facts only", () => {
    const { data } = mapListing(listing(), refs)
    expect(data).toMatchObject({
      feedId: "41001",
      feedName: "Bear Hollow Lodge",
      status: "active",
      location: 11,
      propertyType: 3,
      bedrooms: 3,
      bathrooms: 2,
      sleeps: 8,
      petsAllowed: true,
      onlineBookable: true,
      address: { city: "Gatlinburg", region: "TN", country: "US" },
      stayPolicy: { checkIn: "16:00", checkOut: "10:00", minimumAge: 25 },
    })
    expect(data.photos[0]).toEqual({
      url: "https://picsum.photos/seed/41001-1/1600/1067",
      caption: "Exterior",
      width: 1600,
      height: 1067,
    })
    expect(data.rooms.reduce((sum, room) => sum + (room.sleeps ?? 0), 0)).toBe(
      8
    )
    // Never Editorial Content, slugs or computed fields.
    for (const key of ["slug", "headline", "rating", "reviewCount", "site"]) {
      expect(data).not.toHaveProperty(key)
    }
  })

  it("keeps resolved references and reports the rest", () => {
    const { data, unresolved } = mapListing(listing(), refs)
    expect(data.amenities).toEqual([1, 4, 2])
    expect(unresolved).toContain("amenity game-room")
    expect(unresolved).not.toContain("amenity hot-tub")

    const orphan = mapListing(
      { ...listing(), nodeFeedId: "gone", propertyTypeFeedId: null },
      refs
    )
    expect(orphan.data.location).toBeNull()
    expect(orphan.data.propertyType).toBeNull()
    expect(orphan.unresolved).toContain("location gone")
  })

  it("maps inactive listings to Withdrawn and normalises timestamps", () => {
    const { data } = mapListing(
      { ...listing(), status: "inactive", updatedAt: "2026-09-01T12:00Z" },
      refs
    )
    expect(data.status).toBe("withdrawn")
    expect(data.feedUpdatedAt).toBe("2026-09-01T12:00:00.000Z")
    expect(toTimestamp("nonsense")).toBeNull()
    expect(toTimestamp(null)).toBeNull()
  })
})

describe("other mappings", () => {
  it("maps nodes without editorial Location fields", () => {
    const data = mapNode(
      {
        feedId: "N1",
        name: "Gatlinburg",
        type: "city",
        parentFeedId: "N0",
        status: "active",
      },
      7
    )
    expect(data).toEqual({
      feedId: "N1",
      name: "Gatlinburg",
      feedType: "city",
      parent: 7,
      status: "active",
    })
  })

  it("maps promos with eligible Properties and a create-only title", () => {
    const promo = demoFeedData().accounts["demo-mountain"]!.promos[0]!
    const mapped = mapPromo(promo, (feedId) =>
      feedId === "41001" ? 100 : undefined
    )
    expect(mapped.data.properties).toEqual([100])
    expect(mapped.data).not.toHaveProperty("title")
    expect(mapped.createData).toEqual({ title: "Winter Escape" })
    expect(mapped.unresolved).toContain("listing 41002")
    expect(mapped.data.validTo).toBe("2027-03-15T00:00:00.000Z")
  })

  it("maps reviews and sets Moderation on create only", () => {
    const review = demoFeedData().accounts["demo-beach"]!.reviews[0]!
    const mapped = mapReview(review, 5)
    expect(mapped.data).not.toHaveProperty("moderation")
    expect(mapped.createData).toEqual({ moderation: "pending" })
    expect(mapped.data.property).toBe(5)
  })
})

describe("sameValue", () => {
  it("ignores row ids, null vs undefined, and date formats", () => {
    expect(
      sameValue(
        [{ id: "abc", url: "x", caption: null }],
        [{ url: "x", caption: undefined }]
      )
    ).toBe(true)
    expect(sameValue("2026-09-01T12:00:00.000Z", "2026-09-01T12:00:00Z")).toBe(
      true
    )
    expect(sameValue({ id: 3, name: "x" }, 3)).toBe(true)
    expect(sameValue(2.5, "2.5")).toBe(true)
    expect(sameValue([1, 2], [2, 1])).toBe(false)
    expect(sameValue(null, 0)).toBe(false)
  })

  it("compares only the given fields", () => {
    expect(
      hasFields(
        { id: 1, feedId: "a", status: "active", headline: "Edited" },
        { feedId: "a", status: "active" }
      )
    ).toBe(true)
  })
})

describe("demo feed", () => {
  it("has two accounts of 20 listings over a shared vocabulary", async () => {
    const feed = createFakeFeed()
    const vocab = await feed.listVocabularies()
    expect(vocab.amenities.length).toBeGreaterThanOrEqual(25)
    expect(vocab.propertyTypes.map((t) => t.feedId)).toEqual([
      "cabin",
      "condo",
      "house",
      "townhouse",
      "chalet",
      "studio",
    ])
    const known = new Set(vocab.amenities.map((a) => a.feedId))

    for (const account of ["demo-mountain", "demo-beach"]) {
      const listings = await feed.listListings(account)
      const nodes = new Set(
        (await feed.listNodes(account)).map((n) => n.feedId)
      )
      expect(listings).toHaveLength(20)
      for (const l of listings) {
        expect(nodes.has(l.nodeFeedId ?? "")).toBe(true)
        for (const a of l.amenityFeedIds) expect(known.has(a)).toBe(true)
      }
      const inactive = listings.filter((l) => l.status === "inactive")
      expect(inactive.length).toBeGreaterThanOrEqual(1)
      expect(listings.some((l) => l.bathrooms! % 1 === 0.5)).toBe(true)
      expect(listings.filter((l) => !l.onlineBookable)).toHaveLength(2)
      expect(await feed.listPromos(account)).toHaveLength(3)
      expect((await feed.listReviews(account)).length).toBeGreaterThan(40)
    }
  })

  it("is deterministic and isolated from callers", async () => {
    const feed = createFakeFeed()
    const first = await feed.listListings("demo-beach")
    first[0]!.name = "Changed"
    expect(await feed.listListings("demo-beach")).toEqual(
      demoFeedData().accounts["demo-beach"]!.listings
    )
    expect(await feed.getListing("demo-beach", "nope")).toBeNull()
    await expect(feed.listNodes("nope")).rejects.toBeInstanceOf(
      UnknownFeedAccountError
    )
  })
})
