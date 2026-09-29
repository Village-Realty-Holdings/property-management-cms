import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import type { Payload, PayloadRequest } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { siteEndpoints } from "../collections/Sites/endpoints"
import { computeRating } from "../collections/Reviews/recomputeRating"
import { revalidationSettled } from "../revalidation"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import {
  createFakeFeed,
  demoFeedData,
  reconcile,
  syncListing,
  syncVocabularies,
  type FakeFeedData,
  type ReconcileReport,
} from "./index"

/**
 * Through the Sync's interface only: the in-memory demo feed, a test Payload
 * and a local HTTP server standing in for the Site deployments (/m, /b).
 */

const TIMEOUT = 180_000

type Received = { path: string; tags: string[] }
let received: Received[] = []
let server: Server

let t: TestPayload
let payload: Payload
let mountain: number
let beach: number

const feedWith = (edit?: (data: FakeFeedData) => void) => {
  const data = demoFeedData()
  edit?.(data)
  return createFakeFeed(data)
}
const mountainData = (data: FakeFeedData) => data.accounts["demo-mountain"]!

const allUnchanged = (report: ReconcileReport) => {
  for (const key of [
    "locations",
    "properties",
    "specials",
    "reviews",
  ] as const) {
    expect(report[key], key).toMatchObject({
      created: 0,
      updated: 0,
      withdrawn: 0,
    })
  }
  expect(report.vocabularies).toBeNull()
}

async function propertyByFeedId(site: number, feedId: string) {
  const { docs } = await payload.find({
    collection: "properties",
    where: {
      and: [{ site: { equals: site } }, { feedId: { equals: feedId } }],
    },
    depth: 0,
  })
  const doc = docs[0]
  if (!doc) throw new Error(`No Property ${feedId}`)
  return doc
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      received.push({
        path: req.url ?? "",
        tags: (JSON.parse(body) as { tags: string[] }).tags,
      })
      res.end("{}")
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  t = await getTestPayload()
  payload = t.payload
  mountain = (
    await payload.create({
      collection: "sites",
      data: {
        name: "Demo Mountain",
        slug: "demo-mountain",
        feedAccountRef: "demo-mountain",
        deploymentUrl: `${baseUrl}/m`,
        revalidationSecret: "secret-m",
        moderation: { autoShowMinRating: 4 },
      },
    })
  ).id
  beach = (
    await payload.create({
      collection: "sites",
      data: {
        name: "Demo Beach",
        slug: "demo-beach",
        feedAccountRef: "demo-beach",
        deploymentUrl: `${baseUrl}/b`,
        revalidationSecret: "secret-b",
      },
    })
  ).id
  // Creating a Site revalidates its deployment; let those requests land
  // before the tests start counting.
  await revalidationSettled()
}, TIMEOUT)

afterAll(async () => {
  await t?.teardown()
  await new Promise((resolve) => server?.close(resolve))
})

beforeEach(() => {
  received = []
})

