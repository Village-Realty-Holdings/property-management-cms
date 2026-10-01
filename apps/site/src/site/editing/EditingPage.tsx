import type { Metadata } from "next"

import { siteSchema } from "../../database"
import { resolveBrand } from "../brand"
import { fixturesFor } from "../fixtures"
import { getBrand, getTheme } from "../queries"
import { EditorCanvas } from "./EditorCanvas"
import { readThemeParam } from "./flag"

/**
 * The Site route in its editing mode, for a signed-in Staff User (see
 * flag.ts). It reads only what every Page needs around it: the Brand, the
 * Site's fixtures, and the Site's Fonts, which an unsaved Theme may name. The
 * Page, Layout and Theme being edited are not read here: the Visual Editor
 * posts them to the canvas, so the canvas shows the unsaved document, a Draft
 * included, and a Page that is not Published yet still has a canvas.
 */
export async function EditingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const [brand, theme] = await Promise.all([getBrand(), getTheme()])
  return (
    <EditorCanvas
      brand={resolveBrand(brand)}
      fixtures={fixturesFor(siteSchema())}
      fonts={theme.fonts}
      initialTheme={readThemeParam(searchParams)}
    />
  )
}

/** The canvas is never indexed, and search engines are told not to keep a copy. */
export const editingMetadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}
