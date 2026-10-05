import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { emptyBrand } from "./brandForm"
import { emptySeo } from "./seoForm"
import { readRevision } from "./revision"
import { loadBrand, loadSeo, saveBrandAs, saveSeoAs } from "./settingsSave"

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let t: TestPayload
let testUser: User & { collection: "users" }
let asUser: { overrideAccess: false; user: typeof testUser }
const asVisitor = { overrideAccess: false, user: null } as const

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", registryUserId: 368570 },
  })
  testUser = { ...user, collection: "users" }
  asUser = { overrideAccess: false, user: testUser }
})

afterAll(async () => {
  // Removes the uploaded files from local disk too.
  await t?.payload.delete({
    collection: "media",
    where: { id: { exists: true } },
  })
  await t?.teardown()
})

describe("the Brand screen's data", () => {
  it("starts empty before anyone has saved", async () => {
    expect(await loadBrand(t.payload, asUser)).toEqual(emptyBrand)
  })

  it("saves as the User and reads back what the form shows", async () => {
    const media = await t.payload.create({
      collection: "media",
      data: { alt: "Logo" },
      file: {
        data: PNG,
        mimetype: "image/png",
        name: `logo-${Date.now()}.png`,
        size: PNG.length,
      },
      ...asUser,
    })
    const logo = media.id

    const result = await saveBrandAs(t.payload, asUser, {
      name: "  Warren Beach ",
      tagline: "Sand between your toes",
      logo,
      phone: "+1 555 010 0100",
      email: "hello@warren.test",
      address: "1 Beach Road",
      social: [{ platform: "instagram", url: "https://instagram.com/warren" }],
    })

    expect(result.ok).toBe(true)
    expect(result.message).toBe("Brand saved.")
    expect(result.values?.name).toBe("Warren Beach")
    expect(result.values?.logo).toBe(logo)
    expect(await loadBrand(t.payload, asUser)).toEqual(result.values)
    const stored = await t.payload.findGlobal({ slug: "brand", ...asVisitor })
    expect(stored.name).toBe("Warren Beach")
    expect(stored.contact?.email).toBe("hello@warren.test")
    expect(stored.social?.[0]?.url).toBe("https://instagram.com/warren")
  })

  it("reports field errors and saves nothing when the form is invalid", async () => {
    const before = await loadBrand(t.payload, asUser)
    const result = await saveBrandAs(t.payload, asUser, {
      ...before,
      name: "Changed",
      social: [{ platform: "x", url: "ftp://nope" }],
    })
    expect(result.ok).toBe(false)
    expect(result.fieldErrors).toEqual({
      "social.0.url": "Enter an http(s) URL, like https://example.com.",
    })
    expect(await loadBrand(t.payload, asUser)).toEqual(before)
  })

  it("refuses a visitor, and says so instead of throwing", async () => {
    const before = await loadBrand(t.payload, asUser)
    const result = await saveBrandAs(t.payload, asVisitor, {
      ...before,
      name: "Hacked",
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
    expect((await loadBrand(t.payload, asUser)).name).toBe(before.name)
  })
})

describe("the SEO screen's data", () => {
  it("starts with indexing on before anyone has saved", async () => {
    const values = await loadSeo(t.payload, asUser)
    expect(values.allowIndexing).toBe(true)
    expect(values.description).toBe("")
  })

  it("saves the defaults, including switching indexing off", async () => {
    const result = await saveSeoAs(t.payload, asUser, {
      titlePattern: "%s | {name}",
      description: "Beachfront cabins.",
      image: null,
      favicon: null,
      allowIndexing: false,
    })
    expect(result).toMatchObject({ ok: true, message: "SEO saved." })
    const stored = await t.payload.findGlobal({ slug: "seo", ...asVisitor })
    expect(stored.allowIndexing).toBe(false)
    expect(stored.titlePattern).toBe("%s | {name}")
    expect(await loadSeo(t.payload, asUser)).toEqual(result.values)
  })

  it("keeps the old defaults when the pattern is invalid", async () => {
    const before = await loadSeo(t.payload, asUser)
    const result = await saveSeoAs(t.payload, asUser, {
      ...emptySeo,
      titlePattern: "no token",
    })
    expect(result.ok).toBe(false)
    expect(result.fieldErrors).toHaveProperty("titlePattern")
    expect(await loadSeo(t.payload, asUser)).toEqual(before)
  })

  it("refuses a visitor", async () => {
    const result = await saveSeoAs(t.payload, asVisitor, emptySeo)
    expect(result.ok).toBe(false)
  })
})

describe("saving the Brand and SEO over someone else's change", () => {
  const brand = { ...emptyBrand, name: "Warren" }

  it("refuses a stale Brand save, saying when and not who, and stores nothing", async () => {
    const first = await saveBrandAs(t.payload, asUser, brand)
    const stored = await loadBrand(t.payload, asUser)
    const stale = await saveBrandAs(
      t.payload,
      asUser,
      { ...brand, name: "Mine" },
      { expected: "2000-01-01T00:00:00.000Z" }
    )
    const now = await readRevision(t.payload, asUser, { kind: "brand" })
    expect(stale).toEqual({
      ok: false,
      message: "The Brand changed since you opened it.",
      conflict: { kind: "brand", by: null, byYou: false, at: now.at },
    })
    expect(await loadBrand(t.payload, asUser)).toEqual(stored)
    expect(first.revision).toBe(now.revision)
  })

  it("saves with the current revision, returning the next, and with force", async () => {
    await saveBrandAs(t.payload, asUser, brand)
    const opened = (await readRevision(t.payload, asUser, { kind: "brand" }))
      .revision
    const fresh = await saveBrandAs(
      t.payload,
      asUser,
      { ...brand, name: "Fresh" },
      { expected: opened }
    )
    expect(fresh.ok).toBe(true)
    expect(fresh.revision).toBe(
      (await readRevision(t.payload, asUser, { kind: "brand" })).revision
    )
    const forced = await saveBrandAs(
      t.payload,
      asUser,
      { ...brand, name: "Forced" },
      { expected: "2000-01-01T00:00:00.000Z", force: true }
    )
    expect(forced.ok).toBe(true)
    expect((await loadBrand(t.payload, asUser)).name).toBe("Forced")
  })

  it("refuses a stale SEO save, and saves with force", async () => {
    await saveSeoAs(t.payload, asUser, emptySeo)
    const stale = await saveSeoAs(
      t.payload,
      asUser,
      { ...emptySeo, description: "Mine" },
      { expected: "2000-01-01T00:00:00.000Z" }
    )
    expect(stale).toMatchObject({
      ok: false,
      message: "SEO changed since you opened it.",
      conflict: { kind: "seo", by: null },
    })
    expect((await loadSeo(t.payload, asUser)).description).not.toBe("Mine")
    const forced = await saveSeoAs(
      t.payload,
      asUser,
      { ...emptySeo, description: "Mine" },
      { expected: "2000-01-01T00:00:00.000Z", force: true }
    )
    expect(forced.ok).toBe(true)
    expect((await loadSeo(t.payload, asUser)).description).toBe("Mine")
  })
})