describe("reconcile", () => {
  it(
    "creates everything on the right Site with one notification per Site",
    async () => {
      const feed = createFakeFeed()
      const report = await reconcile({ payload, feed }, mountain)
      const fixture = mountainData(demoFeedData())

      expect(report.errors).toEqual([])
      expect(report.site).toEqual({
        id: mountain,
        slug: "demo-mountain",
        feedAccountRef: "demo-mountain",
      })
      expect(report.vocabularies?.amenities.created).toBe(
        demoFeedData().vocabularies.amenities.length
      )
      expect(report.vocabularies?.propertyTypes.created).toBe(6)
      expect(report.locations.created).toBe(fixture.nodes.length)
      expect(report.properties.created).toBe(20)
      expect(report.specials.created).toBe(3)
      expect(report.reviews.created).toBe(fixture.reviews.length)

      // The Mountain Site's deployment gets one batched request; the Beach
      // Site gets one too, because the shared vocabularies changed.
      expect(received.map((r) => r.path).sort()).toEqual([
        "/b/api/revalidate",
        "/m/api/revalidate",
      ])
      const tags = received.find((r) => r.path.startsWith("/m"))!.tags
      expect(tags).toEqual(
        expect.arrayContaining([
          "properties",
          "curated-lists",
          "locations",
          "specials",
          "property:bear-hollow-lodge",
        ])
      )

      received = []
      const beachReport = await reconcile({ payload, feed }, beach)
      expect(beachReport.errors).toEqual([])
      expect(beachReport.vocabularies).toBeNull()
      expect(beachReport.properties.created).toBe(20)
      expect(received.map((r) => r.path)).toEqual(["/b/api/revalidate"])

      // Site scoping: each Site has exactly its own account's listings.
      for (const [site, prefix] of [
        [mountain, "41"],
        [beach, "52"],
      ] as const) {
        const { docs } = await payload.find({
          collection: "properties",
          where: { site: { equals: site } },
          depth: 0,
          pagination: false,
        })
        expect(docs).toHaveLength(20)
        expect(docs.every((d) => d.feedId.startsWith(prefix))).toBe(true)
      }

      const lodge = await payload.find({
        collection: "properties",
        where: { feedId: { equals: "41001" } },
        depth: 1,
      })
      const doc = lodge.docs[0]!
      expect(doc.slug).toBe("bear-hollow-lodge")
      expect(doc.status).toBe("active")
      expect(typeof doc.location === "object" && doc.location?.name).toBe(
        "Chalet Village"
      )
      expect(
        typeof doc.propertyType === "object" && doc.propertyType?.feedId
      ).toBe("cabin")
      expect(doc.amenities).toHaveLength(10)
      expect(doc.photos).toHaveLength(5)

      const inactive = await propertyByFeedId(mountain, "41018")
      expect(inactive.status).toBe("withdrawn")

      const village = await payload.find({
        collection: "locations",
        where: { feedId: { equals: "N111" } },
        depth: 1,
      })
      const parent = village.docs[0]?.parent
      expect(typeof parent === "object" && parent?.feedId).toBe("N110")
    },
    TIMEOUT
  )

  it(
    "is idempotent: a second run is unchanged and sends nothing",
    async () => {
      const feed = createFakeFeed()
      const report = await reconcile({ payload, feed }, mountain)
      expect(report.errors).toEqual([])
      allUnchanged(report)
      expect(report.properties.unchanged).toBe(20)
      expect(received).toEqual([])
    },
    TIMEOUT
  )

  it(
    "applies the Site's Moderation rule and updates the Property Rating",
    async () => {
      const lodge = await propertyByFeedId(mountain, "41001")
      const { docs } = await payload.find({
        collection: "reviews",
        where: { property: { equals: lodge.id } },
        depth: 0,
        pagination: false,
      })
      expect(docs.length).toBeGreaterThanOrEqual(3)
      for (const review of docs) {
        expect(review.moderation).toBe(
          (review.rating ?? 0) >= 4 ? "shown" : "pending"
        )
      }
      const shown = docs.filter((r) => r.moderation === "shown")
      expect(shown.length).toBeGreaterThan(0)
      expect({
        rating: lodge.rating,
        reviewCount: lodge.reviewCount,
      }).toEqual(computeRating(shown.map((r) => r.rating)))

      // Beach has no rule: everything is held as Pending.
      const beachReviews = await payload.count({
        collection: "reviews",
        where: {
          and: [
            { site: { equals: beach } },
            { moderation: { not_equals: "pending" } },
          ],
        },
      })
      expect(beachReviews.totalDocs).toBe(0)
    },
    TIMEOUT
  )

  it(
    "keeps Editorial Content, slugs, Levels and Moderation through a re-sync",
    async () => {
      const lodge = await propertyByFeedId(mountain, "41001")
      await payload.update({
        collection: "properties",
        id: lodge.id,
        data: {
          headline: "The best lodge",
          slug: "bear-lodge",
          featured: true,
        },
      })
      const village = (
        await payload.find({
          collection: "locations",
          where: { feedId: { equals: "N111" } },
        })
      ).docs[0]!
      await payload.update({
        collection: "locations",
        id: village.id,
        data: {
          level: "complex",
          displayName: "The Village",
          visible: false,
        },
      })
      const review = (
        await payload.find({
          collection: "reviews",
          where: { feedId: { equals: "41001-R1" } },
        })
      ).docs[0]!
      await payload.update({
        collection: "reviews",
        id: review.id,
        data: { moderation: "hidden" },
      })
      const special = (
        await payload.find({
          collection: "specials",
          where: { feedId: { equals: "P-WINTER26" } },
        })
      ).docs[0]!
      await payload.update({
        collection: "specials",
        id: special.id,
        data: { title: "Winter deals", showOnSite: true },
      })

      const feed = feedWith((data) => {
        const account = mountainData(data)
        account.listings[0]!.name = "Bear Hollow Lodge & Spa"
        account.nodes.find((n) => n.feedId === "N111")!.name = "Chalet Vlg"
        account.reviews.find((r) => r.feedId === "41001-R1")!.body = "Edited"
        account.promos[0]!.name = "Renamed promo"
        account.promos[0]!.discountSummary = "25% off"
      })
      const report = await reconcile({ payload, feed }, mountain)
      expect(report.errors).toEqual([])
      expect(report.properties.updated).toBe(1)
      expect(report.locations.updated).toBe(1)
      expect(report.reviews.updated).toBe(1)
      expect(report.specials.updated).toBe(1)

      const after = await propertyByFeedId(mountain, "41001")
      expect(after).toMatchObject({
        feedName: "Bear Hollow Lodge & Spa",
        headline: "The best lodge",
        slug: "bear-lodge",
        featured: true,
      })
      const loc = await payload.findByID({
        collection: "locations",
        id: village.id,
      })
      expect(loc).toMatchObject({
        name: "Chalet Vlg",
        level: "complex",
        displayName: "The Village",
        visible: false,
        slug: village.slug,
      })
      const rev = await payload.findByID({
        collection: "reviews",
        id: review.id,
      })
      expect(rev).toMatchObject({ body: "Edited", moderation: "hidden" })
      const sp = await payload.findByID({
        collection: "specials",
        id: special.id,
      })
      expect(sp).toMatchObject({
        title: "Winter deals",
        showOnSite: true,
        discountSummary: "25% off",
        slug: special.slug,
      })
    },
    TIMEOUT
  )

  it(
    "withdraws what the Feed drops and reactivates it on return",
    async () => {
      const dropped = feedWith((data) => {
        const account = mountainData(data)
        account.listings = account.listings.filter((l) => l.feedId !== "41002")
        account.reviews = account.reviews.filter(
          (r) => r.listingFeedId !== "41002"
        )
        account.promos = account.promos.filter((p) => p.feedId !== "P-FALL25")
      })
      const report = await reconcile({ payload, feed: dropped }, mountain)
      expect(report.properties.withdrawn).toBe(1)
      expect(report.specials.withdrawn).toBe(1)
      const chalet = await propertyByFeedId(mountain, "41002")
      expect(chalet.status).toBe("withdrawn")
      // Only this Site: the Beach Site is untouched.
      const beachActive = await payload.count({
        collection: "properties",
        where: {
          and: [{ site: { equals: beach } }, { status: { equals: "active" } }],
        },
      })
      expect(beachActive.totalDocs).toBe(19)

      const back = await reconcile(
        { payload, feed: createFakeFeed() },
        mountain
      )
      expect(back.errors).toEqual([])
      expect(back.properties.updated).toBeGreaterThanOrEqual(1)
      const returned = await propertyByFeedId(mountain, "41002")
      expect(returned.status).toBe("active")
      expect(returned.slug).toBe(chalet.slug)
    },
    TIMEOUT
  )
})

