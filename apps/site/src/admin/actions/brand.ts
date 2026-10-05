"use server"

import { revalidatePath } from "next/cache"

import type { BrandValues } from "../brandForm"
import { requireUser } from "../session"
import { saveBrandAs, type SaveResult } from "../settingsSave"
import type { SaveGuard } from "../staleSave"

/**
 * Saves the Brand from the Admin's form as the User. `values` comes
 * from the browser, so it is validated again here. The Site shows the
 * change straight away.
 */
export async function saveBrand(
  values: BrandValues,
  guard?: SaveGuard
): Promise<SaveResult<BrandValues>> {
  const { payload, as } = await requireUser()
  const result = await saveBrandAs(payload, as, values, guard)
  if (result.ok) {
    revalidatePath("/admin/settings/brand")
    revalidatePath("/", "layout")
  }
  return result
}
