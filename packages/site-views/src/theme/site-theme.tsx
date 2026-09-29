import type { CSSProperties, ReactNode } from "react"

import type { SiteSettings } from "@workspace/content/queries"

import { brandColorVars, resolveBrand } from "./branding"
import { fontVars } from "./fonts"

/**
 * Theme for a Site: colours and the font pairing from its branding as CSS
 * variables on the wrapper. The header and footer come from the views
 * (SiteFrame, or a Page Template's own chrome). Needs `fontVariables` on
 * <html>.
 */
export function SiteTheme({
  settings,
  children,
}: {
  settings: SiteSettings
  children: ReactNode
}) {
  const brand = resolveBrand(settings)
  const style = {
    ...brandColorVars(brand),
    ...fontVars(brand.fontPairing),
  } as CSSProperties

  // The same variables at :root, so content portalled out of this wrapper
  // (dialogs, sheets) keeps the Site's colours and fonts. Values are CSS
  // colours/font stacks built by resolveBrand; strip anything that could end
  // the rule or the <style> element.
  const rootVars = Object.entries(style)
    .map(([name, value]) => `${name}:${String(value).replace(/[<>{};]/g, "")}`)
    .join(";")

  return (
    <div
      style={style}
      className="flex min-h-svh flex-col bg-background font-sans text-foreground"
    >
      <style>{`:root{${rootVars}}`}</style>
      {children}
    </div>
  )
}
