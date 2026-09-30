import type { Payload, Where } from "payload"

import type { User } from "../../payload-types"
import {
  getRecentLayouts,
  pageToRecentItem,
  toPageRow,
  type PageRow,
  type RecentItem,
} from "./rows"
import {
  continueEditing,
  needsSeoAttention,
  waitingToPublish,
} from "./summaries"

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
 * published copy. `q` filters on title or path.
 */
export async function loadPageRows(
  payload: Payload,
  as: StaffAccess,
  { q }: { q?: string } = {}
): Promise<PageRow[]> {
  const { docs: latest } = await payload.find({
    collection: "pages",
    where: searchWhere(q),
    sort: "-updatedAt",
    pagination: false,
    depth: 0,
    draft: true,
    select: { title: true, path: true, updatedAt: true, _status: true },
    ...as,
  })
  if (latest.length === 0) return []

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
  return latest.map((page) => toPageRow(page, publishedStatus.get(page.id)))
}

/** A Published Page whose SEO lacks a title or a description. */
export type PageNeedingSeoAttention = {
  id: number
  title: string
  path: string
  missingTitle: boolean
  missingDescription: boolean
}

/**
 * The Published Pages missing an SEO title or description, judged on the
 * published copy (a Draft's SEO is not what search engines see). A Page not
 * yet published is not counted. The SEO screen's "Pages needing attention"
 * table can adopt this.
 */
export async function getPagesNeedingSeoAttention(
  payload: Payload,
  as: StaffAccess
): Promise<PageNeedingSeoAttention[]> {
  const { docs } = await payload.find({
    collection: "pages",
    where: { _status: { equals: "published" } },
    sort: "path",
    pagination: false,
    depth: 0,
    draft: false,
    select: { title: true, path: true, seo: true },
    ...as,
  })
  return docs
    .filter((page) => needsSeoAttention(page.seo))
    .map((page) => ({
      id: page.id,
      title: page.title,
      path: page.path,
      missingTitle: !page.seo?.title?.trim(),
      missingDescription: !page.seo?.description?.trim(),
    }))
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
  const [rows, seo] = await Promise.all([
    loadPageRows(payload, as),
    getPagesNeedingSeoAttention(payload, as),
  ])
  return {
    // Layouts join here in Phase 3 through getRecentLayouts().
    continueEditing: continueEditing([
      ...rows.map(pageToRecentItem),
      ...getRecentLayouts(),
    ]),
    waiting: waitingToPublish(rows),
    seoAttentionCount: seo.length,
    pageCount: rows.length,
  }
}
