import type { Payload } from "payload"
import {
  afterAll,
  afterEach,
  beforeEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { Media, User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { truncateTables } from "../test/truncateTables"
import { resolveBrand } from "./brand"
import { siteThemeCss } from "./themeStyle"
import { CLASSIC, HARBOUR } from "../theme"
import { restoreThemeVersion, saveTheme } from "../theme/record"
import {
  readBrand,
  readLayoutFor,
  readLayouts,
  readPublishedPages,
  readSeo,
  readSiteTheme,
} from "./read"
import { hrefOf, linksOf } from "./regions/links"
import {
  pageMetadata,
  resolveSeo,
  robotsFor,
  siteMetadata,
  sitemapFor,
} from "./seo"

const baseUrl = "https://example.com"

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let t: TestPayload
let payload: Payload
let testUser: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  testUser = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
})

afterAll(async () => {
  // Removes the uploaded files from local disk too.
  await payload?.delete({
    collection: "media",
    where: { id: { exists: true } },
  })
  await t?.teardown()
})

const asUser = () => ({
  overrideAccess: false as const,
  user: { ...testUser, collection: "users" as const },
})

async function upload(name: string, alt: string): Promise<Media> {
  return payload.create({
    collection: "media",
    data: { alt },
    file: {
      data: PNG,
      mimetype: "image/png",
      name: `${name}-${Date.now()}.png`,
      size: PNG.length,
    },
    ...asUser(),
  })
}

describe("a Site whose Brand and SEO were never saved", () => {
  it("still has metadata, robots and a sitemap", async () => {
    const brand = resolveBrand(await readBrand(payload))
    const seo = resolveSeo(await readSeo(payload))
    expect(brand.name).toBe("Awayday")
    expect(seo.allowIndexing).toBe(true)
    expect(siteMetadata({ brand, seo, baseUrl }).title).toEqual({
      absolute: "Awayday",
    })
    expect(robotsFor(seo, baseUrl).sitemap).toBe(`${baseUrl}/sitemap.xml`)
    expect(sitemapFor(seo, await readPublishedPages(payload), baseUrl)).toEqual(
      []
    )
  })
})

describe("the sitemap", () => {
  it("lists only Published Pages, as absolute URLs", async () => {
    await payload.create({
      collection: "pages",
      data: { title: "Home", path: "/", _status: "published" },
      ...asUser(),
    })
    await payload.create({
      collection: "pages",
      data: { title: "About", path: "/about", _status: "published" },
      ...asUser(),
    })
    await payload.create({
      collection: "pages",
      data: { title: "Secret", path: "/secret", _status: "draft" },
      draft: true,
      ...asUser(),
    })

    const urls = sitemapFor(
      resolveSeo(await readSeo(payload)),
      await readPublishedPages(payload),
      baseUrl
    ).map((entry) => entry.url)
    expect(urls).toEqual(["https://example.com/", "https://example.com/about"])
  })
})

describe("SEO read as a visitor", () => {
  it("resolves the favicon and share image from Media", async () => {
    const favicon = await upload("favicon", "Icon")
    const share = await upload("share", "Beach at dusk")
    await payload.updateGlobal({
      slug: "brand",
      data: { name: "Warren Beach" },
      ...asUser(),
    })
    await payload.updateGlobal({
      slug: "seo",
      data: { favicon: favicon.id, image: share.id, description: "By the sea" },
      ...asUser(),
    })

    const brand = resolveBrand(await readBrand(payload))
    const seo = resolveSeo(await readSeo(payload))
    const meta = siteMetadata({ brand, seo, baseUrl })
    expect(meta.icons).toEqual({ icon: favicon.url })
    expect(meta.openGraph).toMatchObject({
      images: [{ url: share.url, alt: "Beach at dusk" }],
    })
    expect(meta.description).toBe("By the sea")
  })

  it("puts noindex on every page and disallows all once indexing is off", async () => {
    await payload.updateGlobal({
      slug: "seo",
      data: { allowIndexing: false },
      ...asUser(),
    })
    const brand = resolveBrand(await readBrand(payload))
    const seo = resolveSeo(await readSeo(payload))
    expect(seo.allowIndexing).toBe(false)
    expect(siteMetadata({ brand, seo, baseUrl }).robots).toEqual({
      index: false,
      follow: false,
    })
    expect(robotsFor(seo, baseUrl)).toEqual({
      rules: [{ userAgent: "*", disallow: "/" }],
    })
    expect(sitemapFor(seo, await readPublishedPages(payload), baseUrl)).toEqual(
      []
    )
  })

  it("applies the saved title pattern, and a Page's own SEO wins", async () => {
    await payload.updateGlobal({
      slug: "seo",
      data: { titlePattern: "{name} — %s" },
      ...asUser(),
    })
    const page = await payload.create({
      collection: "pages",
      data: {
        title: "Rooms",
        path: "/rooms",
        seo: { title: "Our rooms", description: "Sea view rooms" },
        _status: "published",
      },
      ...asUser(),
    })
    const brand = resolveBrand(await readBrand(payload))
    const seo = resolveSeo(await readSeo(payload))
    const meta = pageMetadata({ page, brand, seo, baseUrl })
    expect(meta.title).toEqual({ absolute: "Warren Beach — Our rooms" })
    expect(meta.description).toBe("Sea view rooms")
  })
})

