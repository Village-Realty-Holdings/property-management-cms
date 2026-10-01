import { describe, expect, it } from "vitest"

import type { Media, Page, Seo } from "../payload-types"
import { resolveBrand } from "./brand"
import {
  applyTitlePattern,
  pageMetadata,
  resolveSeo,
  resolveSiteUrl,
  robotsFor,
  siteUrl,
  siteMetadata,
  sitemapFor,
} from "./seo"

const base = "https://example.com"

const media = (id: number, url: string, alt = ""): Media =>
  ({ id, url, alt, filename: url }) as Media

const seoWith = (fields: Partial<Seo>): Seo => ({
  id: 1,
  updatedAt: "",
  createdAt: "",
  ...fields,
})

const brand = resolveBrand({ id: 1, name: "Warren Beach" } as never)

describe("SITE_URL", () => {
  it.each([
    ["https://example.com", "https://example.com"],
    ["https://example.com/", "https://example.com"],
    [" http://localhost:3001 ", "http://localhost:3001"],
  ])("accepts %s", (raw, expected) => {
    expect(resolveSiteUrl(raw, { production: true })).toBe(expected)
  })

  it.each(["example.com", "ftp://example.com", "https://example.com/blog", ""])(
    "rejects %j",
    (raw) => {
      expect(() => resolveSiteUrl(raw, { production: false })).toThrow(
        /SITE_URL/
      )
    }
  )

  it("defaults to localhost in development, and is required in production", () => {
    expect(resolveSiteUrl(undefined, { production: false })).toBe(
      "http://localhost:3000"
    )
    expect(() => resolveSiteUrl(undefined, { production: true })).toThrow(
      /SITE_URL/
    )
  })
})

describe("siteUrl", () => {
  it("reads SITE_URL from the env it is given", () => {
    expect(siteUrl({ SITE_URL: "https://warren.example/" })).toBe(
      "https://warren.example"
    )
    expect(siteUrl({})).toBe("http://localhost:3000")
    expect(() => siteUrl({ NODE_ENV: "production" })).toThrow(/SITE_URL/)
  })
})

describe("the title pattern", () => {
  it("puts the Page title at %s and the Site name at {name}", () => {
    expect(
      applyTitlePattern("%s · {name}", { title: "About", name: "Warren Beach" })
    ).toBe("About · Warren Beach")
    expect(
      applyTitlePattern("{name} | %s", { title: "About", name: "Warren Beach" })
    ).toBe("Warren Beach | About")
  })

  it("does not re-expand placeholders inside the title or name", () => {
    expect(
      applyTitlePattern("%s · {name}", { title: "{name} %s", name: "A %s" })
    ).toBe("{name} %s · A %s")
  })

  it("falls back to `title · name` when the pattern is empty", () => {
    expect(applyTitlePattern("", { title: "About", name: "WB" })).toBe(
      "About · WB"
    )
  })
})

describe("SEO defaults", () => {
  it("are usable when nothing has been saved", () => {
    expect(resolveSeo(null)).toEqual({
      titlePattern: "%s · {name}",
      description: null,
      image: null,
      favicon: null,
      allowIndexing: true,
    })
    expect(resolveSeo(seoWith({})).allowIndexing).toBe(true)
  })

  it("read the saved values, with images from Media", () => {
    const seo = resolveSeo(
      seoWith({
        titlePattern: "{name}: %s",
        description: " Stay by the sea ",
        image: media(2, "/api/media/file/share.png", "Beach"),
        favicon: media(3, "/api/media/file/icon.png"),
        allowIndexing: false,
      })
    )
    expect(seo).toEqual({
      titlePattern: "{name}: %s",
      description: "Stay by the sea",
      image: { url: "/api/media/file/share.png", alt: "Beach" },
      favicon: { url: "/api/media/file/icon.png", alt: "" },
      allowIndexing: false,
    })
  })

  it("ignore an image that was not populated", () => {
    expect(resolveSeo(seoWith({ image: 4 as never })).image).toBeNull()
  })
})

describe("robots.txt", () => {
  it("allows crawling and points at the sitemap when indexing is on", () => {
    const robots = robotsFor(resolveSeo(seoWith({ allowIndexing: true })), base)
    expect(robots.sitemap).toBe("https://example.com/sitemap.xml")
    expect(robots.rules).toEqual([
      expect.objectContaining({
        userAgent: "*",
        allow: "/",
        disallow: expect.arrayContaining(["/admin", "/p-admin", "/api"]),
      }),
    ])
  })

  it("disallows everything, with no sitemap, when indexing is off", () => {
    const robots = robotsFor(
      resolveSeo(seoWith({ allowIndexing: false })),
      base
    )
    expect(robots).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] })
  })

  it("allows crawling before SEO has been saved", () => {
    expect(robotsFor(resolveSeo(null), base).sitemap).toBe(
      "https://example.com/sitemap.xml"
    )
  })
})

