import type { Metadata } from "next"
import { redirect } from "next/navigation"
import config from "@payload-config"
import { headers } from "next/headers"
import { getPayload } from "payload"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import {
  DEV_PATH,
  devSignInEnabled,
  readEntraConfig,
  START_PATH,
  type SignInErrorCode,
} from "@/auth"

export const metadata: Metadata = { title: "Sign in" }

const messages: Record<SignInErrorCode, string> = {
  entra: "Microsoft sign-in didn't complete. Please try again.",
  state: "Your sign-in expired or was interrupted. Please try again.",
  token: "Microsoft sign-in couldn't be verified. Please try again.",
  "not-allowed":
    "Your Microsoft account doesn't have access to this Admin. Ask IT for the site_user role.",
  "account-conflict":
    "Another account already uses your email. Ask a colleague to remove it, then sign in again.",
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/** Sign-in for Staff Users: Microsoft (Entra ID), and the dev sign-in when on. */
export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams
  const returnTo = first(params.redirect)
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) redirect(returnTo?.startsWith("/admin") ? returnTo : "/admin")

  const error = first(params.error)
  const message =
    error && error in messages ? messages[error as SignInErrorCode] : null
  const withRedirect = (path: string) =>
    returnTo ? `${path}?${new URLSearchParams({ redirect: returnTo })}` : path
  const entra = readEntraConfig()
  const dev = devSignInEnabled()

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-background p-8 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Sign in to the Admin</h1>
          <p className="text-sm text-muted-foreground">
            Use your Awayday Microsoft account.
          </p>
        </div>
        {message && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive-text"
          >
            {message}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {entra && (
            <a
              href={withRedirect(START_PATH)}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Sign in with Microsoft
            </a>
          )}
          {dev && (
            <a
              href={withRedirect(DEV_PATH)}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full"
              )}
            >
              Dev sign-in
            </a>
          )}
          {!entra && !dev && (
            <p className="text-sm text-muted-foreground">
              Sign-in isn&apos;t set up. Set the ENTRA_* variables, or
              DEV_SIGN_IN=1 in local development.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
