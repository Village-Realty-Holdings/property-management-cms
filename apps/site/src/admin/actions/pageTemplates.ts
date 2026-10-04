"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import {
  addStarterTemplatesAs,
  loadPageTemplateRows,
  type PageTemplateRow,
} from "../pageTemplates"
import { requireUser } from "../session"

/** Adds the starter Page Templates (Home, Tuck-in) the Site doesn't have. */
export async function addStarterTemplates(): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await addStarterTemplatesAs(payload, as)
  if (result.ok) {
    revalidatePath("/admin/pages")
    revalidatePath("/admin/pages/templates")
    revalidatePath("/admin")
  }
  return result
}

/** The Page Templates a New Page can start from (the New Page dialog). */
export async function listPageTemplates(): Promise<PageTemplateRow[]> {
  const { payload, as } = await requireUser()
  return loadPageTemplateRows(payload, as)
}