describe("reconcile with a bad Feed tree", () => {
  it(
    "reports nodes in a parent cycle without withdrawing their Locations",
    async () => {
      const feed = feedWith((data) => {
        const nodes = mountainData(data).nodes
        nodes.find((n) => n.feedId === "N111")!.parentFeedId = "N999"
        nodes.push({
          feedId: "N999",
          name: "Loop",
          type: "area",
          parentFeedId: "N111",
          status: "active",
        })
      })
      const report = await reconcile({ payload, feed }, mountain)
      expect(report.errors.map((e) => e.feedId).sort()).toEqual([
        "N111",
        "N999",
      ])
      expect(report.locations.withdrawn).toBe(0)
      const village = await payload.find({
        collection: "locations",
        where: { feedId: { equals: "N111" } },
        depth: 0,
      })
      expect(village.docs[0]?.status).toBe("active")
    },
    TIMEOUT
  )
})

describe("syncListing", () => {
  it(
    "creates, updates, withdraws and leaves unchanged one listing",
    async () => {
      const ctx = (edit?: (data: FakeFeedData) => void) => ({
        payload,
        feed: feedWith(edit),
      })
      expect(await syncListing(ctx(), beach, "52001")).toBe("unchanged")

      const bigger = (data: FakeFeedData) => {
        data.accounts["demo-beach"]!.listings[0]!.sleeps = 7
      }
      expect(await syncListing(ctx(bigger), beach, "52001")).toBe("updated")
      expect((await propertyByFeedId(beach, "52001")).sleeps).toBe(7)
      expect(received.map((r) => r.path)).toEqual(["/b/api/revalidate"])

      const removed = (data: FakeFeedData) => {
        const account = data.accounts["demo-beach"]!
        account.listings = account.listings.filter((l) => l.feedId !== "52001")
      }
      expect(await syncListing(ctx(removed), beach, "52001")).toBe("withdrawn")
      expect(await syncListing(ctx(removed), beach, "52001")).toBe("unchanged")

      const added = (data: FakeFeedData) => {
        const account = data.accounts["demo-beach"]!
        account.listings.push({
          ...account.listings[1]!,
          feedId: "52999",
          name: "Brand New Condo",
        })
      }
      expect(await syncListing(ctx(added), beach, "52999")).toBe("created")
      const created = await propertyByFeedId(beach, "52999")
      expect(created.slug).toBe("brand-new-condo")
      expect(created.location).toBeTruthy()
    },
    TIMEOUT
  )
})

