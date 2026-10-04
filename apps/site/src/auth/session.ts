import { jwtVerify, SignJWT } from "jose"
import type {
  AuthStrategy,
  CollectionRefreshHook,
  Payload,
  TypedUser,
} from "payload"
import { parseCookies } from "payload/shared"

/**
 * User sessions (apps/site ADR-0003). Payload's local strategy is disabled,
 * and with it Payload's own JWT check, so sessions are ours: a signed
 * `site-session` cookie naming the User, read by `sessionStrategy` on
 * every Payload request (the Admin, /p-admin, REST and the Local API with
 * `payload.auth`). Access rules then apply as usual.
 *
 * A session lasts SESSION_SECONDS from sign-in and is never extended, so
 * removing someone's app role in Entra takes effect within that time.
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
    return { user: user ? { ...user, collection: USERS } : null }
  },
}

/**
 * `refresh` hook on Users: /p-admin refreshes its session on a timer.
 * Payload would answer with one of its own JWTs, which nothing here
 * accepts, so the refresh returns the session as it is, never extended.
 */
export const refreshSession: CollectionRefreshHook = async ({ args, user }) => {
  const session = await readSession(args.req.headers, args.req.payload.secret)
  if (!session) return
  return {
    exp: session.exp,
    refreshedToken: session.token,
    setCookie: false,
    user,
  }
}

const numericOr = (id: string): number | string =>
  /^\d+$/.test(id) ? Number(id) : id
