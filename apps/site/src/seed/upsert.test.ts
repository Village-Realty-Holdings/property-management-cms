import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { FetchLike } from "../fonts/googleFonts"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { CLASSIC } from "../theme"
import { runSeed, seedModuleFor, type SeedModule } from "./index"
import { createSeeder, sameData, seedUser } from "./upsert"

// Integration test: a real Payload on a throwaway database, a fake fetch
// standing in for Google, and a tiny sample seed that uses every helper.

describe("sameData", () => {
  it("compares only what the seed sets", () => {
    expect(sameData({ a: 1, b: 2, id: 9 }, { a: 1 })).toBe(true)
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false)
    expect(sameData({ a: 1 }, { a: 1, b: "x" })).toBe(false)
  })

  it("treats null, undefined and a missing key as the same", () => {
    expect(sameData({ a: null }, { a: undefined })).toBe(true)
    expect(sameData({}, { a: null })).toBe(true)
    expect(sameData({ a: "x" }, { a: null })).toBe(false)
  })

  it("ignores the ids Payload gives array rows and Blocks", () => {
    expect(
      sameData(
        { blocks: [{ id: "x", blockType: "hero", heading: "Hi" }] },
        { blocks: [{ blockType: "hero", heading: "Hi" }] }
      )
    ).toBe(true)
  })

  it("sees a different number or order of rows", () => {
    expect(sameData({ rows: [{ n: 1 }] }, { rows: [{ n: 1 }, { n: 2 }] })).toBe(
      false
    )
    expect(sameData({ rows: [{ n: 1 }, { n: 2 }] }, { rows: [{ n: 1 }] })).toBe(
      false
    )
    expect(
      sameData({ rows: [{ n: 1 }, { n: 2 }] }, { rows: [{ n: 2 }, { n: 1 }] })
    ).toBe(false)
  })

  it("an empty list matches a missing one", () => {
    expect(sameData({}, { rows: [] })).toBe(true)
    expect(sameData({ rows: null }, { rows: [] })).toBe(true)
  })
})

/** The first bytes of a WOFF2 file, as Payload's type detection reads them. */
const WOFF2 = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])
const GSTATIC = "https://fonts.gstatic.com/s/robotoslab/v34"
const face = (weight: number) => `/* latin */
@font-face {
  font-family: 'Roboto Slab';
  font-style: normal;
  font-weight: ${weight};
  src: url(${GSTATIC}/rs-${weight}.woff2) format('woff2');
}
`

/** A fetch that serves Roboto Slab, and counts the requests. */
function googleFetch() {
  const requests: string[] = []
  const fetch: FetchLike = async (input) => {
    const url = String(input)
    requests.push(url)
    if (url.startsWith("https://fonts.googleapis.com/css2")) {
      const weights = /wght@([\d;]+)/.exec(url)![1]!.split(";").map(Number)
      return new Response(weights.map(face).join(""))
    }
    const file = /rs-(\d+)\.woff2$/.exec(url)
    if (file) {
      return new Response(Buffer.concat([WOFF2, Buffer.from(file[1]!)]))
    }
    return new Response("Not found", { status: 404 })
  }
  return { fetch, requests }
}

/** A 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let t: TestPayload
let payload: Payload
let dir: string
let logo: string

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  dir = mkdtempSync(path.join(tmpdir(), "seed-upsert-"))
  logo = path.join(dir, "seed-logo.png")
  writeFileSync(logo, PNG)
})

afterAll(async () => {
  try {
    // Removes the uploaded files from local disk too. The Theme uses a Font,
    // and a Font the live Theme uses can't be deleted: put Classic back first.
    const seeder = createSeeder(payload, await seedUser(payload))
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
    rmSync(dir, { recursive: true, force: true })
    await t?.teardown()
  }
})

/** A small Site: one of everything the seed framework makes. */
const sample: SeedModule = async (seed) => {
  const font = await seed.font({
    family: "Roboto Slab",
    kind: "slab",
    weights: [400, 700],
  })
  const logoMedia = await seed.media({
    file: logo,
    alt: "Sample logo",
    credit: "Sample",
  })
  await seed.brand({
    name: "Sample Rentals",
    tagline: "A sample",
    logo: logoMedia.id,
    contact: { phone: "+1 555 010 0100", email: "hi@sample.test" },
    social: [{ platform: "facebook", url: "https://facebook.com/sample" }],
  })
  await seed.seo({
    titlePattern: "%s · {name}",
    description: "A sample Site.",
    image: logoMedia.id,
    allowIndexing: false,
  })
  await seed.theme({ ...CLASSIC.inputs, headingFont: `font:${font.id}` })
  await seed.layout({
    name: "Default",
    isDefault: true,
    header: [{ blockType: "utilityStrip", text: "Sample offer", links: [] }],
  })
  await seed.layout({
    name: "Owners",
    paths: [{ path: "/owners" }],
    header: [{ blockType: "utilityStrip", text: "For owners", links: [] }],
  })
  await seed.page({
    path: "/",
    title: "Home",
    blocks: [
      {
        blockType: "hero",
        heading: "Welcome",
        image: logoMedia.id,
        cta: { label: "Book", href: "/rentals" },
      },
    ],
    seo: { title: "Home", description: "The home page" },
  })
  await seed.page({
    path: "/owners",
    title: "Owners",
    blocks: [{ blockType: "hero", heading: "Owners" }],
  })
}