describe("sitemap.xml", () => {
  const pages = [
    { path: "/", updatedAt: "2026-01-02T00:00:00.000Z" },
    { path: "/about", updatedAt: "2026-02-03T00:00:00.000Z" },
    { path: "/stays/beach-house", updatedAt: "2026-03-04T00:00:00.000Z" },
  ]

  it("lists each Published Page with an absolute URL", () => {
    expect(sitemapFor(resolveSeo(null), pages, base)).toEqual([
      {
        url: "https://example.com/",
        lastModified: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        url: "https://example.com/about",
        lastModified: new Date("2026-02-03T00:00:00.000Z"),
      },
      {
        url: "https://example.com/stays/beach-house",
        lastModified: new Date("2026-03-04T00:00:00.000Z"),
      },
    ])
  })

  it("lists nothing when indexing is off", () => {
    expect(
      sitemapFor(resolveSeo(seoWith({ allowIndexing: false })), pages, base)
    ).toEqual([])
  })
})

describe("Site metadata", () => {
  it("has the Site name, the base URL, and the default description", () => {
    const meta = siteMetadata({
      brand,
      seo: resolveSeo(seoWith({ description: "Stay by the sea" })),
      baseUrl: base,
    })
    expect(meta.metadataBase?.toString()).toBe("https://example.com/")
    expect(meta.title).toEqual({ absolute: "Warren Beach" })
    expect(meta.description).toBe("Stay by the sea")
    expect(meta.openGraph).toMatchObject({
      siteName: "Warren Beach",
      type: "website",
    })
  })

  it("uses the SEO favicon and share image from Media", () => {
    const meta = siteMetadata({
      brand,
      seo: resolveSeo(
        seoWith({
          favicon: media(3, "/api/media/file/icon.png"),
          image: media(2, "/api/media/file/share.png", "Beach"),
        })
      ),
      baseUrl: base,
    })
    expect(meta.icons).toEqual({ icon: "/api/media/file/icon.png" })
    expect(meta.openGraph).toMatchObject({
      images: [{ url: "/api/media/file/share.png", alt: "Beach" }],
    })
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" })
  })

  it("has no icon or image when none is set, and still renders", () => {
    const meta = siteMetadata({
      brand: resolveBrand(null),
      seo: resolveSeo(null),
      baseUrl: base,
    })
    expect(meta.icons).toBeUndefined()
    expect(meta.openGraph).not.toHaveProperty("images")
    expect(meta.title).toEqual({ absolute: "Awayday" })
    expect(meta.robots).toBeUndefined()
  })

  it("is noindex when indexing is off", () => {
    const meta = siteMetadata({
      brand,
      seo: resolveSeo(seoWith({ allowIndexing: false })),
      baseUrl: base,
    })
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
})

describe("Page metadata", () => {
  const page = (fields: Partial<Page>): Page =>
    ({ id: 9, title: "About", path: "/about", ...fields }) as Page

  const seo = resolveSeo(
    seoWith({
      titlePattern: "%s · {name}",
      description: "Default description",
      image: media(2, "/api/media/file/share.png"),
    })
  )

  it("applies the title pattern to the Page title", () => {
    const meta = pageMetadata({ page: page({}), brand, seo, baseUrl: base })
    expect(meta.title).toEqual({ absolute: "About · Warren Beach" })
    expect(meta.openGraph).toMatchObject({ title: "About · Warren Beach" })
  })

  it("prefers the Page's own SEO over the defaults", () => {
    const meta = pageMetadata({
      page: page({
        seo: {
          title: "Our story",
          description: "Who we are",
          image: media(5, "/api/media/file/about.png", "Us"),
        },
      }),
      brand,
      seo,
      baseUrl: base,
    })
    expect(meta.title).toEqual({ absolute: "Our story · Warren Beach" })
    expect(meta.description).toBe("Who we are")
    expect(meta.openGraph).toMatchObject({
      description: "Who we are",
      images: [{ url: "/api/media/file/about.png", alt: "Us" }],
    })
  })

  it("falls back to the SEO defaults for what the Page leaves empty", () => {
    const meta = pageMetadata({
      page: page({ seo: { title: "", description: null, image: null } }),
      brand,
      seo,
      baseUrl: base,
    })
    expect(meta.description).toBe("Default description")
    expect(meta.openGraph).toMatchObject({
      images: [{ url: "/api/media/file/share.png", alt: "" }],
    })
  })

  it("sets the canonical URL from the base URL", () => {
    const meta = pageMetadata({ page: page({}), brand, seo, baseUrl: base })
    expect(meta.alternates).toEqual({ canonical: "https://example.com/about" })
    expect(meta.openGraph).toMatchObject({ url: "https://example.com/about" })
  })

  it("does not redefine robots, so the Site's noindex is inherited", () => {
    const meta = pageMetadata({ page: page({}), brand, seo, baseUrl: base })
    expect(meta.robots).toBeUndefined()
  })
})