describe("syncVocabularies", () => {
  it(
    "withdraws dropped entries instead of deleting them",
    async () => {
      const feed = feedWith((data) => {
        data.vocabularies.amenities = data.vocabularies.amenities.filter(
          (a) => a.feedId !== "crib"
        )
      })
      const report = await syncVocabularies({ payload, feed })
      expect(report.amenities.withdrawn).toBe(1)
      const crib = await payload.find({
        collection: "amenities",
        where: { feedId: { equals: "crib" } },
      })
      expect(crib.docs[0]?.status).toBe("withdrawn")
      // Every Site hears about a vocabulary change.
      expect(received.map((r) => r.path).sort()).toEqual([
        "/b/api/revalidate",
        "/m/api/revalidate",
      ])

      const back = await syncVocabularies({ payload, feed: createFakeFeed() })
      expect(back.amenities).toMatchObject({ updated: 1, created: 0 })
    },
    TIMEOUT
  )
})

describe("POST /api/sites/:id/reconcile", () => {
  const handler = siteEndpoints.find(
    (e) => e.path === "/:id/reconcile"
  )!.handler
  const call = (user: unknown, id: number) =>
    handler({
      payload,
      user,
      routeParams: { id: String(id) },
      context: {},
    } as unknown as PayloadRequest)

  it("is for Super Admins only", async () => {
    expect((await call(null, mountain)).status).toBe(401)
    const editor = { collection: "users", role: "admin", superAdmin: false }
    expect((await call(editor, mountain)).status).toBe(403)
  })

  it(
    "answers 501 without the fake feed, and the report with it",
    async () => {
      const superAdmin = { collection: "users", superAdmin: true }
      const previous = process.env.PROPERTY_FEED
      try {
        delete process.env.PROPERTY_FEED
        expect((await call(superAdmin, mountain)).status).toBe(501)

        process.env.PROPERTY_FEED = "fake"
        const response = await call(superAdmin, mountain)
        expect(response.status).toBe(200)
        const report = (await response.json()) as ReconcileReport
        expect(report.site.slug).toBe("demo-mountain")
        allUnchanged(report)
        expect((await call(superAdmin, 999_999)).status).toBe(404)
      } finally {
        if (previous === undefined) delete process.env.PROPERTY_FEED
        else process.env.PROPERTY_FEED = previous
      }
    },
    TIMEOUT
  )
})
