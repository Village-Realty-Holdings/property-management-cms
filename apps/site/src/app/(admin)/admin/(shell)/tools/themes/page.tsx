import type { Metadata } from "next"

import { ThemesList } from "@/admin/components/themes/ThemesList"
import { loadThemes } from "@/admin/savedThemes"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Themes" }

/** Themes: the built-in presets and the Saved Themes, to apply, export or import. */
export default async function ThemesPage() {
  const { payload, as } = await requireStaff()
  return <ThemesList cards={await loadThemes(payload, as)} />
}
