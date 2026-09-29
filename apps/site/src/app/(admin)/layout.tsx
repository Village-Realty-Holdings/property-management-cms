import type { ReactNode } from "react"
import type { Metadata } from "next"

import "@workspace/ui/globals.css"

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
}

/** The Admin's root layout (apps/site ADR-0002): shadcn/ui on its own styles. */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-muted/40 font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
