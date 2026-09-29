import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { revalidationSettled } from "./index"

/**
 * The revalidation hooks as the collection configs attach them (ADR-0009):
 * one representative change per collection → the expected tags at the owning
 * Site's deployment (a local server; Site A at /a, Site B at /b).
 * ./revalidation.test.ts covers drafts, failures and batching in depth.
 */

type Received = { path: string; authorization?: string; tags: string[] }

let received: Received[] = []
let server: Server

let t: TestPayload
let payload: Payload
let siteA: number
let siteB: number
let siteNoUrl: number
let location: number
let property: number

/** The requests sent since the last call, once every notification is done. */
async function sent(): Promise<Received[]> {
  await revalidationSettled()
  const requests = received
  received = []
  return requests
}

/** A single request to Site A with `tags`. */
const toSiteA = (tags: string[]): Received[] => [
  { path: "/a/api/revalidate", authorization: "Bearer secret-a", tags },
]

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      received.push({
        path: req.url ?? "",
        authorization: req.headers.authorization,
        tags: (JSON.parse(body) as { tags: string[] }).tags,
      })
      res.end("{}")
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  t = await getTestPayload()
  payload = t.payload

  const site = async (slug: string, data: object) =>
    (
      await payload.create({
        collection: "sites",
        data: { name: slug, slug, ...data },
      })
    ).id
  siteA = await site("site-a", {
    deploymentUrl: `${baseUrl}/a`,
    revalidationSecret: "secret-a",
  })
  siteB = await site("site-b", {
    deploymentUrl: `${baseUrl}/b`,
    revalidationSecret: "secret-b",
  })
  siteNoUrl = await site("site-no-url", {})

  location = (
    await payload.create({
      collection: "locations",
      data: { site: siteA, feedId: "loc-1", name: "Lake", status: "active" },
    })
  ).id
  property = (
    await payload.create({
      collection: "properties",
      data: {
        site: siteA,
        feedId: "p-1",
        feedName: "Lake Cabin",
        status: "active",
        location,
      },
    })
  ).id
  await revalidationSettled()
})

afterAll(async () => {
  await t?.teardown()
  server?.closeAllConnections()
  server?.close()
})

beforeEach(() => {
  received = []
})

describe("revalidation wiring", () => {
  it("properties: a slug change sends the old and new property tags", async () => {
    await payload.update({
      collection: "properties",
      id: property,
      data: { slug: "lakeside-cabin" },
    })
    expect(await sent()).toEqual(
      toSiteA([
        "property:lakeside-cabin",
        "property:lake-cabin",
        "properties",
        "curated-lists",
        `location:${location}`,
      ])
    )
  })

  it("locations: an edit sends the Location's tags", async () => {
    await payload.update({
      collection: "locations",
      id: location,
      data: { displayName: "The Lake" },
    })
    expect(await sent()).toEqual(
      toSiteA([`location:${location}`, "locations", "properties"])
    )
  })

  it("pages: a draft save sends nothing; publishing sends page(path)", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { site: siteA, title: "About", path: "/about", _status: "draft" },
      draft: true,
    })
    expect(await sent()).toEqual([])

    await payload.update({
      collection: "pages",
      id: page.id,
      data: { _status: "published" },
    })
    expect(await sent()).toEqual(toSiteA(["page:/about", "pages"]))
  })

  it("guides: publishing sends the Guide's tags", async () => {
    await payload.create({
      collection: "guides",
      data: { site: siteA, title: "Lake walks", _status: "published" },
    })
    expect(await sent()).toEqual(toSiteA(["guide:lake-walks", "guides"]))
  })

  it("curated-lists: publishing sends the Curated List's tags", async () => {
    await payload.create({
      collection: "curated-lists",
      data: { site: siteA, title: "Lake stays", _status: "published" },
    })
    expect(await sent()).toEqual(
      toSiteA(["curated-list:lake-stays", "curated-lists"])
    )
  })

  it("specials: a change sends specials", async () => {
    await payload.create({
      collection: "specials",
      data: { site: siteA, feedId: "s-1", title: "Deal", status: "active" },
    })
    expect(await sent()).toEqual(toSiteA(["specials"]))
  })

  it("reviews: a Moderation change revalidates its Property once", async () => {
    const review = await payload.create({
      collection: "reviews",
      data: {
        site: siteA,
        property,
        feedId: "r-1",
        rating: 4,
        status: "active",
        moderation: "pending",
      },
    })
    await sent()

    await payload.update({
      collection: "reviews",
      id: review.id,
      data: { moderation: "shown" },
    })
    // The Rating recompute writes the Property with skipRevalidation: only
    // the Review's own notification is sent.
    expect(await sent()).toEqual(
      toSiteA([
        "property:lakeside-cabin",
        "properties",
        "curated-lists",
        "location:1",
      ])
    )
    const updated = await payload.findByID({
      collection: "properties",
      id: property,
      depth: 0,
    })
    expect(updated).toMatchObject({ rating: 4, reviewCount: 1 })
  })

  it("sites: a Site change revalidates that Site's settings only", async () => {
    // Not a Variable ({site} is the name): Pages and Guides are unaffected.
    await payload.update({
      collection: "sites",
      id: siteB,
      data: { branding: { tagline: "By the sea" } },
    })
    expect(await sent()).toEqual([
      {
        path: "/b/api/revalidate",
        authorization: "Bearer secret-b",
        tags: ["site-settings"],
      },
    ])
  })

  it.each(["amenities", "property-types"] as const)(
    "%s: a change notifies every Site with a deployment URL",
    async (collection) => {
      await payload.create({
        collection,
        data: { feedId: `${collection}-1`, name: "Hot tub" },
      })
      const requests = await sent()
      expect(requests).toHaveLength(2)
      expect(requests).toEqual(
        expect.arrayContaining([
          {
            path: "/a/api/revalidate",
            authorization: "Bearer secret-a",
            tags: ["properties", "site-settings"],
          },
          {
            path: "/b/api/revalidate",
            authorization: "Bearer secret-b",
            tags: ["properties", "site-settings"],
          },
        ])
      )
    }
  )

  it("skips a Site without a deployment URL", async () => {
    await payload.create({
      collection: "specials",
      data: { site: siteNoUrl, feedId: "s-3", title: "Deal", status: "active" },
    })
    await payload.update({
      collection: "sites",
      id: siteNoUrl,
      data: { name: "No URL" },
    })
    expect(await sent()).toEqual([])
  })

  it("sends nothing for Sync-style writes with context.skipRevalidation", async () => {
    const context = { skipRevalidation: true }
    await payload.update({
      collection: "properties",
      id: property,
      data: { feedName: "Lake Cabin II" },
      context,
    })
    await payload.update({
      collection: "locations",
      id: location,
      data: { name: "Lake II" },
      context,
    })
    await payload.create({
      collection: "reviews",
      data: {
        site: siteA,
        property,
        feedId: "r-2",
        rating: 2,
        status: "active",
        moderation: "shown",
      },
      context,
    })
    await payload.create({
      collection: "specials",
      data: { site: siteA, feedId: "s-2", status: "active" },
      context,
    })
    await payload.create({
      collection: "amenities",
      data: { feedId: "sauna", name: "Sauna" },
      context,
    })
    expect(await sent()).toEqual([])
  })
})
