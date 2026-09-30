import type { LayoutInfo, LayoutUsage } from "../../layouts/usage"
import type { Page } from "../../payload-types"
import type { Dependent } from "../kit/dependents"
import { derivePageStatus, type PageStatus } from "./pageStatus"

/** One line of the Pages list. */
export type PageRow = {
  id: number
  title: string
  path: string
  status: PageStatus
  /** The Layout the Page uses, as shown: "Listings, via /stays" or "No Layout". */
  layout: string
  updatedAt: string
}

/** One line of the Layouts list. */
export type LayoutRow = {
  id: number
  name: string
  /** Path prefixes the Layout covers. */
  paths: string[]
  /** The Site's default Layout: Pages that nothing else covers use it. */
  isDefault: boolean
  /** How many Pages use it (by path, by choice or as the default). */
  usedByPages: number
  /**
   * The Pages that pick this Layout explicitly, for the Delete confirmation:
   * deleting it would leave them without. Empty when none do.
   */
  dependents: Dependent[]
  /**
   * Every Page that resolves to this Layout (by path, by choice or as the
   * default), so the Delete confirmation names what a live change reaches.
   * Its length is `usedByPages`.
   */
  pages: Dependent[]
  updatedAt: string
}

/** Something the Continue editing list can offer: a Page or a Layout. */
export type RecentItem = {
  kind: "page" | "layout"
  id: number
  title: string
  href: string
  updatedAt: string
}

/** Where New Layout goes. The Visual Editor takes this over in Phase 5. */
export const NEW_LAYOUT_HREF = "/admin/layouts/new"

/** What the Pages list shows when a Page uses no Layout. */
export const NO_LAYOUT = "No Layout"

/**
 * The Layout a Page uses, as a label ("Listings, via /stays", "Listings",
 * "Main (default)"), read from `summarizeLayoutUsage`. "No Layout" when the
 * Page is not in the usage.
 */
export function layoutLabelForPage(
  labels: LayoutUsage["labels"],
  pageId: number
): string {
  return labels.get(pageId) ?? NO_LAYOUT
}

type PageFacts = Pick<Page, "id" | "title" | "path" | "updatedAt" | "_status">

/**
 * A Pages list row. `latest` is the Page's newest version (the Draft, if
 * any); `publishedStatus` is the status of the copy visitors are served;
 * `layout` is the label from `layoutLabelForPage`.
 */
export function toPageRow(
  latest: PageFacts,
  publishedStatus: Page["_status"],
  layout: string = NO_LAYOUT
): PageRow {
  return {
    id: latest.id,
    title: latest.title,
    path: latest.path,
    status: derivePageStatus({
      published: publishedStatus,
      latest: latest._status,
    }),
    layout,
    updatedAt: latest.updatedAt,
  }
}

export function pageToRecentItem(row: PageRow): RecentItem {
  return {
    kind: "page",
    id: row.id,
    title: row.title,
    href: `/admin/pages/${row.id}`,
    updatedAt: row.updatedAt,
  }
}

/**
 * The Layouts to list, by name. `dependents` holds, per Layout id, the Pages
 * that pick it explicitly.
 */
export function getLayoutRows(
  layouts: readonly LayoutInfo[],
  usage: Pick<LayoutUsage, "usedBy"> & Partial<Pick<LayoutUsage, "pagesBy">>,
  dependents: ReadonlyMap<number, Dependent[]> = new Map()
): LayoutRow[] {
  return layouts
    .map((layout) => ({
      id: layout.id,
      name: layout.name,
      paths: [...layout.paths],
      isDefault: layout.isDefault,
      usedByPages: usage.usedBy.get(layout.id) ?? 0,
      dependents: dependents.get(layout.id) ?? [],
      pages: (usage.pagesBy?.get(layout.id) ?? []).map(
        (page): Dependent => ({
          kind: "Page",
          name: page.title,
          href: `/admin/pages/${page.id}`,
        })
      ),
      updatedAt: layout.updatedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Layouts for Continue editing; `continueEditing` keeps the newest few. */
export function getRecentLayouts(
  layouts: readonly Pick<LayoutInfo, "id" | "name" | "updatedAt">[]
): RecentItem[] {
  return layouts.map((layout) => ({
    kind: "layout",
    id: layout.id,
    title: layout.name,
    href: `/admin/layouts/${layout.id}`,
    updatedAt: layout.updatedAt,
  }))
}
