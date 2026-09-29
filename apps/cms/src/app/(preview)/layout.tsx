import type { ReactNode } from "react"
import type { Metadata } from "next"

import "@workspace/ui/globals.css"
import { fontVariables } from "@workspace/site-views"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The Preview's own root layout (ADR-0018): the Site's styles and fonts,
 * kept apart from the admin's (`(payload)`). Behind the CMS login, never
 * indexed.
 */
export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
}

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("antialiased", fontVariables)}>
      <body>{children}</body>
    </html>
  )
}
