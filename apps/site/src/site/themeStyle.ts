import type { AvailableFont } from "../fonts/available"
import { deriveTheme, themeCss, type ThemeInputs } from "../theme"
import { FALLBACK_INPUTS } from "../theme/record/fallback"
import { themeFontFaces } from "./fontStacks"

/**
 * The Site's stylesheet for a Theme: the `@font-face` rules for the fonts in
 * use, then the derived tokens at `:root` (so content portalled out of the
 * Site's wrapper, such as dialogs and sheets, is themed too), then the
 * reduced-motion override. Pure, so the wiring is tested without Next.
 */

/** What the layout reads: the live Theme's inputs and the fonts it may name. */
export type SiteTheme = {
  inputs: ThemeInputs
  fonts: readonly AvailableFont[]
}

/**
 * `theme` is null when nothing has been read; the Site then looks like the
 * default preset (Classic), as it does before any Theme is saved.
 */
export function siteThemeCss(theme: SiteTheme | null): string {
  const inputs = theme?.inputs ?? FALLBACK_INPUTS
  const { css, headingStack, bodyStack } = themeFontFaces(
    inputs.headingFont,
    inputs.bodyFont,
    theme?.fonts ?? []
  )
  const tokens = themeCss(
    deriveTheme(inputs, { heading: headingStack, body: bodyStack })
  )
  // Font CSS is built from Font records (family names): keep it from ending
  // the <style> element it is inlined in.
  return [css, tokens].filter(Boolean).join("\n").replace(/[<>]/g, "")
}
