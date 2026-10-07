/**
 * The Site's Entra app registration (apps/site ADR-0003, ADR-0017), read
 * from the environment. Sign-in happens in the browser with MSAL, as in the
 * Awayday Workflows platform: the registration is a single-page application
 * (a public client), so there is no client secret. Sign-in with Microsoft is
 * off (button hidden, routes 404) unless the tenant and client id are set.
 */
export type EntraConfig = {
  tenantId: string
  clientId: string
  /** Entra's v2.0 issuer for the tenant; OIDC discovery is read from here. */
  issuer: string
  /** Every `iss` a token may have: v2.0 and, for v1 access tokens, sts. */
  issuers: string[]
  /** Every `aud` a token may have (AUTH_AUDIENCE). */
  audiences: string[]
  /** Fixed popup redirect URI; <origin>/auth/entra/callback when unset. */
  redirectUri?: string
  /**
   * The API scope the browser asks for, whose access token it sends
   * (AUTH_REQUIRED_SCOPE). Unset: it asks for nothing more than sign-in and
   * sends the ID token.
   */
  requiredScope?: { uri: string; name: string }
  /** App role a Microsoft account needs to sign in at all. */
  requiredRole: string
  /** Token claim that lists the account's app roles. */
  roleClaim: string
  /** App role that makes a new User a Super Admin; none when unset. */
  adminRole?: string
}

type Env = Record<string, string | undefined>

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

export function readEntraConfig(env: Env = process.env): EntraConfig | null {
  const tenantId = env.ENTRA_TENANT_ID?.trim()
  const clientId = env.ENTRA_CLIENT_ID?.trim()
  if (!tenantId || !clientId) return null

  const override = env.ENTRA_ISSUER?.trim()
  const issuer =
    override || `https://login.microsoftonline.com/${tenantId}/v2.0`
  const issuers = override
    ? [override]
    : [issuer, `https://sts.windows.net/${tenantId}/`]
  const audiences = list(env.AUTH_AUDIENCE)
  const scope = env.AUTH_REQUIRED_SCOPE?.trim()

  return {
    tenantId,
    clientId,
    issuer,
    issuers,
    audiences: audiences.length ? audiences : [clientId, `api://${clientId}`],
    redirectUri: env.ENTRA_REDIRECT_URI?.trim() || undefined,
    requiredScope: scope
      ? {
          // A bare name is a scope of this registration's API.
          uri: scope.includes("://") ? scope : `api://${clientId}/${scope}`,
          name: scope.split("/").pop() ?? scope,
        }
      : undefined,
    requiredRole: env.AUTH_REQUIRED_ROLE?.trim() || SITE_USER_ROLE,
    roleClaim: env.AUTH_ROLE_CLAIM?.trim() || "roles",
    adminRole: env.AUTH_ADMIN_ROLE?.trim() || undefined,
  }
}

/**
 * Default Entra app role required to sign in at all, when AUTH_REQUIRED_ROLE
 * is unset: the same role the Awayday Workflows platform requires by default.
 */
export const SITE_USER_ROLE = "bds_campaign_user"

export const CALLBACK_PATH = "/auth/entra/callback"
export const FINISH_PATH = "/auth/entra/finish"
export const DEV_PATH = "/auth/dev"
export const SIGN_OUT_PATH = "/auth/sign-out"
export const PASSWORD_PATH = "/auth/password"
export const HANDOFF_START_PATH = "/auth/handoff/start"
export const HANDOFF_PATH = "/auth/handoff"

/** Where sign-in failures land, with `?error=<code>`. */
export const SIGN_IN_PAGE = "/admin/sign-in"
/** Where a sign-in goes when it wasn't asked to return anywhere. */
export const AFTER_SIGN_IN = "/admin"
