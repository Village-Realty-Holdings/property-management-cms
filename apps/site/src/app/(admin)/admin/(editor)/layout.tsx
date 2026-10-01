import type { ReactNode } from "react"

import { requireStaff } from "@/admin/session"

/**
 * The editor's document never scrolls: the shell fills the viewport and owns
 * its scrolling (the panel scrolls inside itself, the canvas iframe scrolls
 * its own document). This is rendered inside the route's layout rather than
 * hoisted, so it goes away with the route when Staff leave for a screen that
 * does scroll.
 */
const NON_SCROLLING_DOCUMENT = "html,body{height:100svh;overflow:hidden}"

/**
 * The Visual Editor's routes: signed-in Staff only, full screen, with no
 * sidebar. The Visual Editor shell draws the top bar, the panel and the canvas
 * (and its `<main>` is the skip link's target, from the Admin's root layout).
 */
export default async function AdminEditorLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireStaff()
  return (
    <>
      <style>{NON_SCROLLING_DOCUMENT}</style>
      {children}
    </>
  )
}
