import {
  Bricolage_Grotesque,
  Instrument_Sans,
  Karla,
  Newsreader,
  Public_Sans,
  Zilla_Slab,
} from "next/font/google"

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
