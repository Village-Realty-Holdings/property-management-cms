import { getSafeRedirect } from "payload/shared"

import { AFTER_SIGN_IN, SIGN_IN_PAGE } from "./config"

/** Shared helpers for the sign-in routes. */

export const notFound = () => new Response("Not Found", { status: 404 })

export function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store" },
  })
}

export function signInPage(error: string): string {
  return `${SIGN_IN_PAGE}?error=${error}`
}

/** Only same-origin paths; anything else goes to the Admin. */
export function safeReturnTo(value: string | null): string {
  return getSafeRedirect({ redirectTo: value ?? "", fallbackTo: AFTER_SIGN_IN })
}

/**
 * The request URL as the browser sees it. Behind a proxy that terminates
 * HTTPS, `request.url` is http://; the derived redirect URI must be https
 * (Entra requires it) and cookies must be Secure.
 */
export function publicUrl(request: Request): URL {
  const url = new URL(request.url)
  const proto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase()
  if (proto === "https" || proto === "http") url.protocol = `${proto}:`
  return url
}

export const isSecure = (url: URL) => url.protocol === "https:"
