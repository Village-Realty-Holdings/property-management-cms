import {
  Bricolage_Grotesque,
  Instrument_Sans,
  Karla,
  Newsreader,
  Public_Sans,
  Zilla_Slab,
} from "next/font/google"

/** @deprecated Remove with `fontVars` when the site-apply item lands. */
export type FontPairing = "classic" | "modern" | "rustic"

/**
 * @deprecated The pairing every Site used before the Theme chose fonts. Fonts
 * now resolve by key through ./fontStacks; remove when site-apply lands.
 */
export const DEFAULT_FONT_PAIRING: FontPairing = "classic"

/**
 * The six built-in fonts, self-hosted by next/font. Each font only defines a
 * CSS variable, on <html> through `fontVariables`; the Theme's stacks
 * (`resolveFontStack`, ./fontStacks) point `--font-sans` and `--font-display`
 * at them, so the browser downloads only the faces in use. Not preloaded:
 * the fonts are chosen at request time. Uploaded and Google-imported Fonts
 * are stored Fonts, served through @font-face (see ./fontStacks).
 */

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-classic-display",
  style: ["normal", "italic"],
  preload: false,
})
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-classic-body",
  preload: false,
})
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-modern-display",
  preload: false,
})
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-modern-body",
  preload: false,
})
const zillaSlab = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rustic-display",
  preload: false,
})
const karla = Karla({
  subsets: ["latin"],
  variable: "--font-rustic-body",
  preload: false,
})

/** Classes that define every built-in font's variable. */
export const fontVariables = [
  newsreader,
  publicSans,
  bricolage,
  instrumentSans,
  zillaSlab,
  karla,
]
  .map((font) => font.variable)
  .join(" ")

/**
 * @deprecated Fonts now resolve by key: use `themeFontFaces` (./fontStacks)
 * and the Theme's tokens. Kept only until the site-apply item removes its
 * callers (SiteFrame).
 */
export function fontVars(
  pairing: FontPairing = DEFAULT_FONT_PAIRING
): Record<string, string> {
  return {
    "--font-sans": `var(--font-${pairing}-body)`,
    "--font-display": `var(--font-${pairing}-display)`,
    // Headings per pairing: weight and tracking suit each face.
    "--display-weight": { classic: "500", modern: "700", rustic: "600" }[
      pairing
    ],
    "--display-tracking": {
      classic: "-0.015em",
      modern: "-0.035em",
      rustic: "-0.01em",
    }[pairing],
  }
}
