"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "../session"
import type { SaveGuard } from "../staleSave"
import type { ThemeInputs } from "../../theme"
import {
  restoreThemeAs,
  saveThemeAs,
  type ThemeSaveResult,
} from "../theme/themeScreen"

/**
 * The Theme screen's Server Actions. Each runs as the User (apps/site
 * ADR-0002) and validates what the browser sent again.
 */

/**
 * Restores an earlier Theme version. It is saved as the newest version, so
 * the Site shows it on the next request; the Site's layout, the Theme screen
 * and the Dashboard's Theme card are refreshed.
 */
export async function restoreTheme(
  versionId: number,
  guard?: SaveGuard
): Promise<ThemeSaveResult> {
  const { payload, as } = await requireUser()
  const result = await restoreThemeAs(payload, as, versionId, guard)
  if (result.ok) {
    revalidatePath("/admin/theme")
    revalidatePath("/admin")
    revalidatePath("/", "layout")
  }
  return result
}

/**
 * Saves the Theme: it is live on the Site on the next request. A save that
 * changes nothing makes no version (the message says so). The inputs come from
 * the browser, so the Theme record validates every value again.
 */
export async function saveTheme(
  inputs: ThemeInputs,
  note?: string | null,
  guard?: SaveGuard
): Promise<ThemeSaveResult> {
  const { payload, as } = await requireUser()
  const result = await saveThemeAs(payload, as, inputs, note, guard)
  if (result.ok) {
    revalidatePath("/admin/theme")
    revalidatePath("/admin")
    revalidatePath("/", "layout")
  }
  return result
}
