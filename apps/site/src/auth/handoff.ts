import type { Payload } from "payload"

import {
  createHandoff,
  findUser,
  redeemHandoff,
  registryDb,
  sitesFor,
} from "../registry"
import { AFTER_SIGN_IN, HANDOFF_PATH } from "./config"
import {
  isSecure,
  publicUrl,
  redirect,
  sameOrigin,
  seeOther,
  signInPage,
} from "./http"
import { SignInError } from "./oidc"
import { issueSession, readSession } from "./session"
import { registerThisSite, signInAs } from "./user"

/**
 * The Site switcher (apps/site ADR-0015). Each Site has its own domain, so
 * its session cookie can't reach another; a handoff carries the sign-in
 * across instead. `POST /auth/handoff/start` (here, signed in) writes a
 * single-use token to the Registry, good for one minute and for the chosen
 * Site only, and sends the browser to that Site's `GET /auth/handoff`, which
 * redeems it and runs the same checks as any sign-in.
 */

/** `POST /auth/handoff/start` with `site=<Registry Site id>`. */
export async function startHandoff(
  request: Request,
  payload: Payload
): Promise<Response> {
  const url = publicUrl(request)
  if (!sameOrigin(request, url)) return seeOther(AFTER_SIGN_IN)

  const session = await readSession(request.headers, payload.secret)
  const local = session
    ? await payload
        .findByID({ collection: "users", id: Number(session.userId), depth: 0 })
        .catch(() => null)
    : null
  if (!local) return seeOther(signInPage("handoff"))

  const form = await request.formData().catch(() => null)
  const siteId = Number(form?.get("site"))
  const db = registryDb(payload)
  const target = (await sitesFor(db, local.registryUserId)).find(
    (site) => site.id === siteId
  )
  if (!target?.url) return seeOther(AFTER_SIGN_IN)

  const token = await createHandoff(db, local.registryUserId, target.id)
  return seeOther(
    `${target.url}${HANDOFF_PATH}?${new URLSearchParams({ token })}`
  )
}

/** `GET /auth/handoff?token=…`: signs in whoever the token was made for. */
export async function finishHandoff(
  request: Request,
  payload: Payload
): Promise<Response> {
  const url = publicUrl(request)
  const token = url.searchParams.get("token") ?? ""
  try {
    if (!token || token.length > 100) {
      throw new SignInError("handoff", "No handoff token")
    }
    const db = registryDb(payload)
    const site = await registerThisSite(payload)
    const userId = await redeemHandoff(db, token, site.id)
    const registryUser = userId ? await findUser(db, { id: userId }) : null
    if (!registryUser) {
      throw new SignInError("handoff", "Handoff token unknown, used or expired")
    }
    const user = await signInAs(payload, registryUser)
    const response = redirect(AFTER_SIGN_IN)
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.append(
      "Set-Cookie",
      await issueSession(payload, user.id, { secure: isSecure(url) })
    )
    return response
  } catch (error) {
    const code = error instanceof SignInError ? error.code : "handoff"
    payload.logger.warn(
      `Handoff rejected (${code}): ${(error as Error).message}`
    )
    return redirect(signInPage(code))
  }
}
