import type { CollectionSlug, Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { seed, type SeedResult } from "./index"

/**
 * The demo seed against a fresh database, twice: the second run must change
 * no counts, keep every secret, and leave each Site's content visible only
 * to its own SiteReader, published.
 */

let t: TestPayload
let payload: Payload
let first: SeedResult
let second: SeedResult

const counted: CollectionSlug[] = [
  "sites",
  "site-readers",
  "users",
  "pages",
  "curated-lists",
  "guides",
]

async function counts() {
  const result: Record<string, number> = {}
  for (const collection of counted) {
    result[collection] = (await payload.count({ collection })).totalDocs
  }
  return result
}

/**
 * Stands in for the Sync (the seed runs without it here): Amenities, and per
 * Site a three-level Location tree, a Property and a Special. Needs the
 * Sites, so it runs after a first seed.
 */
async function createFeedData() {
  for (const [feedId, name] of [
    ["hot-tub", "Hot tub"],
    ["pool", "Private pool"],
    ["beachfront", "Beachfront"],
  ]) {
    await payload.create({
      collection: "amenities",
      data: { feedId: feedId!, name: name! },
    })
  }
  const { docs: sites } = await payload.find({ collection: "sites" })
  for (const site of sites) {
    let parent: number | null = null
    for (const name of ["resort town", "old town", "the lodge"]) {
      const location: { id: number } = await payload.create({
        collection: "locations",
        data: {
          site: site.id,
          feedId: `${site.slug}-${name}`,
          name,
          parent,
          status: "active",
        },
      })
      parent = location.id
    }
    const property = await payload.create({
      collection: "properties",
      data: {
        site: site.id,
        feedId: `${site.slug}-1`,
        feedName: "Big House",
        location: parent,
        sleeps: 12,
        status: "active",
      },
    })
    await payload.create({
      collection: "specials",
      data: {
        site: site.id,
        feedId: `${site.slug}-special`,
        discountSummary: "10% off 7+ nights",
        properties: [property.id],
        status: "active",
      },
    })
  }
}

async function readerFor(key: string): Promise<TypedUser | null> {
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `site-readers API-Key ${key}` }),
  })
  return user
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  // Without feed data: Sites, readers and the lists without references.
  await seed(payload, { sync: false })
  await createFeedData()
  first = await seed(payload, { sync: false })
  second = await seed(payload, { sync: false })
}, 180_000)

afterAll(() => t?.teardown())

describe("demo seed", () => {
  it("creates both Sites with their content", () => {
    for (const slug of ["demo-mountain", "demo-beach"]) {
      expect(first.editorial[slug]).toMatchObject({
        pages: 4,
        lists: 3,
        guides: 2,
        locations: 3,
        properties: 1,
        specials: 1,
        skipped: [],
      })
    }
  })

  it("is idempotent: same counts and secrets on a second run", async () => {
    const before = await counts()
    await seed(payload, { sync: false })
    expect(await counts()).toEqual(before)
    expect(before).toMatchObject({
      sites: 2,
      "site-readers": 2,
      users: 1,
      pages: 8,
      "curated-lists": 6,
      guides: 4,
    })
    expect(second.output).toEqual(first.output)
  })

  it("reuses secrets from an earlier output when the database has none", async () => {
    const { id } = first.output.sites["demo-beach"]!
    await payload.update({
      collection: "sites",
      id,
      data: { revalidationSecret: null },
    })
    const { output } = await seed(payload, {
      sync: false,
      previous: first.output,
    })
    expect(output).toEqual(first.output)
  })

  it("fills the Site settings", async () => {
    const site = await payload.findByID({
      collection: "sites",
      id: first.output.sites["demo-mountain"]!.id,
    })
    expect(site).toMatchObject({
      domain: "demo-mountain.localhost",
      deploymentUrl: "http://localhost:3200",
      feedAccountRef: "demo-mountain",
      stayPolicyDefaults: { checkIn: "16:00", checkOut: "10:00" },
      moderation: { autoShowMinRating: 4 },
    })
  })

  it("shows each SiteReader only its own Site's published content", async () => {
    for (const [slug, { id, readerKey }] of Object.entries(
      first.output.sites
    )) {
      const reader = await readerFor(readerKey)
      expect(reader).toBeTruthy()
      for (const collection of ["pages", "curated-lists", "guides"] as const) {
        const { docs } = await payload.find({
          collection,
          user: reader,
          overrideAccess: false,
          depth: 0,
          pagination: false,
        })
        expect(docs.length, `${slug} ${collection}`).toBeGreaterThan(0)
        for (const doc of docs) {
          expect(doc.site).toBe(id)
          expect(doc._status).toBe("published")
        }
      }
      const { docs: home } = await payload.find({
        collection: "pages",
        where: { path: { equals: "/" } },
        user: reader,
        overrideAccess: false,
        depth: 0,
      })
      expect(home.map((page) => page.layout?.map((b) => b.blockType))).toEqual([
        [
          "hero",
          "propertyGrid",
          "curatedListCards",
          "richText",
          "faq",
          "callToAction",
        ],
      ])
    }
  })

  it("assigns the demo Editor to Demo Mountain only", async () => {
    const { docs } = await payload.find({ collection: "users", depth: 0 })
    expect(docs[0]?.tenants?.map((row) => row.site)).toEqual([
      first.output.sites["demo-mountain"]!.id,
    ])
  })
})
