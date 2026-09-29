import "server-only"

import config from "@payload-config"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getPayload, type Payload } from "payload"

import { SIGN_IN_PAGE } from "../auth"
import type { User } from "../payload-types"
import { ADMIN_PATH_HEADER } from "./adminPath"

export type StaffContext = {
  payload: Payload
  user: User & { collection: "users" }
  /** Local API options that apply the Staff User's access rules. */
  as: { overrideAccess: false; user: User & { collection: "users" } }
}

/**
 * The signed-in Staff User, for Admin pages and Server Actions. Every
 * Admin read and write goes through the Local API as this user, never with
 * access overridden (apps/site ADR-0002). Redirects to sign-in otherwise.
 */
export async function requireStaff(): Promise<StaffContext> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user || user.collection !== "users") {
    // Back to the requested Admin page after sign-in (see src/proxy.ts).
    const returnTo = requestHeaders.get(ADMIN_PATH_HEADER) || "/admin"
    redirect(`${SIGN_IN_PAGE}?${new URLSearchParams({ redirect: returnTo })}`)
  }
  const staff = user as StaffContext["user"]
  return { payload, user: staff, as: { overrideAccess: false, user: staff } }
}
