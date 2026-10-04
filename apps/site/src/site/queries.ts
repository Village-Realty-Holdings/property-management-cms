import config from "@payload-config"
import { getPayload } from "payload"
import { cache } from "react"

import type { Brand, Layout, Media, Page, Seo } from "../payload-types"
import {
  readBrand,
  readLayoutFor,
  readPublishedPages,
  readSeo,
  readSiteTheme,
  type LiveSiteTheme,
} from "./read"
import type { SitemapPage } from "./seo"

/**
 * What the public Site reads, through the Local API as a visitor: access
 * rules apply (`overrideAccess: false`, no user), so only Published content
 * comes back (apps/site ADR-0001). Cached per request.
 */

const asVisitor = { overrideAccess: false, user: null } as const

/** The Published Page at `path` ("/" for Home), or null. */
export const getPublishedPage = cache(
  async (path: string): Promise<Page | null> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: "pages",
      where: { path: { equals: path } },
      limit: 1,
      depth: 1,
      draft: false,
      ...asVisitor,
    })
    return docs[0] ?? null
  }
)

/**
 * The Layout the Page at `path` renders with, or null for none. A `path` no
 * Published Page lives at gets the default Layout (the not-found page).
 */
export const getLayoutForPath = cache(
  async (path: string | null): Promise<Layout | null> => {
    const page = path === null ? null : await getPublishedPage(path)
    return readLayoutFor(await getPayload({ config }), page)
  }
)

/** The Brand global; empty fields until someone has saved it. */
export const getBrand = cache(async (): Promise<Brand> => {
  return readBrand(await getPayload({ config }))
})

/**
 * The live Theme with the fonts it can use: the default preset until one is
 * saved. Read on every request (cached only within it), so a save or a
 * restore shows on the next page load.
 */
export const getTheme = cache(async (): Promise<LiveSiteTheme> => {
  return readSiteTheme(await getPayload({ config }))
})

/** The SEO global; empty fields until someone has saved it. */
export const getSeo = cache(async (): Promise<Seo> => {
  return readSeo(await getPayload({ config }))
})

/** Every Published Page's path and last change, for the sitemap. */
export const getPublishedPages = cache(async (): Promise<SitemapPage[]> => {
  return readPublishedPages(await getPayload({ config }))
})

/**
 * Every Media image, for the Visual Editor's canvas: the Page it is posted
 * holds an image as a Media id, and the canvas draws it from this.
 */
export const getMediaLibrary = cache(async (): Promise<Media[]> => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: "media",
    pagination: false,
    depth: 0,
    ...asVisitor,
  })
  return docs
})

/** The Page path for the catch-all route's segments: [] is "/". */
export function pathFromSegments(segments: readonly string[] | undefined) {
  return `/${(segments ?? []).map(decodeURIComponent).join("/")}`
}
