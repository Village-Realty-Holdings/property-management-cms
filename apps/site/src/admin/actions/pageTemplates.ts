"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import { addStarterTemplatesAs } from "../pageTemplates"
import { requireStaff } from "../session"

/** Adds the starter Page Templates (Home, Tuck-in) the Site doesn't have. */
export async function addStarterTemplates(): Promise<FormState> {
  const { payload, as } = await requireStaff()
  const result = await addStarterTemplatesAs(payload, as)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin/pages/templates")
    revalidatePath("/admin")
  }
  return result
}
