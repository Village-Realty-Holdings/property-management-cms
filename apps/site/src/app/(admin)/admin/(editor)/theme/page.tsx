import type { Metadata } from "next"

import { ThemeMode } from "@/admin/editor/modes/ThemeMode"
import { requireStaff } from "@/admin/session"
import { countPublishedPages, loadHomePreview } from "@/admin/theme/previewPage"
import { loadThemeScreen } from "@/admin/theme/themeScreen"
import { getAvailableFonts } from "@/fonts/available"
import { readLiveTheme } from "@/theme/record"

export const metadata: Metadata = { title: "Theme" }

/**
 * The Theme in the Visual Editor (Theme mode, ADR-0004): its controls and
 * History on the left, the Site on the canvas, starting on Home. The unsaved
 * Theme follows the Staff User across Pages until it is saved or discarded.
 */
export default async function ThemePage() {
  const { payload, as } = await requireStaff()
  const [live, fonts, screen, publishedPages, home] = await Promise.all([
    readLiveTheme(payload),
    getAvailableFonts(payload),
    loadThemeScreen(payload, as),
    countPublishedPages(payload, as),
    loadHomePreview(payload, as),
  ])
  return (
    <ThemeMode
      live={live.inputs}
      fonts={fonts}
      history={screen.history}
      publishedPages={publishedPages}
      home={home}
    />
  )
}
