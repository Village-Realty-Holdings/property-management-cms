import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { FetchLike } from "../fonts/googleFonts"
import type { Layout, Page } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { AVADA, CLASSIC } from "../theme"
import { readLiveTheme } from "../theme/record"
import { seed as avadaSeed } from "./avada"
import { runSeed, seedModuleFor } from "./index"
import { createSeeder, seedStaffUser } from "./upsert"

// Integration test: a real Payload on a throwaway database, a fake fetch
// standing in for Google, and the real Avada seed with its real photos.

const SEED_DIR = fileURLToPath(new URL("../../seed/avada", import.meta.url))

const WOFF2 = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])
const GSTATIC = "https://fonts.gstatic.com/s/montserrat/v30"
const face = (weight: number) => `/* latin */
@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: ${weight};
  src: url(${GSTATIC}/m-${weight}.woff2) format('woff2');
}
`

/** A fetch that serves Montserrat and counts the requests. */
function googleFetch() {
  const requests: string[] = []
  const fetch: FetchLike = async (input) => {
    const url = String(input)
    requests.push(url)
    if (url.startsWith("https://fonts.googleapis.com/css2")) {
      expect(url).toContain("family=Montserrat")
      const weights = /wght@([\d;]+)/.exec(url)![1]!.split(";").map(Number)
      return new Response(weights.map(face).join(""))
    }
    const file = /m-(\d+)\.woff2$/.exec(url)
    if (file) {
      return new Response(Buffer.concat([WOFF2, Buffer.from(file[1]!)]))
    }
    return new Response("Not found", { status: 404 })
  }
  return { fetch, requests }
}

let t: TestPayload
let payload: Payload

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
})

