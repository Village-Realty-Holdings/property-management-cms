import type { Payload } from "payload"

import { checkPassword, MAX_PASSWORD_LENGTH, registryDb } from "../registry"
import {
  isSecure,
  publicUrl,
  safeReturnTo,
  sameOrigin,
  seeOther,
  signInPage,
} from "./http"
import { SignInError } from "./oidc"
import { issueSession } from "./session"
import { signInAs } from "./user"

/**
 * `POST /auth/password` (apps/site ADR-0015): the sign-in page's email and
 * password form. The Registry checks the password, then the same Site check
 * as Entra applies. A wrong email, a wrong password and a disabled User all
 * get the same answer.
 */
export async function passwordSignIn(
  request: Request,
  payload: Payload
): Promise<Response> {
  const url = publicUrl(request)
  if (!sameOrigin(request, url)) return seeOther(signInPage("password"))

  const form = await request.formData().catch(() => null)
  const email = text(form?.get("email"), 320)
  const password = text(form?.get("password"), MAX_PASSWORD_LENGTH)
  const returnTo = safeReturnTo(text(form?.get("redirect"), 2000) || null)
  const failed = () =>
    seeOther(
      `${signInPage("password")}&${new URLSearchParams({ redirect: returnTo })}`
    )
  if (!email || !password) return failed()

  try {
    const registryUser = await checkPassword(
      registryDb(payload),
      email,
      password
    )
    if (!registryUser) {
      payload.logger.warn(`Password sign-in rejected for ${email}`)
      return failed()
    }
    const user = await signInAs(payload, registryUser)
    const response = seeOther(returnTo)
    response.headers.append(
      "Set-Cookie",
      await issueSession(payload, user.id, { secure: isSecure(url) })
    )
    return response
  } catch (error) {
    if (error instanceof SignInError) {
      payload.logger.warn(
        `Password sign-in rejected (${error.code}): ${error.message}`
      )
      return seeOther(signInPage(error.code))
    }
    payload.logger.error({ err: error }, "Password sign-in failed")
    return failed()
  }
}

/** A form field as text, or "" when missing or longer than `max`. */
function text(value: FormDataEntryValue | null | undefined, max: number) {
  return typeof value === "string" && value.length <= max ? value : ""
}
