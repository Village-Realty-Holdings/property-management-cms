import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { loadMediaPage } from "./media"

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let t: TestPayload
let payload: Payload
let as: { overrideAccess: false; user: User & { collection: "users" } }
let newestId: number

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const user = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", registryUserId: 368570 },
  })
  as = { overrideAccess: false, user: { ...user, collection: "users" } }

  const run = Date.now()
  const upload = async (name: string, alt: string) => {
    const doc = await payload.create({
      collection: "media",
      data: { alt },
      file: {
        data: PNG,
        mimetype: "image/png",
        name: `${run}-${name}`,
        size: PNG.length,
      },
      ...as,
    })
    newestId = doc.id
  }
  await upload("lake-dawn-1.png", "Lake at dawn")
  await upload("lake-dawn-2.png", "Lake at dawn")
  await upload("cabin-porch.png", "Wooden deck")
  for (let i = 1; i <= 47; i++) await upload(`filler-${i}.png`, "Filler")
}, 120_000)

afterAll(async () => {
  await t?.teardown()
})

describe("loadMediaPage", () => {
  it("lists 48 per page, newest first", async () => {
    const result = await loadMediaPage(payload, as)
    expect(result.docs).toHaveLength(48)
    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(2)
    expect(result.totalDocs).toBe(50)
    expect(result.docs[0]!.id).toBe(newestId)
  })

  it("pages without overlap", async () => {
    const one = await loadMediaPage(payload, as)
    const two = await loadMediaPage(payload, as, { page: 2 })
    expect(two.docs).toHaveLength(2)
    const seen = new Set(one.docs.map((d) => d.id))
    expect(two.docs.some((d) => seen.has(d.id))).toBe(false)
  })

  it("clamps a page out of range and treats bad pages as 1", async () => {
    const two = await loadMediaPage(payload, as, { page: 2 })
    const far = await loadMediaPage(payload, as, { page: 99 })
    expect(far.page).toBe(2)
    expect(far.docs.map((d) => d.id)).toEqual(two.docs.map((d) => d.id))
    for (const page of [0, -3, NaN]) {
      expect((await loadMediaPage(payload, as, { page })).page).toBe(1)
    }
  })

  it("searches alt text and file name, ignoring case", async () => {
    const names = async (q: string) =>
      (await loadMediaPage(payload, as, { q })).docs.map((d) => d.filename)
    expect(await names("LAKE")).toEqual([
      expect.stringContaining("lake-dawn-2"),
      expect.stringContaining("lake-dawn-1"),
    ])
    expect(await names("porch")).toEqual([
      expect.stringContaining("cabin-porch"),
    ])
    expect(await names("  dawn lake ")).toHaveLength(2)
  })

  it("returns a single empty page when nothing matches", async () => {
    const result = await loadMediaPage(payload, as, { q: "zzz", page: 5 })
    expect(result).toMatchObject({
      docs: [],
      totalDocs: 0,
      totalPages: 1,
      page: 1,
    })
  })

  it("lists everything for a blank search", async () => {
    const result = await loadMediaPage(payload, as, { q: "   " })
    expect(result.totalDocs).toBe(50)
  })
})
