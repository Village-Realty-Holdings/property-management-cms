"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import {
  applyThemeAs,
  deleteSavedThemeAs,
  exportThemeAs,
  importThemeAs,
  renameSavedThemeAs,
  saveCurrentThemeAs,
  type ExportResult,
} from "../savedThemes"
import { requireUser } from "../session"

/**
 * The Themes screen's Server Actions (apps/site ADR-0009). Each runs as the
 * User (ADR-0002) and checks what the browser sent again.
 */

const SCREEN = "/admin/tools/themes"

/** Applies a Theme from the list: the Site wears it on the next request. */
export async function applyTheme(id: string): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await applyThemeAs(payload, as, id)
  if (result.ok) {
    revalidatePath(SCREEN)
    revalidatePath("/admin/theme")
    revalidatePath("/admin")
    revalidatePath("/", "layout")
  }
  return result
}

export async function saveCurrentTheme(name: string): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await saveCurrentThemeAs(payload, as, name)
  if (result.ok) revalidatePath(SCREEN)
  return result
}

export async function renameSavedTheme(
  id: string,
  name: string
): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await renameSavedThemeAs(payload, as, id, name)
  if (result.ok) revalidatePath(SCREEN)
  return result
}

export async function deleteSavedTheme(id: string): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await deleteSavedThemeAs(payload, as, id)
  if (result.ok) revalidatePath(SCREEN)
  return result
}

export async function exportTheme(id: string): Promise<ExportResult> {
  const { payload, as } = await requireUser()
  return exportThemeAs(payload, as, id)
}

/** Adds the Theme file's text to the list as a Saved Theme. */
export async function importTheme(text: string): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await importThemeAs(payload, as, text)
  if (result.ok) revalidatePath(SCREEN)
  return result
}
