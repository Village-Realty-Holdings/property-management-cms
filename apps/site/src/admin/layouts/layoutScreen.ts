import type { Payload } from "payload"
import { NotFound } from "payload"

import { defaultLayoutData } from "../../layouts/defaultLayout"
import {
  listLayoutHistory,
  restoreLayoutVersion,
  saveLayout,
} from "../../layouts/record"
import { loadLayoutUsage } from "../../layouts/usage"
import type { Layout, Page } from "../../payload-types"
import type { PageBlock } from "../../site/blocks/types"
import type { StaffAccess } from "../dashboard/queries"
import { loadPageRows } from "../dashboard/queries"
import type { LayoutDocument } from "../editor/state"
import type { PageOption } from "../editor/fields/context"
import { formStateFromError, type FormState } from "../formState"
import type { BlockValues } from "../pageForm"

/**
 * What Layout mode of the Visual Editor reads and does, through the Local API
 * as the Staff User (apps/site ADR-0002). A Layout goes live on save
 * (ADR-0006), so a save here changes every Page that uses it. The Server
 * Actions pass the user's `as`; kept apart from them so it runs in tests
 * without Next.
 */

/** The name a new Layout starts with. */
export const UNTITLED_LAYOUT = "Untitled Layout"

/** One saved version, as the History tab shows it. */
export type LayoutVersionRow = {
  id: number
  /** ISO time of the save; the History tab shows it in the viewer's time zone. */
  savedAt: string
  /** Who saved it; null when that user has been deleted. */
  author: string | null
  /** What changed, or the Staff User's note. */
  summary: string
  /** The newest version is the one on the Site. */
  isLive: boolean
}

/** A Page the canvas shows the Layout around: its newest version's Blocks. */
export type PreviewPage = {
  id: number
  title: string
  path: string
  blocks: PageBlock[]
}

export type LayoutScreen = {
  id: number
  doc: LayoutDocument
  /** How many Pages use the Layout; what a save reaches. */
  usedBy: number
  preview: PreviewPage | null
  history: LayoutVersionRow[]
  /** The Pages a link in a Block can point to. */
  pages: PageOption[]
}

/** What a save or a restore answers: the stored state, to start from again. */
export type LayoutResult = FormState & {
  doc?: LayoutDocument
  usedBy?: number
  history?: LayoutVersionRow[]
}

const GONE = "That Layout no longer exists."
const VERSION_GONE = "That version no longer exists."

const pagesWord = (n: number) => `${n} ${n === 1 ? "Page" : "Pages"}`

/** "Layout saved: 2 Pages changed." */
function reach(what: string, usedBy: number): string {
  return usedBy === 0
    ? `${what}. No Pages use it yet.`
    : `${what}: ${pagesWord(usedBy)} changed.`
}

// ── The document ─────────────────────────────────────────────────────────────

/** A stored Layout as the editor edits it. */
export function layoutToDocument(layout: Layout): LayoutDocument {
  return {
    kind: "layout",
    name: layout.name,
    paths: (layout.paths ?? []).map((row) => row.path),
    isDefault: Boolean(layout.isDefault),
    header: (layout.header ?? []) as unknown as BlockValues[],
    footer: (layout.footer ?? []) as unknown as BlockValues[],
  }
}

/**
 * Block rows the editor made carry a temporary id ("new-3"). A row id is the
 * table's key, so it would collide across Layouts: those rows are stored
 * without one and get a real id.
 */
function withoutTemporaryIds<T extends { id?: string | null }>(
  blocks: readonly T[]
): T[] {
  return blocks.map((block) => {
    if (typeof block.id !== "string" || !block.id.startsWith("new-")) {
      return block
    }
    const row = { ...block }
    delete row.id
    return row
  })
}

// ── Reading ──────────────────────────────────────────────────────────────────

async function readVersionRows(
  payload: Payload,
  access: StaffAccess,
  id: number
): Promise<LayoutVersionRow[]> {
  const versions = await listLayoutHistory(payload, { user: access.user, id })
  return versions.map((version) => ({
    id: version.id,
    savedAt: version.savedAt,
    author: version.author?.name ?? null,
    summary: version.summary,
    isLive: version.isLive,
  }))
}

/** A Page's newest version (its Draft, if it has one), with Blocks populated. */
export async function loadPreviewPage(
  payload: Payload,
  access: StaffAccess,
  pageId: number
): Promise<PreviewPage | null> {
  if (!Number.isInteger(pageId)) return null
  const page: Page | null = await payload
    .findByID({
      collection: "pages",
      id: pageId,
      draft: true,
      depth: 1,
      ...access,
    })
    .catch((error: unknown) => {
      if (error instanceof NotFound) return null
      throw error
    })
  if (!page) return null
  return {
    id: page.id,
    title: page.title,
    path: page.path,
    blocks: page.blocks ?? [],
  }
}

/**
 * Everything Layout mode opens with, or null when the Layout is not there.
 * The canvas shows the Layout around the first Page that uses it; a Layout
 * no Page uses is shown around Home, and around an empty Page when the Site
 * has no Home.
 */
