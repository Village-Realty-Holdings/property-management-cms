/**
 * The Site's Entra app registration (apps/site ADR-0003), read from the
 * environment. Sign-in with Microsoft is off (button hidden, routes 404)
 * unless the tenant, client id and client secret are all set.
 */
export type EntraConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  /** Expected `iss` of ID tokens; OIDC discovery is read from here. */
  issuer: string
  /** Fixed redirect URI; derived from the request origin when unset. */
  redirectUri?: string
}

type Env = Record<string, string | undefined>

export function readEntraConfig(env: Env = process.env): EntraConfig | null {
  const tenantId = env.ENTRA_TENANT_ID?.trim()
  const clientId = env.ENTRA_CLIENT_ID?.trim()
  const clientSecret = env.ENTRA_CLIENT_SECRET?.trim()
  if (!tenantId || !clientId || !clientSecret) return null

  const issuer =
    env.ENTRA_ISSUER?.trim() ||
    `https://login.microsoftonline.com/${tenantId}/v2.0`
  const redirectUri = env.ENTRA_REDIRECT_URI?.trim() || undefined

  return { tenantId, clientId, clientSecret, issuer, redirectUri }
}

/** Entra app role required to sign in at all. */
export const SITE_USER_ROLE = "site_user"

export const START_PATH = "/auth/entra/start"
export const CALLBACK_PATH = "/auth/entra/callback"
export const DEV_PATH = "/auth/dev"
export const SIGN_OUT_PATH = "/auth/sign-out"

/** Where sign-in failures land, with `?error=<code>`. */
export const SIGN_IN_PAGE = "/admin/sign-in"
/** Where a sign-in goes when it wasn't asked to return anywhere. */
export const AFTER_SIGN_IN = "/admin"
