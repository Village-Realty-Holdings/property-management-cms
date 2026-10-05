import type { Payload } from "payload"

import { getAvailableFonts } from "../fonts/available"
import { resolveLayout, type LayoutChoice } from "../layouts/resolve"
import type { Brand, Layout, Page, Seo } from "../payload-types"
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
 * apps/site ADR-0004), or the default preset while none is. Both reads go
 * through the visitor path like the rest (the Theme and the Fonts are public
 * and have no Drafts, so a visitor sees all of them); a Font a Theme names
 * that has since been deleted is simply not in `fonts`, and resolves to the
 * default font.
 */
export async function readSiteTheme(payload: Payload): Promise<LiveSiteTheme> {
  const [live, fonts] = await Promise.all([
    readLiveTheme(payload),
    getAvailableFonts(payload),
  ])
  return { ...live, fonts }
}

/**
 * Every Layout, with the Pages its menus link to populated (depth 1), so a
 * link follows its Page's current path. A link to a Page a visitor cannot
 * read (one that is not Published) stays an id, and renders nothing. Only
 * what the Site draws is selected: the history details are users-only.
 * Oldest first, so on a tie between path prefixes the first Layout keeps it.
 */
export async function readLayouts(payload: Payload): Promise<Layout[]> {
  const { docs } = await payload.find({
    collection: "layouts",
    depth: 1,
    pagination: false,
    sort: "id",
    select: {
      name: true,
      header: true,
      footer: true,
      paths: true,
      isDefault: true,
    },
    ...asVisitor,
  })
  return docs as Layout[]
}

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === "object" && value ? value.id : value

/** How a Page picks its Layout, from its `layout` field. */
function choiceOf(layout: Page["layout"] | undefined): LayoutChoice {
  if (layout?.mode === "none") return { mode: "none" }
  if (layout?.mode === "specific") {
    return { mode: "specific", layoutId: idOf(layout.layout) }
  }
  return { mode: "route" }
}

/**
 * The Layout a Page renders with (apps/site ADR-0006, src/layouts/resolve.ts),
 * or null for none. Without a Page (the not-found page) it is the default
 * Layout: no path or choice applies to an address nothing lives at.
 */
export async function readLayoutFor(
  payload: Payload,
  page: Pick<Page, "path" | "layout"> | null
): Promise<Layout | null> {
  const layouts = await readLayouts(payload)
  const candidates = layouts.map((layout) => ({
    id: layout.id,
    name: layout.name,
    isDefault: Boolean(layout.isDefault),
    paths: (layout.paths ?? []).map((row) => row.path),
    layout,
  }))
  if (!page) return candidates.find((c) => c.isDefault)?.layout ?? null
  const { layout } = resolveLayout({
    path: page.path,
    choice: choiceOf(page.layout),
    layouts: candidates,
  })
  return layout?.layout ?? null
}
