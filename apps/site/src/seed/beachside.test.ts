import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { FetchLike } from "../fonts/googleFonts"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { BEACHSIDE, CLASSIC } from "../theme"
import { runSeed } from "./index"
import { seed as beachside } from "./beachside"
import { createSeeder, seedStaffUser } from "./upsert"

// Integration test: a real Payload on a throwaway database, a fake fetch
// standing in for Google Fonts.

/** The first bytes of a WOFF2 file, as Payload's type detection reads them. */
const WOFF2 = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])

/** A fetch that serves any family's CSS and files, like Google does. */
const googleFetch: FetchLike = async (input) => {
  const url = String(input)
  if (url.startsWith("https://fonts.googleapis.com/css2")) {
    const family = /family=([^:&]+)/.exec(url)![1]!.replaceAll("+", " ")
    const weights = /wght@([\d;]+)/.exec(url)![1]!.split(";").map(Number)
    const slug = family.toLowerCase().replaceAll(" ", "")
    return new Response(
      weights
        .map(
          (weight) => `/* latin */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  src: url(https://fonts.gstatic.com/s/${slug}/v1/${slug}-${weight}.woff2) format('woff2');
}
`
        )
        .join("")
    )
  }
  const file = /-(\d+)\.woff2$/.exec(url)
  if (file) return new Response(Buffer.concat([WOFF2, Buffer.from(file[1]!)]))
  return new Response("Not found", { status: 404 })
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

const counts = async () => {
  const result: Record<string, number> = {}
  for (const collection of [
    "pages",
    "layouts",
    "media",
    "fonts",
    "font-files",
    "users",
  ] as const) {
    result[collection] = (await payload.count({ collection })).totalDocs
  }
  return result
}

const pagesInOrder = async () => {
  const { docs } = await payload.find({
    collection: "pages",
    // The starter Page Templates are Pages too, but not the Site's own.
    where: { isTemplate: { not_equals: true } },
    depth: 0,
    sort: "createdAt",
    pagination: false,
  })
  return docs
}

describe("the Beachside seed", () => {
  it("creates the Site on a first run", async () => {
    const report = await runSeed(payload, {
      module: beachside,
      fetch: googleFetch,
    })
    expect(report.length).toBeGreaterThan(10)

    expect(await counts()).toMatchObject({
      // Its four Pages and the two starter Page Templates.
      pages: 6,
      // Its own, and the Tuck-in starter's.
      layouts: 2,
      media: 7,
      fonts: 2,
      "font-files": 5,
    })
  })

  it("is idempotent: a second run changes nothing", async () => {
    const before = await counts()
    const pages = await pagesInOrder()

    const report = await runSeed(payload, {
      module: beachside,
      fetch: googleFetch,
    })
    expect(report.filter((entry) => entry.action !== "unchanged")).toEqual([])

    expect(await counts()).toEqual(before)
    expect((await pagesInOrder()).map((page) => page.updatedAt)).toEqual(
      pages.map((page) => page.updatedAt)
    )
    const { schemaName } = payload.db as { schemaName?: string }
    const versions = await payload.db.pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM "${schemaName ?? "public"}"."_theme_v"`
    )
    expect(Number(versions.rows[0]!.n)).toBe(1)
  })

  it("stores the Brand, with the SVG wordmark as its logo", async () => {
    const brand = await payload.findGlobal({ slug: "brand", depth: 1 })
    expect(brand.name).toBe("Beachside Vacations")
    expect(brand.tagline).toBeTruthy()
    expect(brand.contact?.phone).toBeTruthy()
    const logo = brand.logo
    expect(typeof logo).toBe("object")
    if (typeof logo !== "object" || logo === null) return
    expect(logo.mimeType).toBe("image/svg+xml")
    expect(logo.filename).toMatch(/\.svg$/)
    expect(logo.alt).toMatch(/Beachside/)
  })

  it("stores SEO, with indexing off for the demo", async () => {
    const seo = await payload.findGlobal({ slug: "seo", depth: 0 })
    expect(seo.titlePattern).toContain("{name}")
    expect(seo.description).toBeTruthy()
    expect(seo.image).toBeTruthy()
    expect(seo.allowIndexing).toBe(false)
  })

  it("stores an attribution on every photo in Media", async () => {
    const { docs } = await payload.find({
      collection: "media",
      depth: 0,
      pagination: false,
    })
    const photos = docs.filter((doc) => doc.mimeType !== "image/svg+xml")
    expect(photos.length).toBeGreaterThanOrEqual(6)
    for (const photo of photos) {
      expect(photo.attribution?.author, photo.filename ?? "").toBeTruthy()
      expect(photo.attribution?.sourceUrl).toMatch(
        /^https:\/\/unsplash\.com\/photos\//
      )
      expect(photo.attribution?.licence).toBe("Unsplash License")
      expect(photo.alt.length).toBeGreaterThan(15)
    }
    const wordmark = docs.find((doc) => doc.mimeType === "image/svg+xml")
    expect(wordmark).toBeDefined()
  })

  it("records an attribution for every photo in seed/beachside", async () => {
    const dir = join(__dirname, "..", "..", "seed", "beachside")
    const attribution = JSON.parse(
      readFileSync(join(dir, "attribution.json"), "utf8")
    ) as Record<string, { author: string; sourceUrl: string }>
    const { docs } = await payload.find({
      collection: "media",
      depth: 0,
      pagination: false,
    })
    for (const doc of docs) {
      if (doc.mimeType === "image/svg+xml") continue
      const entry = attribution[doc.filename!]
      expect(entry, doc.filename ?? "").toBeDefined()
      expect(doc.attribution?.author).toBe(entry!.author)
      expect(doc.attribution?.sourceUrl).toBe(entry!.sourceUrl)
    }
  })

  it("wears the Beachside preset, in the Fraunces and Nunito Sans it stored", async () => {
    const theme = await payload.findGlobal({ slug: "theme", depth: 0 })
    const fonts = await payload.find({
      collection: "fonts",
      depth: 0,
      pagination: false,
    })
    const key = (family: string) =>
      `font:${fonts.docs.find((font) => font.family === family)!.id}`
    expect(fonts.docs.map((font) => font.family).sort()).toEqual([
      "Fraunces",
      "Nunito Sans",
    ])
    expect(theme).toMatchObject({
      primary: BEACHSIDE.inputs.primary,
      accent: BEACHSIDE.inputs.accent,
      third: BEACHSIDE.inputs.third,
      text: BEACHSIDE.inputs.text,
      darkSurface: BEACHSIDE.inputs.darkSurface,
      buttonCorners: "pill",
      cardCorners: "rounded",
      spacing: "spacious",
      shadows: "subtle",
      motion: "lively",
      headingFont: key("Fraunces"),
      bodyFont: key("Nunito Sans"),
    })
  })

  it("has the four Pages, with the Blocks the brand calls for, in order", async () => {
    const pages = await pagesInOrder()
    const summary = pages.map((page) => ({
      title: page.title,
      path: page.path,
      status: page._status,
      blocks: (page.blocks ?? []).map((block) => block.blockType),
    }))
    expect(summary).toEqual([
      {
        title: "Home",
        path: "/",
        status: "published",
        blocks: [
          "searchHero",
          "featuredRentals",
          "amenities",
          "testimonials",
          "newsletter",
        ],
      },
      {
        title: "Rentals",
        path: "/rentals",
        status: "published",
        blocks: ["rentalGrid", "faq"],
      },
      {
        title: "Owners",
        path: "/owners",
        status: "published",
        blocks: ["hero", "steps", "stats", "ownerBand", "faq", "form"],
      },
      {
        title: "Contact",
        path: "/contact",
        status: "published",
        blocks: ["location", "form"],
      },
    ])
    for (const page of pages) {
      expect(page.seo?.description, `${page.title} description`).toBeTruthy()
    }
  })

  it("shows its photos in the Blocks: the Search Hero and the Amenities mosaic", async () => {
    const { docs } = await payload.find({
      collection: "pages",
      where: { path: { equals: "/" } },
      depth: 0,
    })
    const blocks = docs[0]!.blocks ?? []
    const hero = blocks.find((block) => block.blockType === "searchHero")
    const amenities = blocks.find((block) => block.blockType === "amenities")
    expect(hero?.blockType === "searchHero" && hero.image).toBeTruthy()
    expect(amenities?.blockType === "amenities" && amenities.variant).toBe(
      "mosaic"
    )
    if (amenities?.blockType === "amenities") {
      expect(amenities.items.every((item) => item.image)).toBe(true)
    }
  })

  it("has a default Layout whose menu links to every other Page", async () => {
    const { docs: layouts } = await payload.find({
      collection: "layouts",
      // Not the Tuck-in starter's Layout.
      where: { isDefault: { equals: true } },
      depth: 0,
      pagination: false,
    })
    expect(layouts).toHaveLength(1)
    const layout = layouts[0]!
    expect(layout.isDefault).toBe(true)
    expect(layout.header?.map((block) => block.blockType)).toEqual([
      "logo",
      "navigation",
      "headerActions",
    ])

    const pages = await pagesInOrder()
    const navigation = layout.header?.find(
      (block) => block.blockType === "navigation"
    )
    const linked =
      navigation?.blockType === "navigation"
        ? (navigation.items ?? []).map((item) => item.link?.page)
        : []
    for (const page of pages.filter((p) => p.path !== "/")) {
      expect(linked, `the menu links to ${page.title}`).toContain(page.id)
    }
  })
})
