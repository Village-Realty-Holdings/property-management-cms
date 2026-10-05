import { timingSafeEqual } from "node:crypto"

import { jwtVerify, SignJWT } from "jose"
import type { Payload } from "payload"
import { parseCookies } from "payload/shared"

import { CALLBACK_PATH, type EntraConfig } from "./config"
import {
  isSecure,
  notFound,
  publicUrl,
  redirect,
  safeReturnTo,
  signInPage,
} from "./http"
import {
  authorizeUrl,
  randomToken,
  redeemCode,
  SignInError,
  type SignInErrorCode,
} from "./oidc"
import { issueSession } from "./session"
import { registryUserForEntra, signInAs } from "./user"

/**
 * The two Entra sign-in routes (apps/site ADR-0003): `/auth/entra/start`
 * and `/auth/entra/callback`. Both answer 404 when Entra isn't configured.
 */

/** Holds state, nonce, PKCE verifier and return path between the two routes. */
const FLOW_COOKIE = "entra-signin"
const FLOW_TTL_SECONDS = 10 * 60

type Flow = {
  state: string
  nonce: string
  verifier: string
  redirectUri: string
  returnTo: string
}

/** Redirects to Entra's authorize endpoint with state, nonce and PKCE. */
export async function startSignIn(
  request: Request,
  payload: Payload,
  config: EntraConfig | null
): Promise<Response> {
  if (!config) return notFound()
  const url = publicUrl(request)

  const flow: Flow = {
    state: randomToken(),
    nonce: randomToken(),
    verifier: randomToken(),
    redirectUri: config.redirectUri ?? `${url.origin}${CALLBACK_PATH}`,
    returnTo: safeReturnTo(url.searchParams.get("redirect")),
  }

  let location: string
  try {
    location = await authorizeUrl(config, flow)
  } catch (error) {
    payload.logger.error({ err: error }, "Entra sign-in could not start")
    return redirect(signInPage("entra"))
  }

  const response = redirect(location)
  response.headers.append(
    "Set-Cookie",
    flowCookie(url, await sealFlow(flow, payload.secret), FLOW_TTL_SECONDS)
  )
  return response
}

/**
 * Completes sign-in: checks state against the flow cookie, redeems the code,
 * verifies the ID token, checks the Registry User may use this Site, and
 * starts a session. Any failure lands on the sign-in page with `?error=<code>`.
 */
export async function finishSignIn(
  request: Request,
  payload: Payload,
  config: EntraConfig | null
): Promise<Response> {
  if (!config) return notFound()
  const url = publicUrl(request)

  let response: Response
  try {
    const flow = await openFlow(
      parseCookies(request.headers).get(FLOW_COOKIE),
      payload.secret
    )

    const entraError = url.searchParams.get("error")
    if (entraError) {
      throw new SignInError(
        "entra",
        `Entra returned ${entraError}: ${url.searchParams.get("error_description") ?? ""}`
      )
    }
    const state = url.searchParams.get("state")
    if (!state || !safeEqual(state, flow.state)) {
      throw new SignInError("state", "State mismatch")
    }
    const code = url.searchParams.get("code")
    if (!code) throw new SignInError("entra", "No authorization code")

    const claims = await redeemCode(config, {
      code,
      redirectUri: flow.redirectUri,
      verifier: flow.verifier,
      nonce: flow.nonce,
    })
    const user = await signInAs(
      payload,
      await registryUserForEntra(payload, claims)
    )

    response = redirect(flow.returnTo)
    response.headers.append(
      "Set-Cookie",
      await issueSession(payload, user.id, { secure: isSecure(url) })
    )
  } catch (error) {
    let code: SignInErrorCode = "entra"
    if (error instanceof SignInError) {
      code = error.code
      payload.logger.warn(`Entra sign-in rejected (${code}): ${error.message}`)
    } else {
      payload.logger.error({ err: error }, "Entra sign-in failed")
    }
    response = redirect(signInPage(code))
  }

  // The flow cookie is single-use, whatever the outcome.
  response.headers.append("Set-Cookie", flowCookie(url, "", 0))
  return response
}

function flowCookie(url: URL, value: string, maxAge: number): string {
  return [
    `${FLOW_COOKIE}=${value}`,
    "Path=/auth/entra",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    // Lax: the callback is a top-level GET navigation from Entra.
    "SameSite=Lax",
    ...(isSecure(url) ? ["Secure"] : []),
  ].join("; ")
}

const flowKey = (secret: string) =>
  new TextEncoder().encode(`${secret}:entra-signin`)

/** Signed, so the flow can't be forged or altered in the browser. */
function sealFlow(flow: Flow, secret: string): Promise<string> {
  return new SignJWT({ ...flow })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${FLOW_TTL_SECONDS}s`)
    .sign(flowKey(secret))
}

async function openFlow(
  value: string | undefined,
  secret: string
): Promise<Flow> {
  if (!value) throw new SignInError("state", "No sign-in flow cookie")
  try {
    const { payload } = await jwtVerify<Flow>(value, flowKey(secret), {
      algorithms: ["HS256"],
    })
    return payload
  } catch (error) {
    throw new SignInError(
      "state",
      `Invalid sign-in flow cookie: ${(error as Error).message}`
    )
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
