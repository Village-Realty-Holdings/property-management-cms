import type { ReactNode } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import "@workspace/ui/globals.css"

import { resolveBrand } from "@/site/brand"
import { fontVariables } from "@/site/fonts"
import { getBrand, getSeo, getTheme } from "@/site/queries"
import { resolveSeo, siteMetadata, siteUrl } from "@/site/seo"
import { SiteFrame } from "@/site/SiteFrame"
import { SiteThemeStyle } from "@/site/SiteThemeStyle"

/** Site-wide metadata from the Brand and SEO: Open Graph, favicon, noindex. */
export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const [brand, seo] = await Promise.all([getBrand(), getSeo()])
  return siteMetadata({
    brand: resolveBrand(brand),
    seo: resolveSeo(seo),
    baseUrl: siteUrl(),
  })
}

/**
 * The public Site's root layout: identity from the Brand, look from the
 * Theme. The Theme's variables and font faces are emitted at :root, so
 * dialogs and sheets portalled out of the Site's wrapper are themed too.
 */
export default async function SiteLayout({
  children,
}: {
  children: ReactNode
}) {
  // Read the Brand, Theme and Pages on every request, so a publish, a Theme
  // save or a restore shows on the next page load.
  await connection()
  const [brandGlobal, theme] = await Promise.all([getBrand(), getTheme()])
  const brand = resolveBrand(brandGlobal)
  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased">
        <SiteThemeStyle theme={theme} />
        <SiteFrame brand={brand}>{children}</SiteFrame>
      </body>
    </html>
  )
}
