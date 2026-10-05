import type { Payload } from "payload"

import { isSecure, notFound, publicUrl, redirect, safeReturnTo } from "./http"
import { issueSession } from "./session"
import { createUser, findUser, registryDb, updateUser } from "../registry"
import { signInAs } from "./user"

/**
 * The dev sign-in (apps/site ADR-0003): signs in a fixed dev User
 * through the same session code as Entra, until the Entra app
 * registration's credentials are available locally. The dev User is a
 * Super Admin in the Registry (apps/site ADR-0015), so it can open every
 * Site and manage Users & Sites.
 */

type Env = Record<string, string | undefined>

export const DEV_USER = {
  email: "dev@awayday.test",
  name: "Dev User",
} as const

/** On only outside production, and only with `DEV_SIGN_IN=1`. */
export function devSignInEnabled(env: Env = process.env): boolean {
  return env.NODE_ENV !== "production" && env.DEV_SIGN_IN === "1"
}

/** Startup check: `DEV_SIGN_IN` must never be set in production. */
export function assertNoDevSignInInProduction(env: Env = process.env): void {
  if (env.NODE_ENV === "production" && env.DEV_SIGN_IN) {
    throw new Error(
      "DEV_SIGN_IN is set in production. Remove it: the dev sign-in is for local development only."
    )
  }
}

/** `GET /auth/dev`: signs in the dev User, or 404 when it's off. */
export async function devSignIn(
  request: Request,
  payload: Payload,
  env: Env = process.env
): Promise<Response> {
  if (!devSignInEnabled(env)) return notFound()
  const url = publicUrl(request)
  const db = registryDb(payload)
  const found =
    (await findUser(db, { email: DEV_USER.email })) ??
    (await createUser(db, { ...DEV_USER, isSuperAdmin: true }))
  const devUser =
    found.isSuperAdmin && !found.disabled
      ? found
      : await updateUser(db, found.id, { isSuperAdmin: true, disabled: false })
  const user = await signInAs(payload, devUser)
  const response = redirect(safeReturnTo(url.searchParams.get("redirect")))
  response.headers.append(
    "Set-Cookie",
    await issueSession(payload, user.id, { secure: isSecure(url) })
  )
  return response
}
