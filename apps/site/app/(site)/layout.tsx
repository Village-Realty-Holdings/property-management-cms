import type { ReactNode } from "react"

import { SiteFrame } from "@/components/site-frame"

/**
 * Rentals, areas, lists, guides and specials: always the Site's usual
 * chrome. CMS Pages (app/[[...path]]) choose theirs by Page Template.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>
}
