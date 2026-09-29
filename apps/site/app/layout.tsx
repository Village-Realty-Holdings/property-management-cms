import { Suspense, type ReactNode } from "react"
import type { Metadata } from "next"

import "@workspace/ui/globals.css"
import { getSiteSettings } from "@workspace/content"
import { cn } from "@workspace/ui/lib/utils"

import {
  fontVariables,
  FormActionsProvider,
  SiteTheme,
} from "@workspace/site-views"
import { resolveBrand } from "@workspace/site-views/theme/branding"

import { findInquiryProperty, submit } from "@/app/actions/submit"
import { hasSite, requireSiteEnv } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  // Without SITE (a CI build) there is no Site to describe yet; rendering
  // fails with a clear error at request time instead (see SiteChrome).
  if (!hasSite()) return {}
  const brand = resolveBrand(await getSiteSettings())
  return {
    title: {
      default: brand.tagline ? `${brand.name}: ${brand.tagline}` : brand.name,
      template: `%s | ${brand.name}`,
    },
    description: brand.tagline ?? `Vacation rentals from ${brand.name}.`,
    applicationName: brand.name,
    openGraph: { siteName: brand.name, type: "website" },
  }
}

/** The deployment's Site's theme (see SiteTheme). */
async function SiteChrome({ children }: { children: ReactNode }) {
  await requireSiteEnv()
  return <SiteTheme settings={await getSiteSettings()}>{children}</SiteTheme>
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={cn("antialiased", fontVariables)}>
      <body>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-background px-4 py-2 text-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-3 focus:ring-ring/50"
        >
          Skip to content
        </a>
        <FormActionsProvider actions={{ submit, findInquiryProperty }}>
          {hasSite() ? (
            // Not behind Suspense: the page renders before the response starts
            // streaming, so notFound() can still send a 404 status.
            <SiteChrome>{children}</SiteChrome>
          ) : (
            // A build without SITE (CI) defers the chrome to request time.
            <Suspense fallback={<div className="min-h-svh" />}>
              <SiteChrome>{children}</SiteChrome>
            </Suspense>
          )}
        </FormActionsProvider>
      </body>
    </html>
  )
}
