import type { Payload, Where } from "payload"

import { layoutDependents } from "../../collections/Layouts/deleteProtection"
import {
  loadLayoutInfos,
  loadLayoutUsage,
  summarizeLayoutUsage,
  type LayoutInfo,
} from "../../layouts/usage"
import type { User } from "../../payload-types"
import type { Dependent } from "../kit/dependents"
import {
  getLayoutRows,
  getRecentLayouts,
  layoutLabelForPage,
  pageToRecentItem,
  toPageRow,
  type LayoutRow,
  type PageRow,
  type RecentItem,
} from "./rows"
import { findPagesNeedingSeoAttention } from "../seoHealth"
import { continueEditing, waitingToPublish } from "./summaries"

/**
 * What the Admin's Dashboard and lists read, through the Local API as the
 * Staff User (apps/site ADR-0002). Takes the Payload instance and the
 * `as` options from `requireStaff()` so tests can use their own.
 */

export type StaffAccess = {
  overrideAccess: false
  user: User & { collection: "users" }
}

/** Search text for the Pages list: matches title or path, ignoring case. */
function searchWhere(q: string | undefined): Where | undefined {
  const text = q?.trim()
  if (!text) return undefined
  return {
    or: [{ title: { like: text } }, { path: { like: text } }],
  }
}

/**
 * Every Page as a list row, newest change first. Each row shows the newest
 * version (the Draft, if there is one); its status compares that with the
 * published copy; its Layout is the one its newest version resolves to.
 * `q` filters on title or path. `layouts` saves a second read when the
 * caller already has them.
 */
export async function loadPageRows(
  payload: Payload,
  as: StaffAccess,
  { q, layouts }: { q?: string; layouts?: readonly LayoutInfo[] } = {}
): Promise<PageRow[]> {
  const [{ docs: latest }, knownLayouts] = await Promise.all([
    payload.find({
      collection: "pages",
      where: searchWhere(q),
      sort: "-updatedAt",
      pagination: false,
      depth: 0,
      draft: true,
      select: {
        title: true,
        path: true,
        updatedAt: true,
        _status: true,
        layout: true,
        isTemplate: true,
      },
      ...as,
    }),
    layouts ?? loadLayoutInfos(payload, as.user),
  ])
  if (latest.length === 0) return []
  const { labels } = summarizeLayoutUsage(latest, knownLayouts)

  const { docs: published } = await payload.find({
    collection: "pages",
    where: { id: { in: latest.map((page) => page.id) } },
    pagination: false,
    depth: 0,
    draft: false,
    select: { _status: true },
    ...as,
  })
  const publishedStatus = new Map(published.map((p) => [p.id, p._status]))
  return latest.map((page) =>
    toPageRow(
      page,
      publishedStatus.get(page.id),
      layoutLabelForPage(labels, page.id)
    )
  )
}

/**
 * Every Layout for the Layouts list: its paths, how many Pages use it (every
 * Page's newest version, resolved), and the Pages that pick it explicitly,
 * which the Delete confirmation names. The default Layout can't be deleted,
 * so its dependents are not looked up.
 */
export async function loadLayoutRows(
  payload: Payload,
  as: StaffAccess
): Promise<LayoutRow[]> {
  const usage = await loadLayoutUsage(payload, as)
  const picked = await Promise.all(
    usage.layouts.map(
      async (layout): Promise<[number, Dependent[]]> => [
        layout.id,
        layout.isDefault
          ? []
          : await layoutDependents(payload, { id: layout.id, user: as.user }),
      ]
    )
  )
  return getLayoutRows(usage.layouts, usage, new Map(picked))
}

export type DashboardData = {
  continueEditing: RecentItem[]
  waiting: PageRow[]
  seoAttentionCount: number
  pageCount: number
}

/** Everything the Dashboard shows that comes from content. */
export async function loadDashboard(
  payload: Payload,
  as: StaffAccess
): Promise<DashboardData> {
  const layouts = await loadLayoutInfos(payload, as.user)
  const [rows, seo] = await Promise.all([
    loadPageRows(payload, as, { layouts }),
    findPagesNeedingSeoAttention(payload, as),
  ])
  return {
    continueEditing: continueEditing([
      ...rows.map(pageToRecentItem),
      ...getRecentLayouts(layouts),
    ]),
    waiting: waitingToPublish(rows),
    seoAttentionCount: seo.length,
    pageCount: rows.length,
  }
}
