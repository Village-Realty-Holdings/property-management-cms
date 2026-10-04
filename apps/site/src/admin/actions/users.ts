"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import { requireUser } from "../session"
import { removeUserAs } from "../users"

/** Removes a User from this Site; the screen's one Server Action. */
export async function removeUser(id: number): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await removeUserAs(payload, as, id)
  if (result.ok) revalidatePath("/admin/settings/users")
  return result
}
