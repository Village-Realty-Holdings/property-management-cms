import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

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
  editing = false,
  locked,
  children,
}: {
  layout: Pick<Layout, "header" | "footer"> | null
  brand: Brand
  fixtures: SiteFixtures
  /** The Visual Editor's canvas is drawing this (see `EditableText`). */
  editing?: boolean
  /**
   * In the Visual Editor, the part that cannot be edited now: the Layout's
   * Header and Footer beside a Page, or the Page (dimmed) beside a Layout.
   * It is inert, so neither the pointer nor the keyboard reaches it.
   */
  locked?: "layout" | "page"
  children: ReactNode
}) {
  const context = { brand, fixtures, editing }
  const lockLayout = editing && locked === "layout"
  const region = (node: ReactNode) =>
    lockLayout ? <div inert>{node}</div> : node
  return (
    <div className="flex min-h-svh flex-col">
      {layout &&
        region(
          <RegionBlocks
            region="header"
            blocks={layout.header}
            context={context}
          />
        )}
      <main
        className={cn("flex-1", editing && locked === "page" && "opacity-40")}
        inert={editing && locked === "page" ? true : undefined}
      >
        {children}
      </main>
      {layout &&
        region(
          <RegionBlocks
            region="footer"
            blocks={layout.footer}
            context={context}
          />
        )}
    </div>
  )
}
