import config from "@payload-config"
import { getPayload } from "payload"
import { cache } from "react"

import type { Brand, Page, Seo } from "../payload-types"
import {
  readBrand,
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

/** The Page path for the catch-all route's segments: [] is "/". */
export function pathFromSegments(segments: readonly string[] | undefined) {
  return `/${(segments ?? []).map(decodeURIComponent).join("/")}`
}
