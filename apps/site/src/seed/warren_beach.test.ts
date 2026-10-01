import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { FetchLike } from "../fonts/googleFonts"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { CLASSIC, WARREN_BEACH } from "../theme"
import { readLiveTheme } from "../theme/record"
import { runSeed } from "./index"
import { createSeeder, seedStaffUser } from "./upsert"
import { seed as warrenBeach } from "./warren_beach"

// Integration test: a real Payload on a throwaway database, a fake fetch
// standing in for Google, and the real Warren Beach seed run twice.

/** The first bytes of a WOFF2 file, as Payload's type detection reads them. */
const WOFF2 = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])

/** A fetch that serves any family's weights as tiny WOFF2 files. */
function googleFetch() {
  const requested: string[] = []
  const fetch: FetchLike = async (input) => {
    const url = String(input)
    if (url.startsWith("https://fonts.googleapis.com/css2")) {
      const family = /family=([^:&]+)/.exec(url)![1]!
      requested.push(decodeURIComponent(family.replaceAll("+", " ")))
      const weights = /wght@([\d;]+)/.exec(url)![1]!.split(";").map(Number)
      return new Response(
        weights
          .map(
            (weight) => `/* latin */
@font-face {
  font-family: '${decodeURIComponent(family.replaceAll("+", " "))}';
  font-style: normal;
  font-weight: ${weight};
  src: url(https://fonts.gstatic.com/s/${family}/${weight}.woff2) format('woff2');
}
`
          )
          .join("")
      )
    }
    if (url.startsWith("https://fonts.gstatic.com/")) {
      return new Response(Buffer.concat([WOFF2, Buffer.from(url)]))
    }
    return new Response("Not found", { status: 404 })
  }
  return { fetch, requested }
}

let t: TestPayload
let payload: Payload
const google = googleFetch()

beforeAll(async () => {
  t = await getTestPayload({ seedDefaultLayout: false })
  payload = t.payload
}, 120_000)

afterAll(async () => {
  try {
    // Removes the uploaded files from local disk too. The Theme uses Fonts,
    // and a Font the live Theme uses can't be deleted: put Classic back first.
    const seeder = createSeeder(payload, await seedStaffUser(payload))
    await seeder.theme(CLASSIC.inputs)
    await payload.delete({
      collection: "media",
      where: { id: { exists: true } },
    })
    await payload.delete({
      collection: "fonts",
      where: { id: { exists: true } },
    })
    await payload.delete({
      collection: "font-files",
      where: { id: { exists: true } },
    })
  } finally {
    await t?.teardown()
  }
})

const COLLECTIONS = [
  "pages",
  "layouts",
  "media",
  "fonts",
  "font-files",
  "users",
] as const

