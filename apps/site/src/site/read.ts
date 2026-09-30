import type { Payload } from "payload"

import { getAvailableFonts } from "../fonts/available"
import type { Brand, Seo } from "../payload-types"
import { readLiveTheme, type LiveTheme } from "../theme/record"
import type { SitemapPage } from "./seo"
import type { SiteTheme } from "./themeStyle"

/**
 * What the public Site reads about itself, through the Local API as a
 * visitor: access rules apply (`overrideAccess: false`, no user), so only
 * Published content comes back (apps/site ADR-0001). Takes the Payload
 * instance so tests can use their own; ./queries.ts binds the real one.
 */

const asVisitor = { overrideAccess: false, user: null } as const

/** The Brand global. Fields are empty until someone has saved it. */
export function readBrand(payload: Payload): Promise<Brand> {
  return payload.findGlobal({ slug: "brand", depth: 1, ...asVisitor })
}

/** The SEO global. Fields are empty until someone has saved it. */
export function readSeo(payload: Payload): Promise<Seo> {
  return payload.findGlobal({ slug: "seo", depth: 1, ...asVisitor })
}

/** The path and last change of every Published Page. */
export async function readPublishedPages(
  payload: Payload
): Promise<SitemapPage[]> {
  const { docs } = await payload.find({
    collection: "pages",
    draft: false,
    depth: 0,
    pagination: false,
    select: { path: true, updatedAt: true },
    sort: "path",
    ...asVisitor,
  })
  return docs.map(({ path, updatedAt }) => ({ path, updatedAt }))
}

/** The live Theme, and the fonts its font keys can name. */
export type LiveSiteTheme = LiveTheme & SiteTheme

/**
 * The live Theme the Site applies: what was last saved (it goes live on save,
 * apps/site ADR-0004), or the default preset while none is. The Theme and the
 * Fonts are public records with no Drafts, so the read needs no visitor
 * filtering; a Font a Theme names that has since been deleted is simply not in
 * `fonts`, and resolves to the default font.
 */
export async function readSiteTheme(payload: Payload): Promise<LiveSiteTheme> {
  const [live, fonts] = await Promise.all([
    readLiveTheme(payload),
    getAvailableFonts(payload),
  ])
  return { ...live, fonts }
}
