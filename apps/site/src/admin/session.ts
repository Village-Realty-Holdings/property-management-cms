import "server-only"

import config from "@payload-config"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getPayload, type Payload } from "payload"

import { SIGN_IN_PAGE } from "../auth"
import type { User } from "../payload-types"
import { ADMIN_PATH_HEADER } from "./adminPath"

export type UserContext = {
  payload: Payload
  user: User & { collection: "users" }
  /** Local API options that apply the User's access rules. */
  as: { overrideAccess: false; user: User & { collection: "users" } }
}

/**
 * The signed-in User, or null. For calls that must never redirect: presence
 * heartbeats and the release beacon, which run in the background.
 */
export async function readUser(): Promise<UserContext | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== "users") return null
  const current = user as UserContext["user"]
  return {
    payload,
    user: current,
    as: { overrideAccess: false, user: current },
  }
}

/**
 * The signed-in User, for Admin pages and Server Actions. Every
 * Admin read and write goes through the Local API as this user, never with
 * access overridden (apps/site ADR-0002). Redirects to sign-in otherwise.
 */
export async function requireUser(): Promise<UserContext> {
  const session = await readUser()
  if (!session) {
    // Back to the requested Admin page after sign-in (see src/proxy.ts).
    const returnTo = (await headers()).get(ADMIN_PATH_HEADER) || "/admin"
    redirect(`${SIGN_IN_PAGE}?${new URLSearchParams({ redirect: returnTo })}`)
  }
  return session
}
