import type { Metadata } from "next"
import { redirect } from "next/navigation"
import config from "@payload-config"
import { headers } from "next/headers"
import { getPayload } from "payload"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

import {
  CALLBACK_PATH,
  DEV_PATH,
  devSignInEnabled,
  FINISH_PATH,
  PASSWORD_PATH,
  readEntraConfig,
  type SignInErrorCode,
} from "@/auth"

import { MicrosoftSignIn } from "./MicrosoftSignIn"

export const metadata: Metadata = { title: "Sign in" }

const messages = (requiredRole: string): Record<SignInErrorCode, string> => ({
  entra: "Microsoft sign-in didn't complete. Please try again.",
  token: "Microsoft sign-in couldn't be verified. Please try again.",
  "not-allowed": `Your Microsoft account doesn't have access to this Admin. Ask IT for the ${requiredRole} role.`,
  "not-assigned":
    "You don't have access to this Site. Ask a Super Admin to give you access.",
  password: "That email and password didn't match. Please try again.",
  handoff:
    "That link to this Site expired or was already used. Sign in here, or switch Sites again.",
  "account-conflict":
    "Another account already uses your email. Ask a colleague to remove it, then sign in again.",
})

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/**
 * Sign-in for Users (apps/site ADR-0015): Microsoft (Entra ID) when it is
 * set up, an email and password from the Registry, and the dev sign-in when
 * on. The same credentials work on every Site.
 */
export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams
  const returnTo = first(params.redirect)
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) redirect(returnTo?.startsWith("/admin") ? returnTo : "/admin")

  const entra = readEntraConfig()
  const error = first(params.error)
  const texts = messages(entra?.requiredRole ?? "")
  const message =
    error && error in texts ? texts[error as SignInErrorCode] : null
  const withRedirect = (path: string) =>
    returnTo ? `${path}?${new URLSearchParams({ redirect: returnTo })}` : path
  const dev = devSignInEnabled()

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-background p-8 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Sign in to the Admin</h1>
          <p className="text-sm text-muted-foreground">
            The same account works on every Awayday Site.
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
            <MicrosoftSignIn
              clientId={entra.clientId}
              authority={entra.issuer.replace(/\/v2\.0\/?$/, "")}
              redirectUri={entra.redirectUri}
              callbackPath={CALLBACK_PATH}
              finishPath={FINISH_PATH}
              scope={entra.requiredScope?.uri}
              returnTo={returnTo}
            />
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
        </div>
        {(entra || dev) && <Separator />}
        <form
          action={PASSWORD_PATH}
          method="post"
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="redirect" value={returnTo ?? ""} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button
            type="submit"
            variant={entra ? "outline" : "default"}
            size="lg"
          >
            Sign in with email
          </Button>
        </form>
      </div>
    </main>
  )
}
