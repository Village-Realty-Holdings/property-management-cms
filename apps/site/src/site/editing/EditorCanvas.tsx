"use client"

import type { MouseEvent } from "react"

import type { AvailableFont } from "../../fonts/available"
import type { Brand } from "../brand"
import { Blocks } from "../blocks"
import type { SiteFixtures } from "../fixtures"
import { LayoutFrame } from "../LayoutFrame"
import { siteThemeCss } from "../themeStyle"
import { useCanvasDocument } from "./useCanvasDocument"

/**
 * The Visual Editor's canvas: the Site route in its editing mode. It draws
 * the Blocks and the Layout's region Blocks from the latest document the
 * Admin posted (see bridge.ts), with the same components the Site uses and
 * `editing` on, so what the Staff User edits is what visitors see.
 *
 * While the Theme is being edited the document carries its unsaved inputs.
 * Their tokens are derived here, in the browser, into a `:root` rule that
 * follows the Theme the route already emitted, so a control shows on the next
 * frame with no request. `fonts` are the Site's stored Fonts, which a
 * font key in those inputs can name.
 *
 * Links do not navigate: the Staff User edits a Page here, and the Admin
 * moves between Pages.
 */
export function EditorCanvas({
  brand,
  fixtures,
  fonts,
}: {
  brand: Brand
  fixtures: SiteFixtures
  fonts: readonly AvailableFont[]
}) {
  const document = useCanvasDocument()

  // Nothing is shown until the Admin has sent something to show.
  if (!document) return <div className="min-h-svh" aria-busy="true" />

  // Theme mode shows Pages to see the Theme on: Block editing is off.
  const editing = document.mode !== "theme"

  return (
    <div onClickCapture={stopNavigation}>
      {document.theme && (
        <style
          id="editor-theme"
          // Raw, like SiteThemeStyle: React would escape the font rules' quotes.
          dangerouslySetInnerHTML={{
            __html: siteThemeCss({ inputs: document.theme, fonts }),
          }}
        />
      )}
      <LayoutFrame
        layout={{ header: document.header, footer: document.footer }}
        brand={brand}
        fixtures={fixtures}
        editing={editing}
        locked={
          document.mode === "page"
            ? "layout"
            : document.mode === "layout"
              ? "page"
              : undefined
        }
      >
        <Blocks blocks={document.page} fixtures={fixtures} editing={editing} />
      </LayoutFrame>
    </div>
  )
}

/** A link in the canvas is part of the page being edited, not a way out of it. */
function stopNavigation(event: MouseEvent) {
  if ((event.target as Element).closest("a[href]")) event.preventDefault()
}