afterAll(async () => {
  try {
    // A Font the live Theme uses can't be deleted: put Classic back first.
    const seeder = createSeeder(payload, await seedStaffUser(payload))
    await seeder.theme(CLASSIC.inputs)
    for (const collection of ["media", "fonts", "font-files"] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
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

/** Row counts of everything the seed writes, each version table, and stamps. */
async function snapshot() {
  const counts: Record<string, number> = {}
  for (const collection of COLLECTIONS) {
    counts[collection] = (await payload.count({ collection })).totalDocs
  }
  const { schemaName } = payload.db as { schemaName?: string }
  for (const [key, table] of [
    ["pages versions", "_pages_v"],
    ["layouts versions", "_layouts_v"],
    ["theme versions", "_theme_v"],
  ] as const) {
    const result = await payload.db.pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM "${schemaName ?? "public"}"."${table}"`
    )
    counts[key] = Number(result.rows[0]!.n)
  }
  const stamps = async (collection: "pages" | "layouts" | "media") =>
    (
      await payload.find({
        collection,
        depth: 0,
        sort: "id",
        pagination: false,
      })
    ).docs.map((doc) => doc.updatedAt)
  return {
    counts,
    brand: (await payload.findGlobal({ slug: "brand", depth: 0 })).updatedAt,
    seo: (await payload.findGlobal({ slug: "seo", depth: 0 })).updatedAt,
    pages: await stamps("pages"),
    layouts: await stamps("layouts"),
    media: await stamps("media"),
  }
}

async function pages() {
  return (
    await payload.find({
      collection: "pages",
      // The starter Page Templates are Pages too, but not the Site's own.
      where: { isTemplate: { not_equals: true } },
      depth: 0,
      sort: "id",
      pagination: false,
    })
  ).docs
}

const blockTypes = (page: Page) => (page.blocks ?? []).map((b) => b.blockType)

describe("the Avada seed", () => {
  it("is the seed of the avada schema", () => {
    expect(seedModuleFor("avada")).toBe(avadaSeed)
  })

  it("creates the Brand, SEO, Theme, Font, Media, Layout and Pages on a first run", async () => {
    const { fetch, requests } = googleFetch()
    await runSeed(payload, { module: avadaSeed, fetch })

    const brand = await payload.findGlobal({
      slug: "brand",
      depth: 1,
    })
    expect(brand.name).toBe("Avada Properties")
    expect(brand.contact?.phone).toBe("865-390-2860")
    expect(brand.contact?.email).toBe("booking@avadaproperties.com")
    expect(brand.contact?.address).toContain("Sevierville, TN 37862")
    expect(typeof brand.logo === "object" && brand.logo?.alt).toMatch(/Avada/)

    const seo = await payload.findGlobal({ slug: "seo", depth: 0 })
    expect(seo.titlePattern).toContain("%s")
    expect(seo.description).toBeTruthy()

    // The Theme is the AVADA preset, in Montserrat from Google Fonts.
    const theme = await readLiveTheme(payload)
    expect(theme.source).toBe("saved")
    expect(theme.inputs.primary).toBe("#ce4b25")
    expect(theme.inputs).toEqual({
      ...AVADA.inputs,
      headingFont: theme.inputs.headingFont,
      bodyFont: theme.inputs.bodyFont,
    })
    const fonts = await payload.find({ collection: "fonts", depth: 0 })
    expect(fonts.docs.map((font) => font.family)).toEqual(["Montserrat"])
    const montserrat = fonts.docs[0]!
    expect(theme.inputs.headingFont).toBe(`font:${montserrat.id}`)
    expect(theme.inputs.bodyFont).toBe(`font:${montserrat.id}`)
    expect(montserrat.files.length).toBeGreaterThan(0)
    expect(requests.some((url) => url.includes("family=Montserrat"))).toBe(true)
  })

  it("makes five Published Pages a visitor can read, in the spec's order", async () => {
    const visitor = await payload.find({
      collection: "pages",
      sort: "id",
      pagination: false,
      overrideAccess: false,
      user: null,
    })
    expect(visitor.docs.map((page) => page.title)).toEqual([
      "Home",
      "Search",
      "Owners",
      "About",
      "Contact",
    ])
    expect(visitor.docs.map((page) => page.path)).toEqual([
      "/",
      "/search",
      "/owners",
      "/about",
      "/contact",
    ])
    for (const page of visitor.docs) {
      expect(page._status, page.title).toBe("published")
      expect(page.seo?.description, `${page.title} description`).toBeTruthy()
      expect(page.blocks?.length, `${page.title} blocks`).toBeGreaterThan(0)
    }
  })

  it("gives Home the real sections in the real order, and Search the Rental grid", async () => {
    const byTitle = new Map((await pages()).map((page) => [page.title, page]))
    expect(blockTypes(byTitle.get("Home")!)).toEqual([
      "searchHero",
      "trustStrip",
      "featuredRentals",
      "steps",
      "imageText",
      "features",
      "ownerBand",
      "testimonials",
      "callToAction",
      "newsletter",
    ])
    const home = byTitle.get("Home")!
    const [hero] = home.blocks ?? []
    expect(hero).toMatchObject({
      blockType: "searchHero",
      heading: "Find your Smoky Mountain stay",
      accentWord: "Smoky Mountain",
    })
    expect(blockTypes(byTitle.get("Search")!)).toContain("rentalGrid")
    expect(blockTypes(byTitle.get("Owners")!)).toEqual(
      expect.arrayContaining(["hero", "features", "steps", "faq"])
    )
    expect(blockTypes(byTitle.get("Contact")!)).toContain("form")
  })

  it("uses the real copy", async () => {
    const all = JSON.stringify(await pages())
    for (const line of [
      "Featured Smoky Mountain Rentals",
      "Book in Three Steps",
      "Close to What Matters",
      "Built Around the Guest Experience",
      "Own a Smoky Mountain Rental?",
      "What Guests Are Saying",
      "Subscribe to our emails",
      "Property Management for Smoky Mountain Rentals",
      "Common Questions From Property Owners",
      "Helping Guests and Owners Feel at Home in the Smokies",
      "Questions About a Stay or Your Smoky Mountain Rental?",
    ]) {
      expect(all, line).toContain(line)
    }
  })

  it("makes one default Layout whose Navigation links every other Page", async () => {
    const { docs: layouts } = await payload.find({
      collection: "layouts",
      depth: 0,
      pagination: false,
    })
    const defaults = layouts.filter((layout) => layout.isDefault)
    expect(defaults).toHaveLength(1)
    const layout: Layout = defaults[0]!
    expect(layout.header?.map((b) => b.blockType)).toEqual(
      expect.arrayContaining(["logo", "navigation", "headerActions"])
    )
    expect(layout.footer?.map((b) => b.blockType)).toContain("footerColumns")

    const linked = new Set<number>()
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(collect)
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>
        if (record.type === "page" && typeof record.page === "number") {
          linked.add(record.page)
        }
        Object.values(record).forEach(collect)
      }
    }
    collect(layout.header)
    collect(layout.footer)
    for (const page of (await pages()).filter((p) => p.title !== "Home")) {
      expect(linked.has(page.id), `a link to ${page.title}`).toBe(true)
    }
  })

  it("has the logo and photos in Media, and never the Shutterstock photo or the fixture Rentals", async () => {
    const { docs } = await payload.find({
      collection: "media",
      depth: 0,
      pagination: false,
    })
    const names = docs.map((media) => media.filename)
    expect(names).toContain("avada-logo.png")
    expect(names.length).toBeGreaterThan(3)
    for (const media of docs) {
      expect(media.alt, media.filename ?? "").toBeTruthy()
    }
    expect(
      names.filter((name) => /^(rental-|hero-sunrise)/.test(name!))
    ).toEqual([])
    // Not even under another name: no seed file has the banned photo's bytes
    // (research/brands/avada/photos/hero-sunrise-smokies.webp, Shutterstock
    // file 761073268).
    const SHUTTERSTOCK_SHA256 =
      "3ccefbfe790a89ae71e67a1f2bfd1a8a8b01be4e4ed5cab44ff055eaefd85b11"
    const hashes = readdirSync(SEED_DIR).map((file) =>
      createHash("sha256")
        .update(readFileSync(path.join(SEED_DIR, file)))
        .digest("hex")
    )
    expect(hashes).not.toContain(SHUTTERSTOCK_SHA256)
  })

  it("changes nothing on a second or third run, and downloads no Font again", async () => {
    const before = await snapshot()
    const { fetch, requests } = googleFetch()

    const second = await runSeed(payload, { module: avadaSeed, fetch })
    await runSeed(payload, { module: avadaSeed, fetch })

    expect(second.filter((entry) => entry.action !== "unchanged")).toEqual([])
    expect(await snapshot()).toEqual(before)
    expect(requests).toEqual([])
  })
})
