import type { Payload } from "payload"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { Media, User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { resolveBrand } from "./brand"
import { siteThemeCss } from "./themeStyle"
import { CLASSIC, HARBOUR } from "../theme"
import { restoreThemeVersion, saveTheme } from "../theme/record"
import { readBrand, readPublishedPages, readSeo, readSiteTheme } from "./read"
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
let staff: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  staff = await payload.create({
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

const asStaff = () => ({
  overrideAccess: false as const,
  user: { ...staff, collection: "users" as const },
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
    ...asStaff(),
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
      ...asStaff(),
    })
    await payload.create({
      collection: "pages",
      data: { title: "About", path: "/about", _status: "published" },
      ...asStaff(),
    })
    await payload.create({
      collection: "pages",
      data: { title: "Secret", path: "/secret", _status: "draft" },
      draft: true,
      ...asStaff(),
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
      ...asStaff(),
    })
    await payload.updateGlobal({
      slug: "seo",
      data: { favicon: favicon.id, image: share.id, description: "By the sea" },
      ...asStaff(),
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
      ...asStaff(),
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
      ...asStaff(),
    })
    const page = await payload.create({
      collection: "pages",
      data: {
        title: "Rooms",
        path: "/rooms",
        seo: { title: "Our rooms", description: "Sea view rooms" },
        _status: "published",
      },
      ...asStaff(),
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
  const staffUser = () => ({ ...staff, collection: "users" as const })
  const siteCss = async () => siteThemeCss(await readSiteTheme(payload))

  afterEach(async () => {
    await payload.db.pool.query('TRUNCATE "theme", "_theme_v" CASCADE')
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
    await saveTheme(payload, { user: staffUser(), inputs: HARBOUR.inputs })
    const theme = await readSiteTheme(payload)
    expect(theme.source).toBe("saved")
    expect(theme.savedAt).not.toBeNull()
    const css = siteThemeCss(theme)
    expect(css).toContain(`--primary:${HARBOUR.inputs.primary};`)
    expect(css).toContain("--btn-radius:0px;")

    await saveTheme(payload, {
      user: staffUser(),
      inputs: { ...HARBOUR.inputs, primary: "#0a7d5a" },
    })
    expect(await siteCss()).toContain("--primary:#0a7d5a;")
  })

  it("shows the restored look after a restore", async () => {
    await saveTheme(payload, { user: staffUser(), inputs: HARBOUR.inputs })
    const before = await siteCss()
    await saveTheme(payload, {
      user: staffUser(),
      inputs: { ...HARBOUR.inputs, primary: "#0a7d5a", buttonCorners: "pill" },
    })
    expect(await siteCss()).not.toBe(before)

    const versions = await payload.findGlobalVersions({
      slug: "theme",
      sort: "id",
      ...asStaff(),
    })
    await restoreThemeVersion(payload, {
      user: staffUser(),
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
      ...asStaff(),
    })
    const font = await payload.create({
      collection: "fonts",
      data: {
        family: "Test Slab",
        kind: "slab",
        files: [{ weight: 400, style: "normal", file: file.id }],
      },
      ...asStaff(),
    })
    await saveTheme(payload, {
      user: staffUser(),
      inputs: { ...CLASSIC.inputs, headingFont: `font:${font.id}` },
    })

    const css = await siteCss()
    expect(css).toContain('@font-face{font-family:"Test Slab";')
    expect(css).toMatch(/url\("\/api\/font-files\/file\/slab-/)
    expect(css).toContain('--font-display:"Test Slab", serif')
    expect(css).not.toMatch(/https?:/)
  })
})
