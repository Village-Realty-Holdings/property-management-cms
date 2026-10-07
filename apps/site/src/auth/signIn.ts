import type { Payload } from "payload"

import type { EntraConfig } from "./config"
import {
  isSecure,
  notFound,
  publicUrl,
  safeReturnTo,
  sameOrigin,
  signInPage,
} from "./http"
import { SignInError, verifyEntraToken, type SignInErrorCode } from "./oidc"
import { issueSession } from "./session"
import { registryUserForEntra, signInAs } from "./user"

/**
 * Sign-in with Microsoft (apps/site ADR-0003, ADR-0017). The sign-in page
 * signs in with Entra in the browser through MSAL's popup, as the Awayday
 * Workflows platform does, and posts the token it gets to
 * `/auth/entra/finish` as a Bearer token. Both routes answer 404 when Entra
 * isn't configured.
 */

/**
 * The popup's redirect URI. MSAL in the sign-in page reads Entra's answer
 * from the popup's address, so the page itself only has to be on this
 * origin.
 */
export function entraCallback(config: EntraConfig | null): Response {
  if (!config) return notFound()
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Signing in…</title></head><body></body></html>',
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    }
  )
}

/**
 * Takes the Entra token from the sign-in page, verifies it, checks the
 * Registry User may use this Site, and starts a session. Answers JSON with
 * where to go next: the page asked for, or the sign-in page with
 * `?error=<code>`.
 */
export async function finishSignIn(
  request: Request,
  payload: Payload,
  config: EntraConfig | null
): Promise<Response> {
  if (!config) return notFound()
  const url = publicUrl(request)

  try {
    // Only this Site's own sign-in page may post here.
    if (!sameOrigin(request, url)) {
      throw new SignInError("token", "Cross-origin sign-in post")
    }
    const header = request.headers.get("authorization") ?? ""
    if (!header.startsWith("Bearer ")) {
      throw new SignInError("token", "No Bearer token")
    }
    const claims = await verifyEntraToken(config, header.slice(7).trim())
    const user = await signInAs(
      payload,
      await registryUserForEntra(payload, claims, config)
    )

    const body = await request.formData().catch(() => new FormData())
    const returnTo = body.get("redirect")
    const response = answer(
      200,
      safeReturnTo(typeof returnTo === "string" ? returnTo : null)
    )
    response.headers.append(
      "Set-Cookie",
      await issueSession(payload, user.id, { secure: isSecure(url) })
    )
    return response
  } catch (error) {
    return answer(401, signInPage(failure(payload, error)))
  }
}

function answer(status: number, location: string): Response {
  return Response.json(
    { location },
    { status, headers: { "Cache-Control": "no-store" } }
  )
}

/** Logs a failed sign-in and returns the code the sign-in page shows. */
function failure(payload: Payload, error: unknown): SignInErrorCode {
  if (error instanceof SignInError) {
    payload.logger.warn(
      `Entra sign-in rejected (${error.code}): ${error.message}`
    )
    return error.code
  }
  payload.logger.error({ err: error }, "Entra sign-in failed")
  return "entra"
}
