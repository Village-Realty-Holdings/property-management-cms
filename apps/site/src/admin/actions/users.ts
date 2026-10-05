"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "../formState"
import { requireUser } from "../session"
import { deleteUserAs, saveUserAs } from "../users"

const USERS_PATH = "/admin/settings/users"

/** Adds a User (`id` null) or saves one, with their Site Access. */
export async function saveUser(
  id: number | null,
  data: FormData
): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await saveUserAs(payload, as, id, data)
  if (result.ok) revalidatePath(USERS_PATH)
  return result
}

/** Deletes a User from the Registry, for every Site. */
export async function deleteRegistryUser(id: number): Promise<FormState> {
  const { payload, as } = await requireUser()
  const result = await deleteUserAs(payload, as, id)
  if (result.ok) revalidatePath(USERS_PATH)
  return result
}
