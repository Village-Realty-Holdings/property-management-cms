import type { Page } from "../../payload-types"
import { safeHref } from "../RichText"

/**
 * A menu link as a Layout stores it (see `navLink` in src/fields): to a Page
 * by relationship, or to a URL. `type` says which; a link with no type is a
 * Page link, like a new one in the Admin.
 */
export type NavLink =
  | {
      type?: ("page" | "url") | null
      page?: (number | null) | Page
      url?: string | null
    }
  | null
  | undefined

/**
 * Where a menu link goes: the linked Page's current path (so the link follows
 * the Page when its path changes), else its URL. `null` when it has neither,
 * or the URL is not one the Site links to (see `safeHref`).
 */
export function hrefOf(link: NavLink): string | null {
  if (!link) return null
  if (link.type !== "url" && typeof link.page === "object" && link.page?.path) {
    return safeHref(link.page.path)
  }
  return safeHref(link.url)
}

/** A list item as the Payload config stores it: a label and a menu link. */
type LinkItem = { id?: string | null; label?: string | null; link?: NavLink }

/**
 * A list of labelled menu links, ready to render: each with its href, and
 * with any item that has no label or nowhere to go left out.
 */
export function linksOf(
  items: readonly LinkItem[] | null | undefined
): { key: string; label: string; href: string }[] {
  return (items ?? []).flatMap((item, index) => {
    const label = item.label?.trim()
    const href = hrefOf(item.link)
    return label && href ? [{ key: item.id ?? String(index), label, href }] : []
  })
}
