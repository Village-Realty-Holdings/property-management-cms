import type { ReactNode } from "react"

import type { SiteSettings } from "@workspace/content/queries"

import { resolveBrand } from "../theme/branding"

import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

/**
 * The Site's usual chrome: header with navigation, main, footer. Every route
 * uses it except Pages made from a Page Template with chrome of its own
 * (Tuck-In, see tuck-in/).
 */
export function SiteFrame({
  settings,
  year,
  children,
}: {
  settings: SiteSettings
  /** For "© <year>"; the Site passes a cached one so pages prerender. */
  year: number
  children: ReactNode
}) {
  const brand = resolveBrand(settings)
  return (
    <>
      <SiteHeader brand={brand} navigation={settings.navigation} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter brand={brand} navigation={settings.navigation} year={year} />
    </>
  )
}
