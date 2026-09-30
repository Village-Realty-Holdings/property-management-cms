"use server"

import { revalidatePath } from "next/cache"

import type { SeoValues } from "../seoForm"
import { requireStaff } from "../session"
import { saveSeoAs, type SaveResult } from "../settingsSave"

/**
 * Saves the SEO defaults from the Admin's form as the Staff User. `values`
 * comes from the browser, so it is validated again here. The Site (robots,
 * sitemap, metadata) shows the change straight away.
 */
export async function saveSeo(
  values: SeoValues
): Promise<SaveResult<SeoValues>> {
  const { payload, as } = await requireStaff()
  const result = await saveSeoAs(payload, as, values)
  if (result.ok) {
    revalidatePath("/admin/settings/seo")
    revalidatePath("/", "layout")
  }
  return result
}
