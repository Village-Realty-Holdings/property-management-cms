"use server"

import { revalidatePath } from "next/cache"

import type { BrandValues } from "../brandForm"
import { requireStaff } from "../session"
import { saveBrandAs, type SaveResult } from "../settingsSave"

/**
 * Saves the Brand from the Admin's form as the Staff User. `values` comes
 * from the browser, so it is validated again here. The Site shows the
 * change straight away.
 */
export async function saveBrand(
  values: BrandValues
): Promise<SaveResult<BrandValues>> {
  const { payload, as } = await requireStaff()
  const result = await saveBrandAs(payload, as, values)
  if (result.ok) {
    revalidatePath("/admin/settings/brand")
    revalidatePath("/", "layout")
  }
  return result
}
