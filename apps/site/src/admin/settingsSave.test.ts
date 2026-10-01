import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { emptyBrand } from "./brandForm"
import { emptySeo } from "./seoForm"
import { loadBrand, loadSeo, saveBrandAs, saveSeoAs } from "./settingsSave"

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let t: TestPayload
let staff: User & { collection: "users" }
let asStaff: { overrideAccess: false; user: typeof staff }
const asVisitor = { overrideAccess: false, user: null } as const

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  staff = { ...user, collection: "users" }
  asStaff = { overrideAccess: false, user: staff }
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
    expect(await loadBrand(t.payload, asStaff)).toEqual(emptyBrand)
  })

  it("saves as the Staff User and reads back what the form shows", async () => {
    const media = await t.payload.create({
      collection: "media",
      data: { alt: "Logo" },
      file: {
        data: PNG,
        mimetype: "image/png",
        name: `logo-${Date.now()}.png`,
        size: PNG.length,
      },
      ...asStaff,
    })
    const logo = media.id

    const result = await saveBrandAs(t.payload, asStaff, {
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
    expect(await loadBrand(t.payload, asStaff)).toEqual(result.values)
    const stored = await t.payload.findGlobal({ slug: "brand", ...asVisitor })
    expect(stored.name).toBe("Warren Beach")
    expect(stored.contact?.email).toBe("hello@warren.test")
    expect(stored.social?.[0]?.url).toBe("https://instagram.com/warren")
  })

  it("reports field errors and saves nothing when the form is invalid", async () => {
    const before = await loadBrand(t.payload, asStaff)
    const result = await saveBrandAs(t.payload, asStaff, {
      ...before,
      name: "Changed",
      social: [{ platform: "x", url: "ftp://nope" }],
    })
    expect(result.ok).toBe(false)
    expect(result.fieldErrors).toEqual({
      "social.0.url": "Enter an http(s) URL, like https://example.com.",
    })
    expect(await loadBrand(t.payload, asStaff)).toEqual(before)
  })

  it("refuses a visitor, and says so instead of throwing", async () => {
    const before = await loadBrand(t.payload, asStaff)
    const result = await saveBrandAs(t.payload, asVisitor, {
      ...before,
      name: "Hacked",
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
    expect((await loadBrand(t.payload, asStaff)).name).toBe(before.name)
  })
})

describe("the SEO screen's data", () => {
  it("starts with indexing on before anyone has saved", async () => {
    const values = await loadSeo(t.payload, asStaff)
    expect(values.allowIndexing).toBe(true)
    expect(values.description).toBe("")
  })

  it("saves the defaults, including switching indexing off", async () => {
    const result = await saveSeoAs(t.payload, asStaff, {
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
    expect(await loadSeo(t.payload, asStaff)).toEqual(result.values)
  })

  it("keeps the old defaults when the pattern is invalid", async () => {
    const before = await loadSeo(t.payload, asStaff)
    const result = await saveSeoAs(t.payload, asStaff, {
      ...emptySeo,
      titlePattern: "no token",
    })
    expect(result.ok).toBe(false)
    expect(result.fieldErrors).toHaveProperty("titlePattern")
    expect(await loadSeo(t.payload, asStaff)).toEqual(before)
  })

  it("refuses a visitor", async () => {
    const result = await saveSeoAs(t.payload, asVisitor, emptySeo)
    expect(result.ok).toBe(false)
  })
})
