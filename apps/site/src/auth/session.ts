import { jwtVerify, SignJWT } from "jose"
import type { AuthStrategy, Payload, TypedUser } from "payload"
import { parseCookies } from "payload/shared"

import { canUseSite, registryDb } from "../registry"
import { thisSiteSchema } from "./user"

/**
 * User sessions (apps/site ADR-0003). Payload's local strategy is disabled,
 * and with it Payload's own JWT check, so sessions are ours: a signed
 * `site-session` cookie naming the User, read by `sessionStrategy` on
 * every Payload request (the Admin, REST and the Local API with
 * `payload.auth`). Access rules then apply as usual.
 *
 * A session lasts SESSION_SECONDS from sign-in and is never extended, so
 * removing someone's app role in Entra takes effect within that time. The
 * Registry is asked on every request (apps/site ADR-0015): disabling a User
 * or taking away their Site Access ends their session at once.
 */

export const SESSION_COOKIE = "site-session"
export const SESSION_SECONDS = 8 * 60 * 60

const USERS = "users"

const sessionKey = (secret: string) =>
  new TextEncoder().encode(`${secret}:site-session`)

/** The `Set-Cookie` value that starts a session for the User. */
export async function issueSession(
  payload: Payload,
  userId: number | string,
  { secure }: { secure: boolean }
): Promise<string> {
  const token = await new SignJWT({ collection: USERS })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(sessionKey(payload.secret))
  return sessionCookie(token, SESSION_SECONDS, secure)
}

/** The `Set-Cookie` value that ends the session. */
export function clearSession({ secure }: { secure: boolean }): string {
  return sessionCookie("", 0, secure)
}

function sessionCookie(value: string, maxAge: number, secure: boolean) {
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    // Lax: sign-in ends with a top-level redirect from Entra.
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ")
}

type Session = { userId: string; token: string; exp: number }

/** The session in the request's cookies, if it's valid and unexpired. */
export async function readSession(
  headers: Headers,
  secret: string
): Promise<Session | null> {
  const token = parseCookies(headers).get(SESSION_COOKIE)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, sessionKey(secret), {
      algorithms: ["HS256"],
      requiredClaims: ["sub", "exp"],
    })
    if (payload.collection !== USERS || !payload.sub) return null
    return { userId: payload.sub, token, exp: payload.exp! }
  } catch {
    return null
  }
}

/** The Payload auth strategy for Users, registered on `users`. */
export const sessionStrategy: AuthStrategy = {
  name: "site-session",
  authenticate: async ({ headers, payload }) => {
    const session = await readSession(headers, payload.secret)
    if (!session) return { user: null }
    const user = await payload.db.findOne<TypedUser>({
      collection: USERS,
      where: { id: { equals: numericOr(session.userId) } },
    })
    if (!user) return { user: null }
    const allowed = await canUseSite(
      registryDb(payload),
      user.registryUserId,
      thisSiteSchema(payload)
    )
    return { user: allowed ? { ...user, collection: USERS } : null }
  },
}

const numericOr = (id: string): number | string =>
  /^\d+$/.test(id) ? Number(id) : id
