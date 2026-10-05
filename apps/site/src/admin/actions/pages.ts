"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import type { PageDocument } from "../editor/state"
import { restorePageVersionAs, type PageRestoreResult } from "../pageHistory"
import {
  deletePageAs,
  savePageAs,
  type PageIntent,
  type PageSaveResult,
} from "../pageSave"
import { pagePathTakenAs } from "../newPage"
import {
  exportPageAs,
  importPageAs,
  type ExportResult,
  type ImportResult,
} from "../pageTransfer"
import { duplicatePageAs } from "../pageDuplicate"
import { requireUser } from "../session"
import type { Revision, SaveGuard } from "../staleSave"

/**
 * Saves a Page from the Visual Editor as the User: as a Draft,
 * published, or taken off the Site. `id` is null for a new Page. The editor
 * shows the toast and the new status from the result. Nothing here redirects:
 * the editor stays where it is, so what was typed is never lost.
 */
export async function savePage(input: {
  id: number | null
  intent: PageIntent
  document: PageDocument
  expected?: Revision | null
  force?: boolean
}): Promise<PageSaveResult> {
  const { payload, as } = await requireUser()
  const result = await savePageAs(payload, as, input)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin")
    // A Published Page changes what visitors see.
    revalidatePath("/", "layout")
  }
  return result
}

/** Saves an earlier version of a Page as a new Draft (the History tab). */
export async function restorePageVersion(
  id: number,
  versionId: number,
  guard?: SaveGuard
): Promise<PageRestoreResult> {
  const { payload, as } = await requireUser()
  const result = await restorePageVersionAs(payload, as, id, versionId, guard)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin")
  }
  return result
}

/** Deletes a Page. The Page tab asks first (<DeletePageButton>). */
export async function deletePage(id: number): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await deletePageAs(payload, as, id)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin")
    revalidatePath("/", "layout")
  }
  return result
}

/** A Page as a file to download (Pages list, Export). */
export async function exportPage(id: number): Promise<ExportResult> {
  const { payload, as } = await requireUser()
  return exportPageAs(payload, as, id)
}

/** Adds a Page file's text to the Site as a new Draft (Pages list, Import). */
export async function importPage(text: string): Promise<ImportResult> {
  const { payload, as } = await requireUser()
  const result = await importPageAs(payload, as, text)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin/pages/templates")
    revalidatePath("/admin")
  }
  return result
}

/** Whether a Page already uses this path (the New Page dialog, on submit). */
export async function pagePathTaken(path: string): Promise<boolean> {
  const { payload, as } = await requireUser()
  return pagePathTakenAs(payload, as, path)
}

/** Adds a Draft copy of a Page, "Title (copy)" at a free path (Pages list). */
export async function duplicatePage(id: number): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await duplicatePageAs(payload, as, id)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin/pages/templates")
    revalidatePath("/admin")
  }
  return result
}