export async function loadLayoutScreen(
  payload: Payload,
  access: StaffAccess,
  id: number
): Promise<LayoutScreen | null> {
  if (!Number.isInteger(id) || id <= 0) return null
  const layout = await payload
    .findByID({ collection: "layouts", id, depth: 0, ...access })
    .catch((error: unknown) => {
      if (error instanceof NotFound) return null
      throw error
    })
  if (!layout) return null

  const [usage, history, pageRows] = await Promise.all([
    loadLayoutUsage(payload, access),
    readVersionRows(payload, access, id),
    loadPageRows(payload, access),
  ])
  const using = usage.pagesBy.get(id) ?? []
  const previewId =
    using[0]?.id ?? pageRows.find((row) => row.path === "/")?.id ?? null

  return {
    id,
    doc: layoutToDocument(layout),
    usedBy: usage.usedBy.get(id) ?? 0,
    preview:
      previewId === null
        ? null
        : await loadPreviewPage(payload, access, previewId),
    history,
    pages: pageRows.map(({ id: pageId, title, path }) => ({
      id: pageId,
      title,
      path,
    })),
  }
}

// ── Writing ──────────────────────────────────────────────────────────────────

/** The stored Layout, how far it reaches and its history, after a write. */
async function resultAfterWrite(
  payload: Payload,
  access: StaffAccess,
  saved: Layout,
  message: (usedBy: number) => string
): Promise<LayoutResult> {
  const [usage, history] = await Promise.all([
    loadLayoutUsage(payload, access),
    readVersionRows(payload, access, saved.id),
  ])
  const usedBy = usage.usedBy.get(saved.id) ?? 0
  return {
    ok: true,
    message: message(usedBy),
    doc: layoutToDocument(saved),
    usedBy,
    history,
  }
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof NotFound ||
    (error as { status?: number } | null)?.status === 404
  )
}

/**
 * Saves the Layout's name, paths, Header and Footer as the Staff User. It is
 * live on every Page that uses it at once (ADR-0006). The document comes from
 * the browser, so Payload validates every value again; a refusal comes back
 * as a failure to show inline.
 */
export async function saveLayoutAs(
  payload: Payload,
  access: StaffAccess,
  id: number,
  doc: LayoutDocument
): Promise<LayoutResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: GONE }
  if (doc?.kind !== "layout") {
    return { ok: false, message: "That is not a Layout." }
  }
  const name = typeof doc.name === "string" ? doc.name.trim() : ""
  if (!name) return { ok: false, message: "Give the Layout a name." }
  try {
    const saved = await saveLayout(payload, {
      user: access.user,
      id,
      data: {
        name,
        header: withoutTemporaryIds(
          (doc.header ?? []) as unknown as NonNullable<Layout["header"]>
        ),
        footer: withoutTemporaryIds(
          (doc.footer ?? []) as unknown as NonNullable<Layout["footer"]>
        ),
        paths: (doc.paths ?? [])
          .filter((path) => path.trim() !== "")
          .map((path) => ({ path })),
        isDefault: Boolean(doc.isDefault),
      },
    })
    return await resultAfterWrite(payload, access, saved, (n) =>
      reach("Layout saved", n)
    )
  } catch (error) {
    return isMissing(error)
      ? { ok: false, message: GONE }
      : formStateFromError(error)
  }
}

/**
 * Puts an earlier version live again. It is saved as the newest version, so
 * the history only grows.
 */
export async function restoreLayoutAs(
  payload: Payload,
  access: StaffAccess,
  id: number,
  versionId: number
): Promise<LayoutResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: GONE }
  if (!Number.isInteger(versionId) || versionId <= 0) {
    return { ok: false, message: VERSION_GONE }
  }
  try {
    const saved = await restoreLayoutVersion(payload, {
      user: access.user,
      id,
      versionId,
    })
    return await resultAfterWrite(payload, access, saved, (n) =>
      reach("Version restored", n)
    )
  } catch (error) {
    return isMissing(error)
      ? { ok: false, message: VERSION_GONE }
      : formStateFromError(error)
  }
}

/**
 * Makes a Layout from the default Layout's content (the Brand's logo, phone,
 * address and links around every Page), called "Untitled Layout", numbered
 * when that is taken. It has no paths and is not the default, unless it is
 * the Site's first Layout. Returns its id, to open it.
 */
export async function createUntitledLayout(
  payload: Payload,
  access: StaffAccess
): Promise<number> {
  const { docs } = await payload.find({
    collection: "layouts",
    pagination: false,
    depth: 0,
    select: { name: true },
    ...access,
  })
  const taken = new Set(docs.map((doc) => doc.name.trim().toLowerCase()))
  let name: string = UNTITLED_LAYOUT
  for (let n = 2; taken.has(name.toLowerCase()); n++) {
    name = `${UNTITLED_LAYOUT} ${n}`
  }
  const { header, footer } = defaultLayoutData()
  const made = await saveLayout(payload, {
    user: access.user,
    data: { name, header, footer, paths: [], isDefault: false },
  })
  return made.id
}
