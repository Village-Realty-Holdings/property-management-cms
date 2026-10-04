import type { Metadata } from "next"

import { FontsScreen } from "@/admin/components/fonts/FontsScreen"
import { loadFontRows } from "@/admin/fonts/fontsScreen"
import { builtInRows } from "@/admin/fonts/rows"
import { requireUser } from "@/admin/session"
import { fontVariables } from "@/site/fonts"

export const metadata: Metadata = { title: "Fonts" }

/**
 * Assets › Fonts: the Fonts Users added, and the built-in ones. The built-in
 * fonts' variables (next/font) are defined on the group that samples them.
 */
export default async function FontsPage() {
  const { payload, as } = await requireUser()
  const rows = await loadFontRows(payload, as)
  return (
    <FontsScreen
      rows={rows}
      builtIn={builtInRows(rows)}
      builtInClassName={fontVariables}
    />
  )
}
