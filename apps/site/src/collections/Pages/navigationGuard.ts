import {
  APIError,
  type CollectionBeforeDeleteHook,
  type Payload,
  type PayloadRequest,
  type TypedUser,
} from "payload"

import type { Layout, Page } from "../../payload-types"
import type { NavLink } from "../../site/regions/links"

/**
 * Links follow Pages (apps/site ADR-0006). A menu link to a Page is a
 * relationship, so the menu follows the Page when its path changes. Deleting
 * a Page that a Layout's Navigation or Footer columns link to is refused, and
 * the error names those Layouts and menus.
 */

/** A menu that links to a Page, and the Layout it belongs to. */
export type MenuUse = {
  layoutId: number
  layoutName: string
  /** "Navigation", or `Footer columns "Company"`. */
  menu: string
}

type LayoutMenus = Pick<Layout, "id" | "name" | "header" | "footer">

type Access =
  | { req: Pick<PayloadRequest, "user"> & Partial<PayloadRequest> }
  | { user: TypedUser | null; overrideAccess: false }

/** Whether a menu link is a link to the Page `pageId` (populated or not). */
function linksTo(link: NavLink, pageId: number): boolean {
  if (!link || link.type === "url") return false
  const page: number | Page | null | undefined = link.page
  return (typeof page === "object" && page !== null ? page.id : page) === pageId
}

/**
 * The menus of these Layouts that link to the Page: a Navigation's top-level
 * links and its dropdown links, and Footer columns' links. Each menu is named
 * once however many of its links point at the Page. A link of type "url"
 * does not count, even if it still remembers a Page, and neither does the
 * own link of an item that has dropdown links.
 */
export function menusLinkingTo(
  pageId: number,
  layouts: readonly LayoutMenus[]
): MenuUse[] {
  const uses: MenuUse[] = []
  for (const layout of layouts) {
    const add = (menu: string) => {
      const use = { layoutId: layout.id, layoutName: layout.name, menu }
      if (!uses.some((u) => u.layoutId === use.layoutId && u.menu === menu)) {
        uses.push(use)
      }
    }
    for (const block of layout.header ?? []) {
      if (block.blockType !== "navigation") continue
      // An item with dropdown links ignores its own link, which the Admin
      // hides but Payload keeps.
      const linked = (block.items ?? []).some((item) =>
        item.children?.length
          ? item.children.some((child) => linksTo(child.link, pageId))
          : linksTo(item.link, pageId)
      )
      if (linked) add("Navigation")
    }
    for (const block of layout.footer ?? []) {
      if (block.blockType !== "footerColumns") continue
      for (const column of block.columns ?? []) {
        if (
          column.content === "links" &&
          (column.links ?? []).some((item) => linksTo(item.link, pageId))
        ) {
          add(`Footer columns "${column.heading}"`)
        }
      }
    }
  }
  return uses
}

/**
 * The menus that link to a Page, for the delete confirmation and the guard.
 * A Layout goes live on save (ADR-0006), so its current version is the only
 * one a menu can be shown from. Layouts are few, so they are read whole and
 * searched here rather than queried by a path through the Blocks.
 */
export async function loadMenusLinkingTo(
  payload: Payload,
  pageId: number,
  access: Access
): Promise<MenuUse[]> {
  const { docs } = await payload.find({
    collection: "layouts",
    pagination: false,
    depth: 0,
    sort: "id",
    select: { name: true, header: true, footer: true },
    ...access,
  })
  return menusLinkingTo(pageId, docs)
}

/** 409: the request is fine, but the Page's use forbids it. */
const CONFLICT = 409

export const refuseDeleteWhenLinked: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const pageId = Number(id)
  const uses = await loadMenusLinkingTo(req.payload, pageId, { req })
  if (uses.length === 0) return

  const page = await req.payload.findByID({
    collection: "pages",
    id,
    depth: 0,
    select: { title: true },
    req,
  })
  const list = uses.map((use) => `"${use.layoutName}" (${use.menu})`).join(", ")
  const noun = uses.length === 1 ? "menu links" : "menus link"
  throw new APIError(
    `"${page.title}" can't be deleted: ${uses.length} ${noun} to it. Remove the link first: ${list}.`,
    CONFLICT,
    undefined,
    true
  )
}
