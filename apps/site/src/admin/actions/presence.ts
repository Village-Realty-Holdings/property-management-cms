"use server"

import {
  parsePresenceTarget,
  readPresenceAs,
  touchPresenceAs,
  type Presence,
  type PresenceTarget,
} from "../presence"
import { readUser } from "../session"

/**
 * The editor's presence heartbeat, as Server Actions. Each runs as the User
 * (apps/site ADR-0002) and validates what the browser sent again. They return
 * null, quietly, when the User is signed out (a heartbeat never redirects a
 * dirty editor to sign-in), the target is invalid or anything fails (a Page
 * that was deleted fails its foreign key). Nothing is revalidated: nothing
 * shown on a page changes. Leaving goes through the release route, not here.
 */

/**
 * Claims the target for the User unless someone else holds it, or claims it
 * regardless with `takeOver`. Returns who holds it afterwards.
 */
export async function touchPresence(
  target: PresenceTarget,
  options?: { takeOver?: boolean }
): Promise<Presence | null> {
  const session = await readUser()
  const parsed = parsePresenceTarget(target)
  if (!session || !parsed) return null
  try {
    return await touchPresenceAs(session.payload, session.as, parsed, {
      takeOver: options?.takeOver === true,
    })
  } catch {
    return null
  }
}

/** Who holds the target now, without claiming it. */
export async function readPresence(
  target: PresenceTarget
): Promise<Presence | null> {
  const session = await readUser()
  const parsed = parsePresenceTarget(target)
  if (!session || !parsed) return null
  try {
    return await readPresenceAs(session.payload, session.as, parsed)
  } catch {
    return null
  }
}
