import type { NavigationBlock } from "../../payload-types"
import { hrefOf, linksOf } from "./links"
import { NavigationMenu, type MenuItem, type MenuLink } from "./NavigationMenu"
import type { RegionContext } from "./types"

type Item = NonNullable<NavigationBlock["items"]>[number]

/** The links of a dropdown, in columns when the menu is a mega menu. */
function groupsOf(item: Item, mega: boolean) {
  const links = (item.children ?? []).flatMap((child) => {
    const [link] = linksOf([child])
    return link ? [{ link, column: child.column?.trim() || null }] : []
  })
  if (!mega) return [{ heading: null, links: links.map((l) => l.link) }]
  // Links with the same heading share a column, in the order the headings
  // first appear; links with no heading share a column of their own.
  const columns = new Map<string | null, MenuLink[]>()
  for (const { link, column } of links) {
    columns.set(column, [...(columns.get(column) ?? []), link])
  }
  return [...columns].map(([heading, group]) => ({ heading, links: group }))
}

/**
 * The menu as the Site shows it. A link to a Page is resolved here, at read
 * time, from the Page's current path, so the menu follows the Page when its
 * path changes. An item with links of its own to show is a dropdown; else it
 * is a plain link; an item with neither a label nor anywhere to go is left
 * out.
 */
export function menuOf(items: NavigationBlock["items"]): MenuItem[] {
  return (items ?? []).flatMap((item, index): MenuItem[] => {
    const label = item.label?.trim()
    if (!label) return []
    const key = item.id ?? String(index)
    const groups = groupsOf(item, item.display === "mega")
    if (groups.some((group) => group.links.length > 0)) {
      return [
        {
          kind: item.display === "mega" ? "mega" : "dropdown",
          key,
          label,
          groups,
        },
      ]
    }
    // An item with dropdown links ignores its own link, which the Admin
    // hides: if none of the dropdown links resolve, the item is left out.
    if (item.children?.length) return []
    const href = hrefOf(item.link)
    return href ? [{ kind: "link", key, label, href }] : []
  })
}

/**
 * The Header's menu: top-level links and one level of dropdowns, each shown
 * as a list or as mega-menu columns, and a small-screen menu in a sheet.
 * The component is a server component that only resolves the links; the
 * interaction is in NavigationMenu.
 */
export function Navigation({
  block,
  context,
}: {
  block: NavigationBlock
  context: RegionContext
}) {
  const items = menuOf(block.items)
  if (items.length === 0) return null
  return <NavigationMenu items={items} idBase={`nav-${context.index}`} />
}
