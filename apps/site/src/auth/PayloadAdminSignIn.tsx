import { Button } from "@payloadcms/ui"

import { DEV_PATH, readEntraConfig, SIGN_OUT_PATH, START_PATH } from "./config"
import { devSignInEnabled } from "./devSignIn"

type Props = {
  searchParams?: Record<string, string | string[] | undefined>
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const withRedirect = (path: string, redirect: string) =>
  `${path}?${new URLSearchParams({ redirect })}`

/**
 * Sign-in buttons on /p-admin's login screen (`admin.components.afterLogin`).
 * Payload's own form is gone with its local strategy; these go through the
 * same routes as the Admin and come back to /p-admin.
 */
export function PayloadAdminSignIn({ searchParams }: Props) {
  const back = first(searchParams?.redirect) || "/p-admin"
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {readEntraConfig() && (
        <Button
          buttonStyle="primary"
          el="anchor"
          size="large"
          url={withRedirect(START_PATH, back)}
        >
          Sign in with Microsoft
        </Button>
      )}
      {devSignInEnabled() && (
        <Button
          buttonStyle="secondary"
          el="anchor"
          size="large"
          url={withRedirect(DEV_PATH, back)}
        >
          Dev sign-in
        </Button>
      )}
    </div>
  )
}

/** /p-admin's logout control (`admin.components.logout.Button`). */
export function PayloadAdminSignOut() {
  return <a href={withRedirect(SIGN_OUT_PATH, "/p-admin/login")}>Sign out</a>
}
