import type { ReactNode } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import "@workspace/ui/globals.css"

import { resolveBrand } from "@/site/brand"
import { fontVariables } from "@/site/fonts"
import { getBrand, getSeo } from "@/site/queries"
import { resolveSeo, siteMetadata, siteUrl } from "@/site/seo"
import { SiteFrame } from "@/site/SiteFrame"

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

/** The public Site's root layout: identity from the Brand. */
export default async function SiteLayout({
  children,
}: {
  children: ReactNode
}) {
  // Read the Brand and Pages on every request, so a publish shows at once.
  await connection()
  const brand = resolveBrand(await getBrand())
  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased">
        <SiteFrame brand={brand}>{children}</SiteFrame>
      </body>
    </html>
  )
}
