"use client"

import { useState } from "react"
import {
  BrowserAuthErrorCodes,
  PublicClientApplication,
  type AuthError,
} from "@azure/msal-browser"

import { Button } from "@workspace/ui/components/button"

type Props = {
  clientId: string
  /** Entra's authority for the tenant, e.g. https://login.microsoftonline.com/<tenant>. */
  authority: string
  /** The popup's redirect URI; <origin>/auth/entra/callback when unset. */
  redirectUri?: string
  callbackPath: string
  finishPath: string
  /** The API scope whose access token is sent; the ID token when unset. */
  scope?: string
  returnTo?: string
}

/**
 * Sign in with Microsoft (apps/site ADR-0017): MSAL's popup in the browser,
 * as in the Awayday Workflows platform, then the token goes to the Site,
 * which checks it and starts a session.
 */
export function MicrosoftSignIn({
  clientId,
  authority,
  redirectUri,
  callbackPath,
  finishPath,
  scope,
  returnTo,
}: Props) {
  const [busy, setBusy] = useState(false)

  async function signIn() {
    setBusy(true)
    try {
      const msal = new PublicClientApplication({
        auth: {
          clientId,
          authority,
          redirectUri:
            redirectUri ?? `${window.location.origin}${callbackPath}`,
        },
        cache: { cacheLocation: "sessionStorage" },
      })
      await msal.initialize()
      const result = await msal.loginPopup({
        scopes: scope ? [scope] : ["openid", "profile", "email"],
        prompt: "select_account",
      })
      const token = scope ? result.accessToken : result.idToken

      const response = await fetch(finishPath, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: new URLSearchParams({ redirect: returnTo ?? "" }),
      })
      const { location } = (await response.json()) as { location: string }
      window.location.assign(location)
    } catch (error) {
      setBusy(false)
      const code = (error as AuthError).errorCode
      // Closing the popup isn't a failure.
      if (code === BrowserAuthErrorCodes.userCancelled) return
      console.error("[Entra ID Sign-In Error]", error)
      window.location.assign("/admin/sign-in?error=entra")
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      disabled={busy}
      onClick={() => void signIn()}
    >
      {busy ? "Signing in…" : "Sign in with Microsoft"}
    </Button>
  )
}
