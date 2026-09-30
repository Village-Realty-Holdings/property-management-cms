import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Media, User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { resolveBrand } from "./brand"
import { readBrand, readPublishedPages, readSeo } from "./read"
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
