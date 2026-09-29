import type { ReactNode } from "react"

import { getSiteSettings } from "@workspace/content"
import { SiteFrame as Frame } from "@workspace/site-views"

import { currentYear } from "@/lib/year"

/** The Site's usual chrome (header, main, footer) with this deployment's content. */
export async function SiteFrame({ children }: { children: ReactNode }) {
  const [settings, year] = await Promise.all([getSiteSettings(), currentYear()])
  return (
    <Frame settings={settings} year={year}>
      {children}
    </Frame>
  )
}
