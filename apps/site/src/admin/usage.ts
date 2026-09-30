import type { Payload } from "payload"

import type { Brand, Page, Seo } from "../payload-types"
import { loadMenusLinkingTo } from "../collections/Pages/navigationGuard"
import type { Dependent } from "./kit"
import { mediaId } from "./pageForm"
import type { Access } from "./settingsSave"

/**
 * What uses an item, for the confirmation before deleting it: which places
 * show a Media image, and which Pages and Layouts (by the menu) link to a Page.
 */

const BRAND_HREF = "/admin/settings/brand"
const SEO_HREF = "/admin/settings/seo"

type PageUse = Pick<Page, "id" | "title" | "path" | "blocks" | "seo">

/**
 * For every Media id in use: the Brand and SEO settings and the Pages that
 * show it (one entry per Page, saying where on the Page).
 */
export function mediaDependents({
  brand,
  seo,
  pages,
}: {
  brand: Pick<Brand, "logo">
  seo: Pick<Seo, "image" | "favicon">
  pages: readonly PageUse[]
}): Map<number, Dependent[]> {
  const result = new Map<number, Dependent[]>()
  const add = (media: unknown, dependent: Dependent) => {
    const id = mediaId(media as number | null | undefined)
    if (id == null) return
    result.set(id, [...(result.get(id) ?? []), dependent])
  }

  add(brand.logo, { kind: "Brand setting", name: "Logo", href: BRAND_HREF })
  add(seo.image, {
    kind: "SEO setting",
    name: "Social share image",
    href: SEO_HREF,
  })
  add(seo.favicon, { kind: "SEO setting", name: "Favicon", href: SEO_HREF })

  // A Page can appear once per version (its Draft, its Published copy); it is
  // named once, with everything either version uses.
  const byPage = new Map<
    number,
    { title: string; uses: Map<number, Set<string>> }
  >()
  for (const page of pages) {
    const entry = byPage.get(page.id) ?? { title: page.title, uses: new Map() }
    byPage.set(page.id, entry)
    const note = (media: unknown, where: string) => {
      const id = mediaId(media as number | null | undefined)
      if (id == null) return
      entry.uses.set(id, (entry.uses.get(id) ?? new Set()).add(where))
    }
    for (const block of page.blocks ?? []) {
      if (block.blockType === "hero") note(block.image, "hero image")
    }
    note(page.seo?.image, "SEO image")
  }
  for (const [pageId, { title, uses }] of byPage) {
    for (const [id, where] of uses) {
      add(id, {
        kind: "Page",
        name: `${title} (${[...where].join(", ")})`,
        href: `/admin/pages/${pageId}`,
      })
    }
  }
  return result
}

/** "/stays/", "/stays?room=2#top" and "/stays" are the same Site path. */
function normalisePath(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null
  const path = href.split(/[?#]/)[0]!
  return path.length > 1 ? path.replace(/\/+$/, "") : path
}

/** The other Pages with a button that links to `path`. */
export function pagesLinkingTo(
  path: string,
  ownId: number,
  pages: readonly PageUse[]
): Dependent[] {
  const target = normalisePath(path)
  if (target == null) return []
  const seen = new Set<number>()
  return pages
    .filter((page) => page.id !== ownId)
    .filter((page) =>
      (page.blocks ?? []).some((block) => {
        const href =
          block.blockType === "hero"
            ? block.cta?.href
            : block.blockType === "callToAction"
              ? block.button?.href
              : null
        return href != null && normalisePath(href) === target
      })
    )
    .filter((page) => !seen.has(page.id) && seen.add(page.id))
    .map((page) => ({
      kind: "Page",
      name: page.title,
      href: `/admin/pages/${page.id}`,
    }))
}

/**
 * Every Page in both its versions, the latest Draft and the Published copy:
 * deleting hurts whichever one still uses the item.
 */
async function loadAllPageVersions(
  payload: Payload,
  access: Access
): Promise<PageUse[]> {
  const select = {
    title: true,
    path: true,
    blocks: true,
    seo: true,
  } as const
  const [latest, published] = await Promise.all(
    [true, false].map((draft) =>
      payload.find({
        collection: "pages",
        pagination: false,
        depth: 0,
        draft,
        select,
        sort: "id",
        ...access,
      })
    )
  )
  return [...latest!.docs, ...published!.docs]
}

/** Media id -> what uses it, for the Media screen's delete confirmation. */
export async function loadMediaDependents(
  payload: Payload,
  access: Access
): Promise<Map<number, Dependent[]>> {
  const [brand, seo, pages] = await Promise.all([
    payload.findGlobal({ slug: "brand", depth: 0, ...access }),
    payload.findGlobal({ slug: "seo", depth: 0, ...access }),
    loadAllPageVersions(payload, access),
  ])
  return mediaDependents({ brand, seo, pages })
}

/**
 * What links to this Page, for its delete confirmation: the Pages with a
 * button to its path, and the Layouts whose menus link to it (each menu named,
 * as the delete error names them).
 */
export async function loadPageDependents(
  payload: Payload,
  access: Access,
  { id, path }: { id: number; path: string }
): Promise<Dependent[]> {
  const [pages, menus] = await Promise.all([
    loadAllPageVersions(payload, access),
    loadMenusLinkingTo(payload, id, access),
  ])
  return [
    ...pagesLinkingTo(path, id, pages),
    ...menus.map(
      (menu): Dependent => ({
        kind: "Layout",
        name: `${menu.layoutName} (${menu.menu})`,
        href: `/admin/layouts/${menu.layoutId}`,
      })
    ),
  ]
}
