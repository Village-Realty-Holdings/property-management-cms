import { timingSafeEqual } from "node:crypto"

import { jwtVerify, SignJWT } from "jose"
import type { Payload } from "payload"
import { getSafeRedirect, parseCookies } from "payload/shared"

import { CALLBACK_PATH, type EntraConfig } from "./config"
import {
  authorizeUrl,
  randomToken,
  redeemCode,
  SignInError,
  type SignInErrorCode,
} from "./oidc"
import { issueSession } from "./session"
import { upsertStaffUser } from "./staffUser"

/**
 * The two sign-in routes (ADR-0016): `/auth/entra/start` and
 * `/auth/entra/callback`. Both answer 404 when Entra isn't configured.
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

const notFound = () => new Response("Not Found", { status: 404 })

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
    returnTo: safeReturnTo(url.searchParams.get("redirect"), payload),
  }

  let location: string
  try {
    location = await authorizeUrl(config, flow)
  } catch (error) {
    payload.logger.error({ err: error }, "Entra sign-in could not start")
    return redirect(loginUrl(payload, "entra"))
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
 * verifies the ID token, finds or creates the Staff User and issues a Payload
 * session. Any failure lands on the login screen with `?error=<code>`.
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
    const user = await upsertStaffUser(payload, claims)

    response = redirect(flow.returnTo)
    response.headers.append("Set-Cookie", await issueSession(payload, user.id))
  } catch (error) {
    let code: SignInErrorCode = "entra"
    if (error instanceof SignInError) {
      code = error.code
      payload.logger.warn(`Entra sign-in rejected (${code}): ${error.message}`)
    } else {
      payload.logger.error({ err: error }, "Entra sign-in failed")
    }
    response = redirect(loginUrl(payload, code))
  }

  // The flow cookie is single-use, whatever the outcome.
  response.headers.append("Set-Cookie", flowCookie(url, "", 0))
  return response
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store" },
  })
}

function adminPath(payload: Payload, route = ""): string {
  return `${payload.config.routes.admin.replace(/\/$/, "")}${route}`
}

function loginUrl(payload: Payload, error: SignInErrorCode): string {
  return `${adminPath(payload, payload.config.admin.routes.login)}?error=${error}`
}

/** Only same-origin paths; anything else goes to the admin dashboard. */
function safeReturnTo(value: string | null, payload: Payload): string {
  return getSafeRedirect({
    redirectTo: value ?? "",
    fallbackTo: adminPath(payload) || "/",
  })
}

/**
 * The request URL as the browser sees it. Behind a proxy that terminates
 * HTTPS, `request.url` is http://; the derived redirect URI must be https
 * (Entra requires it) and the flow cookie must be Secure.
 */
function publicUrl(request: Request): URL {
  const url = new URL(request.url)
  const proto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase()
  if (proto === "https" || proto === "http") url.protocol = `${proto}:`
  return url
}

function flowCookie(url: URL, value: string, maxAge: number): string {
  return [
    `${FLOW_COOKIE}=${value}`,
    "Path=/auth/entra",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    // Lax: the callback is a top-level GET navigation from Entra.
    "SameSite=Lax",
    ...(url.protocol === "https:" ? ["Secure"] : []),
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
