import type { ReactNode } from "react"

import { requireStaff } from "@/admin/session"

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
  return children
}