async function counts() {
  const result: Record<string, number> = {}
  for (const collection of COLLECTIONS) {
    result[collection] = (await payload.count({ collection })).totalDocs
  }
  const { schemaName } = payload.db as { schemaName?: string }
  for (const [key, table] of [
    ["pages versions", "_pages_v"],
    ["layouts versions", "_layouts_v"],
    ["theme versions", "_theme_v"],
  ] as const) {
    const rows = await payload.db.pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM "${schemaName ?? "public"}"."${table}"`
    )
    result[key] = Number(rows.rows[0]!.n)
  }
  return result
}

describe("the Warren Beach seed", () => {
  let first: Awaited<ReturnType<typeof runSeed>>
  let afterFirst: Awaited<ReturnType<typeof counts>>

  beforeAll(async () => {
    first = await runSeed(payload, { module: warrenBeach, fetch: google.fetch })
    afterFirst = await counts()
  }, 240_000)

  it("creates the four Pages, Published, at their paths", async () => {
    const { docs } = await payload.find({
      collection: "pages",
      draft: false,
      depth: 0,
      sort: "path",
      pagination: false,
    })
    expect(docs.map((page) => [page.path, page.title, page._status])).toEqual([
      ["/", "Home", "published"],
      ["/contact", "Contact", "published"],
      ["/owners", "Owners", "published"],
      ["/rentals", "Rentals", "published"],
    ])
    for (const page of docs) {
      expect(page.blocks?.length, `${page.path} has Blocks`).toBeGreaterThan(0)
    }
  })

  it("builds Home from the real sections, in the real order", async () => {
    const home = await payload.find({
      collection: "pages",
      where: { path: { equals: "/" } },
      draft: false,
      depth: 0,
    })
    expect(home.docs[0]!.blocks?.map((block) => block.blockType)).toEqual([
      "searchHero",
      "featuredRentals",
      "amenities",
      "largeGroupRentals",
      "newsletter",
    ])
  })

  it("carries the Brand, with its logo and real phone number", async () => {
    const brand = await payload.findGlobal({ slug: "brand", depth: 1 })
    expect(brand.name).toBe("Warren Beach Rentals")
    expect(brand.contact?.phone).toBe("(850) 231-0835")
    expect(brand.contact?.address).toContain("169 Griffin Blvd")
    expect(brand.social?.map((link) => link.platform)).toEqual([
      "facebook",
      "instagram",
    ])
    const logo = brand.logo
    expect(typeof logo === "object" && logo?.alt).toMatch(/Warren Beach/)
  })

  it("has SEO with a description and a share image", async () => {
    const seo = await payload.findGlobal({ slug: "seo", depth: 0 })
    expect(seo.description).toBeTruthy()
    expect(seo.titlePattern).toContain("%s")
    expect(seo.image).toBeTruthy()
  })

  it("imports Source Sans 3, Lora and Work Sans as stored Fonts", async () => {
    const { docs } = await payload.find({
      collection: "fonts",
      depth: 0,
      pagination: false,
    })
    expect(docs.map((font) => font.family).sort()).toEqual([
      "Lora",
      "Source Sans 3",
      "Work Sans",
    ])
    for (const font of docs) expect(font.files?.length).toBeGreaterThan(0)
  })

  it("wears the Warren Beach preset, in the stored Source Sans 3", async () => {
    const source = await payload.find({
      collection: "fonts",
      where: { family: { equals: "Source Sans 3" } },
      depth: 0,
    })
    const key = `font:${source.docs[0]!.id}`
    const theme = await readLiveTheme(payload)
    expect(theme.source).toBe("saved")
    expect(theme.inputs).toEqual({
      ...WARREN_BEACH.inputs,
      headingFont: key,
      bodyFont: key,
    })
  })

  it("uploads the logo and photos, but not the rental photos", async () => {
    const { docs } = await payload.find({
      collection: "media",
      depth: 0,
      pagination: false,
    })
    const names = docs.map((media) => media.filename)
    expect(names).toContain("WARRENgroupLogoFINAL.webp")
    expect(names).toContain("hero-beach-panama-city.webp")
    expect(names.filter((name) => name?.startsWith("rental-"))).toEqual([])
    for (const media of docs) expect(media.alt, media.filename!).toBeTruthy()
  })

  it("makes a default Layout whose Navigation links to the Pages", async () => {
    const layouts = await payload.find({
      collection: "layouts",
      depth: 0,
      pagination: false,
    })
    expect(layouts.docs).toHaveLength(1)
    const layout = layouts.docs[0]!
    expect(layout.isDefault).toBe(true)

    const pages = await payload.find({
      collection: "pages",
      draft: false,
      depth: 0,
      pagination: false,
    })
    const idOf = (path: string) => pages.docs.find((p) => p.path === path)!.id

    const navigation = layout.header?.find(
      (block) => block.blockType === "navigation"
    )
    expect(navigation, "a Navigation in the Header").toBeDefined()
    const linked = new Set<number>()
    const visit = (link?: { type?: string | null; page?: unknown } | null) => {
      if (link?.type === "page" && typeof link.page === "number") {
        linked.add(link.page)
      }
    }
    for (const item of navigation!.items ?? []) {
      visit(item.link)
      for (const child of item.children ?? []) visit(child.link)
    }
    for (const path of ["/rentals", "/owners", "/contact"]) {
      expect(linked, `the Navigation links to ${path}`).toContain(idOf(path))
    }

    expect(layout.header?.map((block) => block.blockType)).toEqual(
      expect.arrayContaining(["logo", "navigation", "headerActions"])
    )
    expect(layout.footer?.map((block) => block.blockType)).toEqual(
      expect.arrayContaining(["footerColumns", "legalBar"])
    )
  })

  it("adds nothing, and rewrites nothing, when it runs again", async () => {
    const second = await runSeed(payload, {
      module: warrenBeach,
      fetch: google.fetch,
    })
    expect(await counts()).toEqual(afterFirst)
    expect(
      second.filter((entry) => entry.action !== "unchanged"),
      "records the second run wrote"
    ).toEqual([])
    expect(second.map(({ kind, key }) => `${kind}:${key}`)).toEqual(
      first.map(({ kind, key }) => `${kind}:${key}`)
    )
  }, 240_000)
})