const WOFF2 = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])

describe("the Theme the Site applies", () => {
  const user = () => ({ ...testUser, collection: "users" as const })
  const siteCss = async () => siteThemeCss(await readSiteTheme(payload))

  afterEach(async () => {
    await truncateTables(payload, "theme", "_theme_v")
    await payload.delete({
      collection: "fonts",
      where: { id: { exists: true } },
    })
    await payload.delete({
      collection: "font-files",
      where: { id: { exists: true } },
    })
  })

  it("reads the Theme and the Fonts as a visitor, like every other Site read", async () => {
    const findGlobal = vi.spyOn(payload, "findGlobal")
    const find = vi.spyOn(payload, "find")
    try {
      await readSiteTheme(payload)
      expect(findGlobal).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "theme",
          overrideAccess: false,
          user: null,
        })
      )
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "fonts",
          overrideAccess: false,
          user: null,
        })
      )
    } finally {
      findGlobal.mockRestore()
      find.mockRestore()
    }
  })

  it("is the default preset until a Theme is saved", async () => {
    const theme = await readSiteTheme(payload)
    expect(theme.source).toBe("default")
    expect(theme.savedAt).toBeNull()
    expect(theme.inputs).toEqual(CLASSIC.inputs)
    expect(await siteCss()).toContain(`--primary:${CLASSIC.inputs.primary};`)
  })

  it("shows a saved Theme on the very next read", async () => {
    await saveTheme(payload, { user: user(), inputs: HARBOUR.inputs })
    const theme = await readSiteTheme(payload)
    expect(theme.source).toBe("saved")
    expect(theme.savedAt).not.toBeNull()
    const css = siteThemeCss(theme)
    expect(css).toContain(`--primary:${HARBOUR.inputs.primary};`)
    expect(css).toContain("--btn-radius:0px;")

    await saveTheme(payload, {
      user: user(),
      inputs: { ...HARBOUR.inputs, primary: "#0a7d5a" },
    })
    expect(await siteCss()).toContain("--primary:#0a7d5a;")
  })

  it("shows the restored look after a restore", async () => {
    await saveTheme(payload, { user: user(), inputs: HARBOUR.inputs })
    const before = await siteCss()
    await saveTheme(payload, {
      user: user(),
      inputs: { ...HARBOUR.inputs, primary: "#0a7d5a", buttonCorners: "pill" },
    })
    expect(await siteCss()).not.toBe(before)

    const versions = await payload.findGlobalVersions({
      slug: "theme",
      sort: "id",
      ...asUser(),
    })
    await restoreThemeVersion(payload, {
      user: user(),
      versionId: Number(versions.docs[0]!.id),
    })
    expect(await siteCss()).toBe(before)
  })

  it("serves a stored font's @font-face from the Site itself", async () => {
    const file = await payload.create({
      collection: "font-files",
      data: {},
      file: {
        data: WOFF2,
        mimetype: "font/woff2",
        name: `slab-${Date.now()}.woff2`,
        size: WOFF2.length,
      },
      ...asUser(),
    })
    const font = await payload.create({
      collection: "fonts",
      data: {
        family: "Test Slab",
        kind: "slab",
        files: [{ weight: 400, style: "normal", file: file.id }],
      },
      ...asUser(),
    })
    await saveTheme(payload, {
      user: user(),
      inputs: { ...CLASSIC.inputs, headingFont: `font:${font.id}` },
    })

    const css = await siteCss()
    expect(css).toContain('@font-face{font-family:"Test Slab";')
    expect(css).toMatch(/url\("\/api\/font-files\/file\/slab-/)
    expect(css).toContain('--font-display:"Test Slab", serif')
    expect(css).not.toMatch(/https?:/)
  })
})

