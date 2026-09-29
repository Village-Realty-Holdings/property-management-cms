import type { ReactNode } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import "@workspace/ui/globals.css"

import { fontVariables } from "@/site/fonts"
import { getSiteSettings } from "@/site/queries"
import { SiteFrame } from "@/site/SiteFrame"
import { resolveBrand } from "@/site/theme"

export async function generateMetadata(): Promise<Metadata> {
  const brand = resolveBrand(await getSiteSettings())
  return {
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: brand.tagline ?? undefined,
  }
}

/** The public Site's root layout: branding from Site Settings. */
export default async function SiteLayout({
  children,
}: {
  children: ReactNode
}) {
  // Read Site Settings and Pages on every request, so a publish shows at once.
  await connection()
  const brand = resolveBrand(await getSiteSettings())
  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased">
        <SiteFrame brand={brand}>{children}</SiteFrame>
      </body>
    </html>
  )
}
