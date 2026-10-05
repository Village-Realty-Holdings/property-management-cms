"use server"

import { revalidatePath } from "next/cache"

import type { SeoValues } from "../seoForm"
import { requireUser } from "../session"
import { saveSeoAs, type SaveResult } from "../settingsSave"
import type { SaveGuard } from "../staleSave"

/**
 * Saves the SEO defaults from the Admin's form as the User. `values`
 * comes from the browser, so it is validated again here. The Site (robots,
 * sitemap, metadata) shows the change straight away.
 */
export async function saveSeo(
  values: SeoValues,
  guard?: SaveGuard
): Promise<SaveResult<SeoValues>> {
  const { payload, as } = await requireUser()
  const result = await saveSeoAs(payload, as, values, guard)
  if (result.ok) {
    revalidatePath("/admin/settings/seo")
    revalidatePath("/", "layout")
  }
  return result
}
