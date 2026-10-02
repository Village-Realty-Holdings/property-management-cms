"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import type { PageDocument } from "../editor/state"
import {
  deletePageAs,
  savePageAs,
  type PageIntent,
  type PageSaveResult,
} from "../pageSave"
import {
  exportPageAs,
  importPageAs,
  type ExportResult,
  type ImportResult,
} from "../pageTransfer"
import { requireStaff } from "../session"

/**
 * Saves a Page from the Visual Editor as the Staff User: as a Draft,
 * published, or taken off the Site. `id` is null for a new Page. The editor
 * shows the toast and the new status from the result. Nothing here redirects:
 * the editor stays where it is, so what was typed is never lost.
 */
export async function savePage(input: {
  id: number | null
  intent: PageIntent
  document: PageDocument
}): Promise<PageSaveResult> {
  const { payload, as } = await requireStaff()
  const result = await savePageAs(payload, as, input)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin")
    // A Published Page changes what visitors see.
    revalidatePath("/", "layout")
  }
  return result
}

/** Deletes a Page. The Page tab asks first (<DeletePageButton>). */
export async function deletePage(id: number): Promise<FormState> {
  const { payload, as } = await requireStaff()
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
  const { payload, as } = await requireStaff()
  return exportPageAs(payload, as, id)
}

/** Adds a Page file's text to the Site as a new Draft (Pages list, Import). */
export async function importPage(text: string): Promise<ImportResult> {
  const { payload, as } = await requireStaff()
  const result = await importPageAs(payload, as, text)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin/pages/templates")
    revalidatePath("/admin")
  }
  return result
}