describe("Layouts read as a visitor", () => {
  beforeEach(async () => {
    await truncateTables(payload, "layouts", "_layouts_v", "pages", "_pages_v")
  })

  const layout = (name: string, data: Record<string, unknown> = {}) =>
    payload.create({
      collection: "layouts",
      data: { name, ...data },
      ...asUser(),
    })

  const page = (path: string, data: Record<string, unknown> = {}) =>
    payload.create({
      collection: "pages",
      data: { title: path, path, _status: "published", ...data },
      ...asUser(),
    })

  it("reads as a visitor, selecting what the Site draws", async () => {
    await layout("Main")
    const find = vi.spyOn(payload, "find")
    try {
      const layouts = await readLayouts(payload)
      expect(layouts.map((l) => l.name)).toEqual(["Main"])
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "layouts",
          overrideAccess: false,
          user: null,
        })
      )
      // Who saved it, and the change summary, are for users.
      expect(layouts[0]).not.toHaveProperty("updatedBy")
      expect(layouts[0]).not.toHaveProperty("changeSummary")
    } finally {
      find.mockRestore()
    }
  })

  it("populates a menu's Page links, so they follow the Page's path", async () => {
    const about = await page("/about")
    await layout("Main", {
      header: [
        {
          blockType: "navigation",
          items: [{ label: "About", link: { type: "page", page: about.id } }],
        },
      ],
    })

    const read = async () => {
      const [main] = await readLayouts(payload)
      const nav = main?.header?.[0]
      if (nav?.blockType !== "navigation") throw new Error("no navigation")
      return hrefOf(nav.items?.[0]?.link)
    }
    expect(await read()).toBe("/about")

    await payload.update({
      collection: "pages",
      id: about.id,
      data: { path: "/about-us", _status: "published" },
      ...asUser(),
    })
    expect(await read()).toBe("/about-us")
  })

  it("leaves a link to an unpublished Page without a destination", async () => {
    const secret = await page("/secret", { _status: "draft" })
    await layout("Main", {
      footer: [
        {
          blockType: "footerColumns",
          columns: [
            {
              heading: "More",
              content: "links",
              links: [
                { label: "Secret", link: { type: "page", page: secret.id } },
              ],
            },
          ],
        },
      ],
    })
    const [main] = await readLayouts(payload)
    const columns = main?.footer?.[0]
    if (columns?.blockType !== "footerColumns") throw new Error("no columns")
    expect(linksOf(columns.columns?.[0]?.links)).toEqual([])
  })

  describe("the Layout a Page renders with", () => {
    it("follows the resolution rules: specific, none, longest path, default", async () => {
      await layout("Default", { isDefault: true })
      const stays = await layout("Stays", { paths: [{ path: "/stays" }] })
      await layout("Lodges", { paths: [{ path: "/stays/lodges" }] })
      const pinned = await layout("Pinned")

      const name = async (p: Parameters<typeof readLayoutFor>[1]) =>
        (await readLayoutFor(payload, p))?.name ?? null

      expect(await name({ path: "/about" })).toBe("Default")
      expect(await name({ path: "/stays/beach" })).toBe("Stays")
      expect(await name({ path: "/stays/lodges/pine" })).toBe("Lodges")
      expect(await name({ path: "/staysfoo" })).toBe("Default")
      expect(
        await name({ path: "/stays", layout: { mode: "none" } })
      ).toBeNull()
      expect(
        await name({
          path: "/stays/lodges",
          layout: { mode: "specific", layout: pinned.id },
        })
      ).toBe("Pinned")
      // A Page read at depth 1 has its picked Layout populated.
      expect(
        await name({
          path: "/about",
          layout: { mode: "specific", layout: stays },
        })
      ).toBe("Stays")
    })

    it("is the default Layout for an address nothing lives at", async () => {
      await layout("Default", { isDefault: true })
      await layout("Stays", { paths: [{ path: "/stays" }] })
      expect((await readLayoutFor(payload, null))?.name).toBe("Default")
    })

    it("is none when the Site has no Layouts", async () => {
      expect(await readLayoutFor(payload, { path: "/" })).toBeNull()
      expect(await readLayoutFor(payload, null)).toBeNull()
    })
  })
})
