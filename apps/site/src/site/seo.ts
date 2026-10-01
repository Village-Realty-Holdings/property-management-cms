import type { Metadata, MetadataRoute } from "next"

import type { Page, Seo } from "../payload-types"
import { imageOf, type Brand, type Image } from "./brand"

/**
 * What the Site renders from SEO: robots.txt, the sitemap, and the metadata
 * (title, description, favicon, Open Graph, noindex, canonical). Pure
 * functions over already-read data, so they are tested without Next or a
 * database. The reads live in ./read.ts.
 */

const DEFAULT_SITE_URL = "http://localhost:3000"
const DEFAULT_TITLE_PATTERN = "%s · {name}"

/** Paths crawlers have no business in: the Admin, the API and sign-in. */
const PRIVATE_PATHS = ["/admin", "/p-admin", "/api", "/auth"]

/**
 * The Site's origin from `SITE_URL`: an http(s) origin with no path, without
 * a trailing slash. Unset means localhost in development; production needs it
 * because sitemap, robots and canonical URLs must be absolute.
 */
export function resolveSiteUrl(
  raw: string | undefined,
  { production }: { production: boolean }
): string {
  if (raw === undefined) {
    if (production) {
      throw new Error("SITE_URL must be set, for example https://example.com")
    }
    return DEFAULT_SITE_URL
  }
  const value = raw.trim()
  let url: URL | null = null
  try {
    url = new URL(value)
  } catch {
    // reported below
  }
  if (
    !url ||
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `SITE_URL must be an http(s) origin such as https://example.com, got "${raw}"`
    )
  }
  return url.origin
}

/** The Site's origin, read from `SITE_URL`. */
export function siteUrl(
  env: Record<string, string | undefined> = process.env
): string {
  return resolveSiteUrl(env.SITE_URL || undefined, {
    production: env.NODE_ENV === "production",
  })
}

/** `%s` becomes the Page title and `{name}` the Site name, in one pass. */
export function applyTitlePattern(
  pattern: string,
  { title, name }: { title: string; name: string }
): string {
  return (pattern.trim() || DEFAULT_TITLE_PATTERN).replace(
    /%s|\{name\}/g,
    (token) => (token === "%s" ? title : name)
  )
}

export type SeoDefaults = {
  titlePattern: string
  description: string | null
  image: Image | null
  favicon: Image | null
  allowIndexing: boolean
}

/** The SEO global with its defaults filled in; null is an unsaved SEO. */
export function resolveSeo(seo: Seo | null): SeoDefaults {
  return {
    titlePattern: seo?.titlePattern?.trim() || DEFAULT_TITLE_PATTERN,
    description: seo?.description?.trim() || null,
    image: imageOf(seo?.image),
    favicon: imageOf(seo?.favicon),
    allowIndexing: seo?.allowIndexing ?? true,
  }
}

export function robotsFor(
  seo: SeoDefaults,
  baseUrl: string
): MetadataRoute.Robots {
  if (!seo.allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

export type SitemapPage = { path: string; updatedAt: string }

/** Published Pages as absolute URLs; nothing while indexing is off. */
export function sitemapFor(
  seo: SeoDefaults,
  pages: readonly SitemapPage[],
  baseUrl: string
): MetadataRoute.Sitemap {
  if (!seo.allowIndexing) return []
  return pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(page.updatedAt),
  }))
}

type MetadataInput = { brand: Brand; seo: SeoDefaults; baseUrl: string }

const ogImages = (image: Image | null) =>
  image ? { images: [{ url: image.url, alt: image.alt }] } : {}

const twitterFor = (image: Image | null) => ({
  card: image ? ("summary_large_image" as const) : ("summary" as const),
})

/**
 * The Site-wide metadata for the root layout: Open Graph defaults, favicon
 * and, with indexing off, noindex. Pages inherit `robots` and `icons`, but
 * Next replaces `openGraph` and `twitter` as a whole, so pageMetadata
 * repeats them.
 */
export function siteMetadata({ brand, seo, baseUrl }: MetadataInput): Metadata {
  return {
    metadataBase: new URL(baseUrl),
    title: { absolute: brand.name },
    description: seo.description ?? undefined,
    icons: seo.favicon ? { icon: seo.favicon.url } : undefined,
    robots: seo.allowIndexing ? undefined : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: brand.name,
      title: brand.name,
      description: seo.description ?? undefined,
      ...ogImages(seo.image),
    },
    twitter: twitterFor(seo.image),
  }
}

/** A Published Page's metadata: its own SEO over the Site's defaults. */
export function pageMetadata({
  page,
  brand,
  seo,
  baseUrl,
}: MetadataInput & { page: Page }): Metadata {
  const title = applyTitlePattern(seo.titlePattern, {
    title: page.seo?.title?.trim() || page.title,
    name: brand.name,
  })
  const description = page.seo?.description?.trim() || seo.description
  const image = imageOf(page.seo?.image) ?? seo.image
  const url = `${baseUrl}${page.path}`
  return {
    title: { absolute: title },
    description: description ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: brand.name,
      title,
      description: description ?? undefined,
      url,
      ...ogImages(image),
    },
    twitter: twitterFor(image),
  }
}
