import type { Payload } from "payload"

import { signInAs } from "../auth/user"
import type { User } from "../payload-types"
import { createUser, ensureRegistry, findUser, registryDb } from "../registry"

/**
 * This Site's User for a Registry User with this email, made as a first
 * sign-in would: for e2e specs and scripts that sign a browser in with a
 * session cookie, which the Registry is asked about on every request. The
 * Registry User is a Super Admin unless asked otherwise, so it may use any
 * Site.
 */
export async function registeredUser(
  payload: Payload,
  person: { email: string; name?: string; superAdmin?: boolean }
): Promise<User> {
  const db = registryDb(payload)
  await ensureRegistry(db)
  const registryUser =
    (await findUser(db, { email: person.email })) ??
    (await createUser(db, {
      email: person.email,
      name: person.name,
      isSuperAdmin: person.superAdmin ?? true,
    }))
  return signInAs(payload, registryUser)
}
