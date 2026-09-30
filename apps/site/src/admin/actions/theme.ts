"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import { requireStaff } from "../session"
import { restoreThemeAs } from "../theme/themeScreen"

/**
 * The Theme screen's Server Actions. Each runs as the Staff User (apps/site
 * ADR-0002) and validates what the browser sent again.
 */

/**
 * Restores an earlier Theme version. It is saved as the newest version, so
 * the Site shows it on the next request; the Site's layout, the Theme screen
 * and the Dashboard's Theme card are refreshed.
 */
export async function restoreTheme(versionId: number): Promise<FormState> {
  const { payload, as } = await requireStaff()
  const result = await restoreThemeAs(payload, as, versionId)
  if (result.ok) {
    revalidatePath("/admin/theme")
    revalidatePath("/admin")
    revalidatePath("/", "layout")
  }
  return result
}
