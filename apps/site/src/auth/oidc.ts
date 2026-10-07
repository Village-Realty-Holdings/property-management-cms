import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

import type { EntraConfig } from "./config"

type Discovery = {
  issuer: string
  jwks_uri: string
}

/** Claims of a verified Entra token that sign-in uses. */
export type EntraClaims = JWTPayload & {
  oid: string
  tid: string
  email?: string
  preferred_username?: string
  upn?: string
  name?: string
  scp?: string
  roles?: string[]
}

export class SignInError extends Error {
  constructor(
    /** Shown to the user on the login screen via `?error=`. */
    readonly code: SignInErrorCode,
    message: string
  ) {
    super(message)
    this.name = "SignInError"
  }
}

export type SignInErrorCode =
  | "entra"
  | "token"
  | "not-allowed"
  | "not-assigned"
  | "account-conflict"
  | "password"
  | "handoff"

const discoveries = new Map<string, Promise<Discovery>>()
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

/** OIDC discovery document for the issuer, cached per process. */
export function discover(issuer: string): Promise<Discovery> {
  let pending = discoveries.get(issuer)
  if (!pending) {
    pending = fetchDiscovery(issuer)
    discoveries.set(issuer, pending)
    // Don't cache failures: the next sign-in retries.
    pending.catch(() => discoveries.delete(issuer))
  }
  return pending
}

async function fetchDiscovery(issuer: string): Promise<Discovery> {
  const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`OIDC discovery failed: ${response.status} ${url}`)
  }
  const doc = (await response.json()) as Partial<Discovery>
  if (doc.issuer !== issuer || !doc.jwks_uri) {
    throw new Error(`OIDC discovery document for ${issuer} is invalid`)
  }
  return doc as Discovery
}

function keySet(jwksUri: string) {
  let jwks = keySets.get(jwksUri)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri))
    keySets.set(jwksUri, jwks)
  }
  return jwks
}

/**
 * Verifies the token the browser got from Entra with MSAL: the access token
 * for the required scope, or the ID token when there is none. Checks the
 * signature against the tenant's keys, issuer, audience, tenant and, for an
 * access token, that it carries the scope.
 */
export async function verifyEntraToken(
  config: EntraConfig,
  token: string
): Promise<EntraClaims> {
  let claims: EntraClaims
  try {
    const { jwks_uri } = await discover(config.issuer)
    ;({ payload: claims } = await jwtVerify<EntraClaims>(
      token,
      keySet(jwks_uri),
      {
        issuer: config.issuers,
        audience: config.audiences,
        algorithms: ["RS256"],
        requiredClaims: ["oid", "tid"],
      }
    ))
  } catch (error) {
    throw new SignInError(
      "token",
      `Entra token rejected: ${(error as Error).message}`
    )
  }
  if (claims.tid !== config.tenantId) {
    throw new SignInError("token", `Entra token from tenant ${claims.tid}`)
  }
  const scope = config.requiredScope?.name
  if (scope && !(claims.scp ?? "").split(" ").includes(scope)) {
    throw new SignInError("token", `Entra token lacks the ${scope} scope`)
  }
  return claims
}
