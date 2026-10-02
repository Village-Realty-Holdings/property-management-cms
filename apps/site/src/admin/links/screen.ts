import type { Payload } from "payload"

import { Layouts } from "../../collections/Layouts"
import { Pages } from "../../collections/Pages"
import { validateHref } from "../../fields/link"
import type { Replacement } from "../replace/run"
import type { Access } from "../settingsSave"
import {
  isAppPath,
  kindOf,
  linksIn,
  replaceLink,
  sitePath,
  type LinkKind,
} from "./collect"

/**
 * The Links tool (Tools): every link on the Site, grouped by where it leads,
 * with whether an internal one still leads to a Published Page, read through
 * the Local API as the Staff User (apps/site ADR-0002). Pages are read in
 * their newest copy, the Draft Staff edit, as Replace Text reads them.
 */

/**
 * Whether a link leads somewhere:
 *  - `ok`           a Published Page, or a route of the app itself
 *  - `unpublished`  a Page visitors can't see yet
 *  - `missing`      no Page has the path, or the Page was deleted
 *  - `unchecked`    it leaves the Site, calls, mails or jumps within a Page
 */
export type LinkStatus = "ok" | "unpublished" | "missing" | "unchecked"

export type LinkUse = {
  kind: "Page" | "Page Template" | "Layout"
  title: string
  /** The editor that opens it. */
  href: string
  /** "Block 2, Hero: Cta: Link". */
  place: string
}

export type LinkRow = {
  /** Unique: the URL as stored, or the Page a menu points at. */
  key: string
  /** What the row shows: the URL, or "Page: About (/about)". */
  target: string
  /** The stored URL, which Replace can change. Null for a link to a Page. */
  url: string | null
  kind: LinkKind
  status: LinkStatus
  /** Why it is broken, in words; empty when it is not. */
  problem: string
  uses: LinkUse[]
}

const LAYOUT_FIELDS = Layouts.fields.filter(
  (field) => "name" in field && ["header", "footer"].includes(field.name)
)

export const isBroken = (row: Pick<LinkRow, "status">) =>
  row.status === "unpublished" || row.status === "missing"

/** Every link on the Site, one row per target: broken first, then most used. */
export async function loadLinks(
  payload: Payload,
  access: Access,
  { siteUrl }: { siteUrl?: string | null } = {}
): Promise<LinkRow[]> {
  const [latest, served, layouts] = await Promise.all([
    payload.find({
      collection: "pages",
      pagination: false,
      depth: 0,
      draft: true,
      sort: "title",
      ...access,
    }),
    payload.find({
      collection: "pages",
      pagination: false,
      depth: 0,
      draft: false,
      select: { path: true, title: true, _status: true },
      ...access,
    }),
    payload.find({
      collection: "layouts",
      pagination: false,
      depth: 0,
      sort: "name",
      ...access,
    }),
  ])

  // What visitors can open, and what only Staff can.
  const publishedPaths = new Set<string>()
  const publishedIds = new Set<number>()
  for (const page of served.docs) {
    if (page._status !== "published") continue
    publishedPaths.add(page.path)
    publishedIds.add(page.id)
  }
  const draftPaths = new Set(latest.docs.map((page) => page.path))
  const pagesById = new Map(latest.docs.map((page) => [page.id, page]))

  const rows = new Map<string, LinkRow>()
  const add = (use: LinkUse, row: Omit<LinkRow, "uses">) => {
    const existing = rows.get(row.key)
    if (existing) existing.uses.push(use)
    else rows.set(row.key, { ...row, uses: [use] })
  }

  const urlRow = (url: string): Omit<LinkRow, "uses"> => {
    const kind = kindOf(url, siteUrl)
    const base = { key: `url:${url}`, target: url, url, kind }
    if (kind !== "internal")
      return { ...base, status: "unchecked", problem: "" }
    const path = sitePath(url, siteUrl)!
    if (publishedPaths.has(path) || isAppPath(path)) {
      return { ...base, status: "ok", problem: "" }
    }
    return draftPaths.has(path)
      ? {
          ...base,
          status: "unpublished",
          problem: "The Page at this path is not published.",
        }
      : { ...base, status: "missing", problem: "No Page has this path." }
  }

  const pageRow = (pageId: number): Omit<LinkRow, "uses"> => {
    const page = pagesById.get(pageId)
    const base = { key: `page:${pageId}`, url: null, kind: "internal" as const }
    if (!page) {
      return {
        ...base,
        target: "A Page that was deleted",
        status: "missing",
        problem: "The Page this pointed at was deleted.",
      }
    }
    const target = `Page: ${page.title} (${page.path})`
    return publishedIds.has(pageId)
      ? { ...base, target, status: "ok", problem: "" }
      : {
          ...base,
          target,
          status: "unpublished",
          problem: "This Page is not published.",
        }
  }

  const collect = (
    use: Omit<LinkUse, "place">,
    found: ReturnType<typeof linksIn>
  ) => {
    for (const link of found) {
      const place = link.block ? `${link.block}: ${link.where}` : link.where
      add(
        { ...use, place },
        link.target.type === "url"
          ? urlRow(link.target.url)
          : pageRow(link.target.pageId)
      )
    }
  }

  for (const page of latest.docs) {
    collect(
      {
        kind: page.isTemplate ? "Page Template" : "Page",
        title: page.title,
        href: `/admin/pages/${page.id}`,
      },
      linksIn(Pages.fields, page)
    )
  }
  for (const layout of layouts.docs) {
    collect(
      {
        kind: "Layout",
        title: layout.name,
        href: `/admin/layouts/${layout.id}`,
      },
      linksIn(LAYOUT_FIELDS, layout)
    )
  }

  return [...rows.values()].sort(
    (a, b) =>
      Number(isBroken(b)) - Number(isBroken(a)) ||
      b.uses.length - a.uses.length ||
      a.target.localeCompare(b.target)
  )
}

type Loaded =
  | { ok: true; replacement: Replacement }
  | { ok: false; message: string }

/** Pointing every use of one URL at another, as a site-wide replace. */
export function linkReplacement(input: unknown): Loaded {
  const raw = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >
  const from = typeof raw.from === "string" ? raw.from.trim() : ""
  const to = typeof raw.to === "string" ? raw.to.trim() : ""
  if (!from) return { ok: false, message: "Choose the link to replace." }
  if (!to) return { ok: false, message: "Enter the link to use instead." }
  if (from === to) {
    return { ok: false, message: "The new link is the same as the old one." }
  }
  const valid = validateHref(to)
  if (valid !== true) return { ok: false, message: valid }
  return {
    ok: true,
    replacement: {
      rewrite: (fields, data) => replaceLink(fields, data, { from, to }),
      summary: `Replace Link: “${from}” with “${to}”`,
      settings: false,
      templates: raw.includeTemplates === true,
    },
  }
}
