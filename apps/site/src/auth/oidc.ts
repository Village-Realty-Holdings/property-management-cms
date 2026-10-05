import { createHash, randomBytes } from "node:crypto"

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

import type { EntraConfig } from "./config"

type Discovery = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
}

/** Claims of a verified Entra ID token that sign-in uses. */
export type EntraClaims = JWTPayload & {
  oid: string
  tid: string
  nonce?: string
  email?: string
  preferred_username?: string
  name?: string
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
  | "state"
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
  if (
    doc.issuer !== issuer ||
    !doc.authorization_endpoint ||
    !doc.token_endpoint ||
    !doc.jwks_uri
  ) {
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

const base64url = (bytes: Buffer) => bytes.toString("base64url")

export const randomToken = () => base64url(randomBytes(32))

/** PKCE S256 challenge for a verifier. */
export const pkceChallenge = (verifier: string) =>
  base64url(createHash("sha256").update(verifier).digest())

export async function authorizeUrl(
  config: EntraConfig,
  params: {
    redirectUri: string
    state: string
    nonce: string
    verifier: string
  }
): Promise<string> {
  const { authorization_endpoint } = await discover(config.issuer)
  const url = new URL(authorization_endpoint)
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    response_mode: "query",
    redirect_uri: params.redirectUri,
    scope: "openid profile email",
    state: params.state,
    nonce: params.nonce,
    code_challenge: pkceChallenge(params.verifier),
    code_challenge_method: "S256",
  }).toString()
  return url.toString()
}

/**
 * Exchanges the authorization code (confidential client + PKCE) and returns
 * the verified ID token's claims: signature against the issuer's JWKS,
 * issuer, audience (our client id), tenant and nonce.
 */
export async function redeemCode(
  config: EntraConfig,
  params: {
    code: string
    redirectUri: string
    verifier: string
    nonce: string
  }
): Promise<EntraClaims> {
  const { token_endpoint, jwks_uri } = await discover(config.issuer)

  const response = await fetch(token_endpoint, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.verifier,
    }),
  })
  if (!response.ok) {
    throw new SignInError(
      "token",
      `Token exchange failed: ${response.status} ${await response.text()}`
    )
  }
  const { id_token: idToken } = (await response.json()) as {
    id_token?: string
  }
  if (!idToken) throw new SignInError("token", "No id_token in response")

  let claims: EntraClaims
  try {
    ;({ payload: claims } = await jwtVerify<EntraClaims>(
      idToken,
      keySet(jwks_uri),
      {
        issuer: config.issuer,
        audience: config.clientId,
        algorithms: ["RS256"],
        requiredClaims: ["oid", "tid", "nonce"],
      }
    ))
  } catch (error) {
    throw new SignInError(
      "token",
      `ID token rejected: ${(error as Error).message}`
    )
  }
  if (claims.tid !== config.tenantId) {
    throw new SignInError("token", `ID token from tenant ${claims.tid}`)
  }
  if (claims.nonce !== params.nonce) {
    throw new SignInError("token", "ID token nonce mismatch")
  }
  return claims
}
