import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import type { Payload } from "payload"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { cacheTags } from "@workspace/content/shared"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { createBatch, notify, revalidationSettled } from "./index"

/**
 * End to end: the collections' hooks → HTTP POST to a local server standing
 * in for the Site deployments. Each Site's deployment URL gets its own path
 * prefix (/a, /b) on the one server.
 */

type Received = { path: string; authorization?: string; tags: string[] }

let received: Received[] = []
let mode: "ok" | "error" | "hang" = "ok"
let server: Server
let baseUrl: string

let t: TestPayload
let payload: Payload
let siteA: number
let siteB: number
let siteNoUrl: number
let locationA: number

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
      if (mode === "hang") return
      res.statusCode = mode === "error" ? 500 : 200
      res.end(JSON.stringify({ revalidated: mode === "ok" }))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

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
  // Trailing slash: must not produce "//api/revalidate".
  siteB = await site("site-b", {
    deploymentUrl: `${baseUrl}/b/`,
    revalidationSecret: "secret-b",
  })
  siteNoUrl = await site("site-no-url", { revalidationSecret: "secret-c" })

  locationA = (
    await payload.create({
      collection: "locations",
      data: { site: siteA, feedId: "loc-1", name: "Lake", status: "active" },
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
  mode = "ok"
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function createProperty(site: number, feedId: string) {
  const doc = await payload.create({
    collection: "properties",
    data: {
      site,
      feedId,
      feedName: `Cabin ${feedId}`,
      status: "active",
      // Locations are Site-scoped; the one Location is on Site A.
      location: site === siteA ? locationA : null,
    },
  })
  await revalidationSettled()
  received = []
  return doc
}

describe("revalidation hooks", () => {
  it("revalidates a Site's Pages and Guides when a Variable-backed setting changes", async () => {
    await payload.update({
      collection: "sites",
      id: siteA,
      data: { branding: { phone: "+1 555 0199" } },
    })
    await revalidationSettled()
    expect(received).toEqual([
      {
        path: "/a/api/revalidate",
        authorization: "Bearer secret-a",
        tags: [cacheTags.siteSettings, cacheTags.pages, cacheTags.guides],
      },
    ])

    received = []
    await payload.update({
      collection: "sites",
      id: siteA,
      data: { branding: { primaryColor: "#224466" } },
    })
    await revalidationSettled()
    expect(received.map(({ tags }) => tags)).toEqual([[cacheTags.siteSettings]])
  })

  it("sends a Property's tags to its Site's deployment with the Site's secret", async () => {
    const property = await createProperty(siteA, "p-1")
    expect(property.slug).toBe("cabin-p-1")

    await payload.update({
      collection: "properties",
      id: property.id,
      data: { slug: "lake-cabin" },
    })
    await revalidationSettled()

    expect(received).toEqual([
      {
        path: "/a/api/revalidate",
        authorization: "Bearer secret-a",
        tags: [
          "property:lake-cabin",
          "property:cabin-p-1",
          "properties",
          "curated-lists",
          `location:${locationA}`,
        ],
      },
    ])
  })

  it("does nothing when context.skipRevalidation is set", async () => {
    const property = await createProperty(siteA, "p-2")

    await payload.update({
      collection: "properties",
      id: property.id,
      data: { slug: "skipped" },
      context: { skipRevalidation: true },
    })
    await payload.delete({
      collection: "properties",
      id: property.id,
      context: { skipRevalidation: true },
    })
    await revalidationSettled()

    expect(received).toEqual([])
  })

  it("notifies on delete", async () => {
    const property = await createProperty(siteA, "p-3")

    await payload.delete({ collection: "properties", id: property.id })
    await revalidationSettled()

    expect(received).toHaveLength(1)
    expect(received[0]?.tags).toContain("property:cabin-p-3")
  })

  it("skips a Site without a deployment URL", async () => {
    const error = vi.spyOn(payload.logger, "error")
    const property = await createProperty(siteNoUrl, "p-4")

    await payload.update({
      collection: "properties",
      id: property.id,
      data: { slug: "nowhere" },
    })
    await revalidationSettled()

    expect(received).toEqual([])
    expect(error).not.toHaveBeenCalled()
  })

  it("never fails the save when the deployment responds 500", async () => {
    const error = vi.spyOn(payload.logger, "error")
    const property = await createProperty(siteA, "p-5")
    mode = "error"

    const updated = await payload.update({
      collection: "properties",
      id: property.id,
      data: { slug: "still-saved" },
    })
    await revalidationSettled()

    expect(updated.slug).toBe("still-saved")
    expect(received).toHaveLength(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining("500"))
  })

  it("only notifies when the published version of a draft-enabled doc changes", async () => {
    const draft = await payload.create({
      collection: "pages",
      data: { site: siteA, title: "About", path: "/about", _status: "draft" },
      draft: true,
    })
    await payload.update({
      collection: "pages",
      id: draft.id,
      data: { title: "About us" },
      draft: true,
    })
    await revalidationSettled()
    expect(received).toEqual([])

    await payload.update({
      collection: "pages",
      id: draft.id,
      data: { _status: "published" },
    })
    const tagsSent = async () => {
      await revalidationSettled()
      const tags = received.map((request) => request.tags)
      received = []
      return tags
    }
    expect(await tagsSent()).toEqual([["page:/about", "pages"]])

    // A draft that moves the Page: the Site still shows /about.
    await payload.update({
      collection: "pages",
      id: draft.id,
      data: { path: "/about-us" },
      draft: true,
    })
    expect(await tagsSent()).toEqual([])

    // Publishing it revalidates the new and the old published path.
    await payload.update({
      collection: "pages",
      id: draft.id,
      data: { _status: "published" },
    })
    expect(await tagsSent()).toEqual([
      ["page:/about-us", "page:/about", "pages"],
    ])

    // Unpublishing revalidates the path the Site loses.
    await payload.update({
      collection: "pages",
      id: draft.id,
      data: { _status: "draft" },
    })
    expect(await tagsSent()).toEqual([["page:/about-us", "pages"]])

    // Deleting a Page the Site doesn't show sends nothing.
    await payload.delete({ collection: "pages", id: draft.id })
    expect(await tagsSent()).toEqual([])
  })

  it("notifies every Site with a deployment for Awayday-wide vocabularies", async () => {
    await payload.create({
      collection: "amenities",
      data: { feedId: "hot-tub", name: "Hot tub" },
    })
    await revalidationSettled()

    expect(
      received.map(({ path, authorization, tags }) => ({
        path,
        authorization,
        tags,
      }))
    ).toEqual(
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
    expect(received).toHaveLength(2)
  })
})

describe("notify", () => {
  it("gives up after the timeout without throwing", async () => {
    const error = vi.spyOn(payload.logger, "error")
    mode = "hang"

    const started = Date.now()
    await notify(payload, siteA, [cacheTags.properties], { timeoutMs: 200 })

    expect(Date.now() - started).toBeLessThan(2_000)
    expect(received).toHaveLength(1)
    expect(error).toHaveBeenCalled()
  })

  it("does nothing for an unknown Site", async () => {
    await expect(
      notify(payload, 999_999, [cacheTags.properties])
    ).resolves.toBeUndefined()
    expect(received).toEqual([])
  })
})

describe("createBatch", () => {
  it("sends one request per Site with de-duplicated tags", async () => {
    const batch = createBatch(payload)
    batch.add(siteA, [cacheTags.property("x"), cacheTags.properties])
    batch.add(siteB, [cacheTags.specials])
    batch.add(siteA, [cacheTags.properties, cacheTags.property("y")])
    batch.add(String(siteB), [cacheTags.specials, cacheTags.properties])

    await batch.flush()

    expect(received).toHaveLength(2)
    expect(received).toEqual(
      expect.arrayContaining([
        {
          path: "/a/api/revalidate",
          authorization: "Bearer secret-a",
          tags: ["property:x", "properties", "property:y"],
        },
        {
          path: "/b/api/revalidate",
          authorization: "Bearer secret-b",
          tags: ["specials", "properties"],
        },
      ])
    )

    // Flushed: a second flush sends nothing.
    received = []
    await batch.flush()
    expect(received).toEqual([])
  })
})
