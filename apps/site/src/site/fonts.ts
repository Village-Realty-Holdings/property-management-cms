import {
  Bricolage_Grotesque,
  Instrument_Sans,
  Karla,
  Newsreader,
  Public_Sans,
  Zilla_Slab,
} from "next/font/google"

import type { FontPairing } from "./theme"

/**
 * The three font pairings a Site can choose (Site Settings `branding.fontPairing`).
 * Each font only defines a CSS variable; the layout points `--font-sans`
 * (body) and `--font-display` (headings) at the Site's pair, so the browser
 * downloads only the two faces the Site uses. Not preloaded: the layout
 * reads the pair from Site Settings at request time.
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

/** Classes that define every pairing's font variables. */
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

/** CSS custom properties selecting the Site's pair. */
export function fontVars(pairing: FontPairing): Record<string, string> {
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
