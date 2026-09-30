import type { Page } from "../../payload-types"
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

/** One line of the Layouts list (the collection arrives in Phase 3). */
export type LayoutRow = {
  id: number
  name: string
  /** Path prefixes the Layout is the default for. */
  paths: string[]
  /** How many Pages use it. */
  usedByPages: number
  updatedAt: string
}

/** Something the Continue editing list can offer: a Page or (later) a Layout. */
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
 * The Layout a Page uses, as a label. Layouts do not exist yet (Phase 3), so
 * every Page reads "No Layout". Phase 3 replaces this with the resolved
 * Layout ("Listings, via /stays").
 */
export function layoutLabelForPage(): string {
  return NO_LAYOUT
}

type PageFacts = Pick<Page, "id" | "title" | "path" | "updatedAt" | "_status">

/**
 * A Pages list row. `latest` is the Page's newest version (the Draft, if
 * any); `publishedStatus` is the status of the copy visitors are served.
 */
export function toPageRow(
  latest: PageFacts,
  publishedStatus: Page["_status"]
): PageRow {
  return {
    id: latest.id,
    title: latest.title,
    path: latest.path,
    status: derivePageStatus({
      published: publishedStatus,
      latest: latest._status,
    }),
    layout: layoutLabelForPage(),
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

/** The Layouts to list. There is no Layouts collection yet, so none. */
export function getLayoutRows(): LayoutRow[] {
  return []
}

/** Recently edited Layouts for Continue editing; none until Phase 3. */
export function getRecentLayouts(): RecentItem[] {
  return []
}
