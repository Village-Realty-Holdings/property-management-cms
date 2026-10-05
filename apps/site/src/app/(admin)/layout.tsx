import type { ReactNode } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import "@workspace/ui/globals.css"

import { AdminKitHost } from "@/admin/kit"

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
}

/**
 * The Admin's root layout (apps/site ADR-0002): shadcn/ui on its own styles.
 * Every Admin page is rendered per request, for the signed-in User, never at
 * build time: a build (on Cloudflare, say) has no database or secret.
 */
export default async function AdminRootLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  return (
    <html lang="en">
      <body className="min-h-svh bg-muted/40 font-sans text-foreground antialiased">
        <AdminKitHost />
        {children}
      </body>
    </html>
  )
}
