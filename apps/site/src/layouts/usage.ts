import type { Payload, TypedUser } from "payload"

import {
  layoutLabel,
  resolveLayout,
  type LayoutCandidate,
  type LayoutChoice,
} from "./resolve"

/**
 * Which Pages use which Layout (spec Phase 3): every Page's latest version
 * (the Draft, if there is one) resolved with `resolveLayout`, so the Layouts
 * list ("Used by 3 Pages") and the Pages list ("Listings, via /stays") agree
 * with what the Site does.
 */

export type LayoutInfo = LayoutCandidate & {
  id: number
  /** ISO time of the last save. */
  updatedAt: string
}

/** What resolving a Page needs: its path and its stored Layout choice. */
export type PageLayoutFacts = {
  id: number
  title?: string
  path: string
  layout?: {
    mode?: string | null
    /** The picked Layout: an id, or the document when populated. */
    layout?: number | { id: number } | null
  } | null
}

function choiceOf(page: PageLayoutFacts): LayoutChoice {
  const mode = page.layout?.mode
  if (mode === "none") return { mode: "none" }
  if (mode === "specific") {
    const picked = page.layout?.layout
    return {
      mode: "specific",
      layoutId: picked && typeof picked === "object" ? picked.id : picked,
    }
  }
  return { mode: "route" }
}

export type LayoutUsage = {
  /** Layout id -> how many Pages resolve to it. Unused Layouts are absent. */
  usedBy: Map<number, number>
  /** Layout id -> the Pages that resolve to it, for naming them. */
  pagesBy: Map<number, { id: number; title: string }[]>
  /** Page id -> "Listings, via /stays", "Listings", "Main (default)" or "No Layout". */
  labels: Map<number, string>
}

/** Resolves each Page's Layout, then counts and labels. Pure. */
export function summarizeLayoutUsage(
  pages: readonly PageLayoutFacts[],
  layouts: readonly LayoutCandidate[]
): LayoutUsage {
  const usedBy = new Map<number, number>()
  const pagesBy = new Map<number, { id: number; title: string }[]>()
  const labels = new Map<number, string>()
  for (const page of pages) {
    const resolution = resolveLayout({
      path: page.path,
      choice: choiceOf(page),
      layouts,
    })
    labels.set(page.id, layoutLabel(resolution))
    if (resolution.layout) {
      const id = Number(resolution.layout.id)
      usedBy.set(id, (usedBy.get(id) ?? 0) + 1)
      const served = pagesBy.get(id) ?? []
      served.push({ id: page.id, title: page.title ?? `Page ${page.id}` })
      pagesBy.set(id, served)
    }
  }
  return { usedBy, pagesBy, labels }
}

/** Every Layout, by name. Anyone can read Layouts (they render on the Site). */
export async function loadLayoutInfos(
  payload: Payload,
  user: TypedUser
): Promise<LayoutInfo[]> {
  const { docs } = await payload.find({
    collection: "layouts",
    pagination: false,
    depth: 0,
    sort: "name",
    select: { name: true, paths: true, isDefault: true, updatedAt: true },
    overrideAccess: false,
    user,
  })
  return docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    paths: (doc.paths ?? []).map((row) => row.path),
    isDefault: Boolean(doc.isDefault),
    updatedAt: doc.updatedAt,
  }))
}

/** All Layouts, and how the Site's Pages use them. Staff only. */
export async function loadLayoutUsage(
  payload: Payload,
  as: { overrideAccess: false; user: TypedUser }
): Promise<LayoutUsage & { layouts: LayoutInfo[] }> {
  const [layouts, { docs: pages }] = await Promise.all([
    loadLayoutInfos(payload, as.user),
    payload.find({
      collection: "pages",
      pagination: false,
      depth: 0,
      draft: true,
      select: { title: true, path: true, layout: true },
      ...as,
    }),
  ])
  return { layouts, ...summarizeLayoutUsage(pages, layouts) }
}
