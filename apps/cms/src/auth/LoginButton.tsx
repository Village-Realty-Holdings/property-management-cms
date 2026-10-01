import { Banner, Button } from "@payloadcms/ui"

import { readEntraConfig, START_PATH } from "./config"
import type { SignInErrorCode } from "./oidc"

const messages: Record<SignInErrorCode, string> = {
  entra: "Microsoft sign-in didn't complete. Please try again.",
  state: "Your sign-in expired or was interrupted. Please try again.",
  token: "Microsoft sign-in couldn't be verified. Please try again.",
  "not-allowed":
    "Your Microsoft account doesn't have access to the CMS. Ask IT for the CMS user role.",
  "account-conflict":
    "A CMS account with your email already exists. Ask a Super Admin to link it.",
}

type Props = {
  searchParams?: Record<string, string | string[] | undefined>
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/**
 * "Sign in with Microsoft" on the admin login screen (ADR-0016), plus the
 * reason when a sign-in was rejected (`?error=`). Hidden when Entra isn't
 * configured. Registered as `admin.components.afterLogin`.
 */
export function LoginButton({ searchParams }: Props) {
  if (!readEntraConfig()) return null

  const error = first(searchParams?.error)
  const message =
    error && error in messages ? messages[error as SignInErrorCode] : null
  const redirect = first(searchParams?.redirect)
  const href = redirect
    ? `${START_PATH}?${new URLSearchParams({ redirect })}`
    : START_PATH

  return (
    <div>
      {message && <Banner type="error">{message}</Banner>}
      <Button buttonStyle="secondary" el="anchor" size="large" url={href}>
        Sign in with Microsoft
      </Button>
    </div>
  )
}
