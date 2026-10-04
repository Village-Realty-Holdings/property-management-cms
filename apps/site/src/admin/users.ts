import "server-only"

import { NotFound, type Payload } from "payload"

import { formStateFromError, type FormState } from "./formState"
import type { UserAccess } from "./theme/themeScreen"

/** One User in the Users list. */
export type UserRow = {
  id: number
  /** The name from Entra ID, or empty when Entra gave none. */
  name: string
  email: string
  /** The signed-in User: listed, but never removable by themselves. */
  isYou: boolean
}

/** Every User of this Site, by name then email, with the signed-in User marked. */
export async function loadUserRows(
  payload: Payload,
  access: UserAccess
): Promise<UserRow[]> {
  const { docs } = await payload.find({
    collection: "users",
    limit: 0,
    pagination: false,
    depth: 0,
    ...access,
  })
  return docs
    .map((doc) => ({
      id: doc.id,
      name: doc.name ?? "",
      email: doc.email,
      isYou: doc.id === access.user.id,
    }))
    .sort(
      (a, b) =>
        (a.name || a.email).localeCompare(b.name || b.email) ||
        a.email.localeCompare(b.email)
    )
}

const GONE: FormState = { ok: false, message: "That User no longer exists." }

/**
 * Removes a User from this Site. Your own id is refused: nobody can lock the
 * Site out of its last signed-in User. The person can sign in again while
 * they hold the Entra app role, which creates them afresh.
 */
export async function removeUserAs(
  payload: Payload,
  access: UserAccess,
  id: unknown
): Promise<FormState> {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return GONE
  if (id === access.user.id) {
    return { ok: false, message: "You can’t remove yourself." }
  }
  try {
    const doc = await payload.delete({ collection: "users", id, ...access })
    return { ok: true, message: `Removed ${doc.name || doc.email}.` }
  } catch (error) {
    if (error instanceof NotFound) return GONE
    return formStateFromError(error)
  }
}
