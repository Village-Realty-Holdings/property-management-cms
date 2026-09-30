import type { ReactNode } from "react"

import type { Layout } from "../payload-types"
import type { Brand } from "./brand"
import type { SiteFixtures } from "./fixtures"
import { RegionBlocks } from "./regions"

/**
 * A Page's content between its Layout's Header and Footer (apps/site
 * ADR-0006). A Page with no Layout ("No Layout", or a Site with none) is the
 * content alone. Colours and fonts come from the Theme's variables, which the
 * root layout emits at :root (see SiteThemeStyle), so portalled content is
 * styled too.
 */
export function LayoutFrame({
  layout,
  brand,
  fixtures,
  children,
}: {
  layout: Layout | null
  brand: Brand
  fixtures: SiteFixtures
  children: ReactNode
}) {
  const context = { brand, fixtures, editing: false }
  return (
    <div className="flex min-h-svh flex-col">
      {layout && (
        <RegionBlocks
          region="header"
          blocks={layout.header}
          context={context}
        />
      )}
      <main className="flex-1">{children}</main>
      {layout && (
        <RegionBlocks
          region="footer"
          blocks={layout.footer}
          context={context}
        />
      )}
    </div>
  )
}
