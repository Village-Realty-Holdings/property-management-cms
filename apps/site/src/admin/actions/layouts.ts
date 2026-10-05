"use server"

import { revalidatePath } from "next/cache"

import type { LayoutDocument } from "../editor/state"
import {
  loadPreviewPage,
  restoreLayoutAs,
  saveLayoutAs,
  type LayoutResult,
  type PreviewPage,
} from "../layouts/layoutScreen"
import {
  makeLayoutFromPageAs,
  type MakeLayoutResult,
} from "../layouts/makeFromPage"
import { requireUser } from "../session"
import type { Revision, SaveGuard } from "../staleSave"

/**
 * Layout mode's Server Actions. Each runs as the User (apps/site
 * ADR-0002) and validates what the browser sent again. A Layout goes live on
 * save (ADR-0006), so a write refreshes the lists that show it and the
 * Site's pages, which wear the Layout.
 */

function revalidateAfterLayoutWrite() {
  revalidatePath("/admin/layouts")
  revalidatePath("/admin/pages")
  revalidatePath("/admin")
  revalidatePath("/", "layout")
}

/** Saves the open Layout; it is live on every Page that uses it at once. */
export async function saveLayoutDocument(
  id: number,
  doc: LayoutDocument,
  options: { note?: string | null } & SaveGuard = {}
): Promise<LayoutResult> {
  const { payload, as } = await requireUser()
  const result = await saveLayoutAs(payload, as, id, doc, options)
  if (result.ok) revalidateAfterLayoutWrite()
  return result
}

/** Restores an earlier version of the Layout, saved as the newest. */
export async function restoreLayoutDocument(
  id: number,
  versionId: number,
  guard?: SaveGuard
): Promise<LayoutResult> {
  const { payload, as } = await requireUser()
  const result = await restoreLayoutAs(payload, as, id, versionId, guard)
  if (result.ok) revalidateAfterLayoutWrite()
  return result
}

/** The Page the canvas shows the Layout around, after Ctrl-K picks another. */
export async function loadLayoutPreviewPage(
  pageId: number
): Promise<PreviewPage | null> {
  const { payload, as } = await requireUser()
  return loadPreviewPage(payload, as, pageId)
}

/**
 * "Make a new Layout from this one", from the Page tab: copies the Layout
 * under `name` and switches the Page's Draft to the copy. The Page stays
 * unpublished; Publish is the User's to press.
 */
export async function makeLayoutFromPageDocument(input: {
  pageId: number
  layoutId: number
  name: string
  expected?: Revision | null
  force?: boolean
}): Promise<MakeLayoutResult> {
  const { payload, as } = await requireUser()
  const result = await makeLayoutFromPageAs(payload, as, input)
  if (result.ok) {
    revalidatePath("/admin/layouts")
    revalidatePath("/admin/pages")
  }
  return result
}
