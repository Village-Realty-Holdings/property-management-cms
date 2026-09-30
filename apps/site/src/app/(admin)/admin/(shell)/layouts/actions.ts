"use server"

import { requireStaff } from "@/admin/session"

/**
 * Duplicates a Layout under a new name. The Layouts collection arrives in
 * Phase 3 and replaces the body; until then the list is always empty, so no
 * row can call this.
 */
export async function duplicateLayout(formData: FormData): Promise<void> {
  await requireStaff()
  throw new Error(
    `Layouts are not available yet (cannot duplicate Layout ${String(formData.get("id"))}).`
  )
}
