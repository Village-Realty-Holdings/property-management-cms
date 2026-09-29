import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"

/**
 * The Curated List rule pickers offer only Active Amenities and Property
 * Types, but a rule that already uses one keeps saving after the Feed
 * withdraws it.
 */

let t: TestPayload
let payload: Payload
let site: number

async function vocabulary(
  collection: "amenities" | "property-types",
  feedId: string,
  status: "active" | "withdrawn" = "active"
): Promise<number> {
  return (
    await payload.create({
      collection,
      data: { feedId, name: feedId, status },
    })
  ).id
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  site = (
    await payload.create({
      collection: "sites",
      data: { name: "Site", slug: "site", revalidationSecret: "secret" },
    })
  ).id
})

afterAll(() => t?.teardown())

describe("rule vocabulary pickers", () => {
  it("rejects a withdrawn Amenity or Property Type in a new rule", async () => {
    const sauna = await vocabulary("amenities", "sauna", "withdrawn")
    const yurt = await vocabulary("property-types", "yurt", "withdrawn")
    await expect(
      payload.create({
        collection: "curated-lists",
        data: { site, title: "Saunas", rule: { amenities: [sauna] } },
      })
    ).rejects.toThrow(/invalid/i)
    await expect(
      payload.create({
        collection: "curated-lists",
        data: { site, title: "Yurts", rule: { propertyTypes: [yurt] } },
      })
    ).rejects.toThrow(/invalid/i)
  })

  it("keeps saving a rule after the Feed withdraws its Amenity and Property Type", async () => {
    const pool = await vocabulary("amenities", "pool")
    const wifi = await vocabulary("amenities", "wifi")
    const cabin = await vocabulary("property-types", "cabin")
    const list = await payload.create({
      collection: "curated-lists",
      data: {
        site,
        title: "Cabins with a pool",
        rule: { amenities: [pool], propertyTypes: [cabin] },
      },
    })

    await payload.update({
      collection: "amenities",
      id: pool,
      data: { status: "withdrawn" },
    })
    await payload.update({
      collection: "property-types",
      id: cabin,
      data: { status: "withdrawn" },
    })

    const renamed = await payload.update({
      collection: "curated-lists",
      id: list.id,
      data: { title: "Pool cabins" },
    })
    expect(renamed.title).toBe("Pool cabins")

    // Adding an Active Amenity alongside the withdrawn one still saves.
    const widened = await payload.update({
      collection: "curated-lists",
      id: list.id,
      data: { rule: { amenities: [pool, wifi], propertyTypes: [cabin] } },
      depth: 0,
    })
    expect(widened.rule?.amenities).toEqual([pool, wifi])

    // Another list can't newly pick the withdrawn Amenity.
    await expect(
      payload.create({
        collection: "curated-lists",
        data: { site, title: "Pools", rule: { amenities: [pool] } },
      })
    ).rejects.toThrow(/invalid/i)
  })
})