const COLLECTIONS = [
  "pages",
  "layouts",
  "media",
  "fonts",
  "font-files",
  "users",
] as const

/** Row counts of everything the seed writes, and each version table. */
async function snapshot() {
  const counts: Record<string, number> = {}
  for (const collection of COLLECTIONS) {
    counts[collection] = (await payload.count({ collection })).totalDocs
  }
  for (const [key, table] of [
    ["pages versions", "_pages_v"],
    ["layouts versions", "_layouts_v"],
    ["theme versions", "_theme_v"],
  ] as const) {
    const { schemaName } = payload.db as { schemaName?: string }
    const result = await payload.db.pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM "${schemaName ?? "public"}"."${table}"`
    )
    counts[key] = Number(result.rows[0]!.n)
  }
  const brand = await payload.findGlobal({ slug: "brand", depth: 0 })
  const seo = await payload.findGlobal({ slug: "seo", depth: 0 })
  const layouts = await payload.find({
    collection: "layouts",
    depth: 0,
    sort: "name",
    pagination: false,
  })
  const pages = await payload.find({
    collection: "pages",
    depth: 0,
    sort: "path",
    pagination: false,
  })
  return {
    counts,
    brandUpdatedAt: brand.updatedAt,
    seoUpdatedAt: seo.updatedAt,
    layoutUpdatedAt: layouts.docs.map((doc) => doc.updatedAt),
    pageUpdatedAt: pages.docs.map((doc) => doc.updatedAt),
  }
}

describe("a sample seed", () => {
  it("creates everything on a first run", async () => {
    const { fetch } = googleFetch()
    await runSeed(payload, { module: sample, fetch })

    const after = await snapshot()
    expect(after.counts).toMatchObject({
      // The sample's two Pages and the three starter Page Templates.
      pages: 5,
      // The sample's two, and the Tuck-in and Guest feedback survey starters'.
      layouts: 4,
      media: 1,
      fonts: 1,
      "font-files": 2,
      users: 1,
    })
    expect(after.counts["theme versions"]).toBe(1)

    const brand = await payload.findGlobal({ slug: "brand", depth: 0 })
    expect(brand.name).toBe("Sample Rentals")
    // Every Site gets the starter Page Templates, as Drafts.
    const templates = await payload.find({
      collection: "pages",
      where: { isTemplate: { equals: true } },
      sort: "path",
      depth: 0,
    })
    expect(templates.docs.map((page) => [page.path, page._status])).toEqual([
      ["/templates/guest-feedback-survey", "draft"],
      ["/templates/home", "draft"],
      ["/templates/tuck-in", "draft"],
    ])
    // Tuck-in is two Containers, each a Rich text with its Button.
    const tuckIn = templates.docs[2]!.blocks!.map((block) => [
      block.blockType,
      ...(block.blockType === "container"
        ? (block.children ?? []).map((child) => child.blockType)
        : []),
    ])
    expect(tuckIn).toEqual([
      ["container", "richText", "button"],
      ["container", "richText", "button"],
    ])
    const home = await payload.find({
      collection: "pages",
      where: { path: { equals: "/" } },
      overrideAccess: false,
      user: null,
    })
    // Published: a visitor can read it.
    expect(home.docs).toHaveLength(1)
    expect(home.docs[0]!._status).toBe("published")
    const defaults = await payload.find({
      collection: "layouts",
      where: { isDefault: { equals: true } },
    })
    expect(defaults.docs.map((doc) => doc.name)).toEqual(["Default"])
  })

  it("leaves identical row counts and no new versions on a second run", async () => {
    const before = await snapshot()
    const { fetch, requests } = googleFetch()

    await runSeed(payload, { module: sample, fetch })
    await runSeed(payload, { module: sample, fetch })

    expect(await snapshot()).toEqual(before)
    // A Font already stored is not downloaded again.
    expect(requests).toEqual([])
  })

  it("changes only what the seed now says differently", async () => {
    const { fetch } = googleFetch()
    const before = await snapshot()
    await runSeed(payload, {
      module: async (seed) => {
        await sample(seed)
        await seed.layout({
          name: "Owners",
          paths: [{ path: "/owners" }],
          header: [
            { blockType: "utilityStrip", text: "Owners, welcome", links: [] },
          ],
        })
      },
      fetch,
    })
    const after = await snapshot()
    expect(after.counts["layouts"]).toBe(before.counts["layouts"])
    expect(after.counts["layouts versions"]).toBe(
      before.counts["layouts versions"]! + 1
    )
    expect(after.counts["pages versions"]).toBe(before.counts["pages versions"])
    expect(after.counts["theme versions"]).toBe(before.counts["theme versions"])
  })

  it("reuses the seed User", async () => {
    const first = await seedUser(payload)
    const second = await seedUser(payload)
    expect(second.id).toBe(first.id)
    expect(first.collection).toBe("users")
  })
})

describe("the seed helpers", () => {
  it("names a Font's key for the Theme", async () => {
    const seeder = createSeeder(payload, await seedUser(payload))
    const font = await seeder.font({
      family: "Roboto Slab",
      kind: "slab",
      weights: [400],
    })
    expect(await seeder.fontKey("Roboto Slab")).toBe(`font:${font.id}`)
    await expect(seeder.fontKey("Nope Sans")).rejects.toThrow(/Nope Sans/)
  })

  it("keeps a Media row for a file name and does not upload it again", async () => {
    const seeder = createSeeder(payload, await seedUser(payload))
    const first = await seeder.media({ file: logo, alt: "Sample logo" })
    const second = await seeder.media({ file: logo, alt: "New alt text" })
    expect(second.id).toBe(first.id)
    const found = await payload.findByID({ collection: "media", id: first.id })
    // The alt text follows the seed; the file is stored once.
    expect(found.alt).toBe("New alt text")
    expect((await payload.count({ collection: "media" })).totalDocs).toBe(1)
  })

  it("keeps one row when a file of that name is already in the media folder", async () => {
    // What a dropped and recreated schema leaves: the uploaded file is still
    // in media/<schema>/, but no row names it. Payload would store the next
    // upload as "<name>-1.png", and every reseed would add another copy.
    const { staticDir } = payload.collections.media.config.upload
    const folder = path.resolve(staticDir || "media")
    const name = "seed-leftover.png"
    const file = path.join(dir, name)
    writeFileSync(file, PNG)
    mkdirSync(folder, { recursive: true })
    copyFileSync(file, path.join(folder, name))

    const seeder = createSeeder(payload, await seedUser(payload))
    const before = (await payload.count({ collection: "media" })).totalDocs
    const first = await seeder.media({ file, alt: "Leftover" })
    const second = await seeder.media({ file, alt: "Leftover" })

    expect(first.action).toBe("created")
    expect(first.doc.filename).toBe(name)
    expect(second.action).toBe("unchanged")
    expect(second.id).toBe(first.id)
    expect((await payload.count({ collection: "media" })).totalDocs).toBe(
      before + 1
    )
    expect(existsSync(path.join(folder, name))).toBe(true)
    expect(existsSync(path.join(folder, "seed-leftover-1.png"))).toBe(false)
  })
})

describe("the seed modules", () => {
  it("has one for each of the three Sites, chosen by schema", () => {
    for (const schema of ["warren_beach", "avada", "beachside"]) {
      expect(typeof seedModuleFor(schema)).toBe("function")
    }
  })

  it("refuses a schema that has no seed", () => {
    expect(() => seedModuleFor("public")).toThrow(/warren_beach/)
    expect(() => seedModuleFor("ms_other")).toThrow(/no seed/i)
  })
})
