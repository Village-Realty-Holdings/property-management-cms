import { getSafeRedirect } from "payload/shared"

import { SIGN_IN_PAGE } from "./config"
import { isSecure, publicUrl, redirect } from "./http"
import { clearSession } from "./session"

/**
 * `/auth/sign-out`: ends the session and goes to the sign-in page, or to a
 * same-origin `?redirect=` path.
 */
export function signOut(request: Request): Response {
  const url = publicUrl(request)
  const response = redirect(
    getSafeRedirect({
      redirectTo: url.searchParams.get("redirect") ?? "",
      fallbackTo: SIGN_IN_PAGE,
    })
  )
  response.headers.append("Set-Cookie", clearSession({ secure: isSecure(url) }))
  return response
}
