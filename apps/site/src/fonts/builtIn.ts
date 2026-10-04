import type { FontKind } from "./types"

/**
 * The six built-in fonts, kept as quick picks next to the Fonts Users add.
 * They are loaded by src/site/fonts.ts (next/font, self-hosted at build), so
 * they have no files to store and can't be deleted. `cssVariable` is the
 * variable that file defines for the font; builtIn.test.ts checks this list
 * against it.
 */
export type BuiltInFont = {
  family: string
  kind: FontKind
  weights: readonly number[]
  cssVariable: string
}

export const BUILT_IN_FONTS: readonly BuiltInFont[] = [
  {
    family: "Newsreader",
    kind: "serif",
    weights: [400, 500, 600, 700],
    cssVariable: "--font-classic-display",
  },
  {
    family: "Public Sans",
    kind: "sans",
    weights: [400, 500, 600, 700],
    cssVariable: "--font-classic-body",
  },
  {
    family: "Bricolage Grotesque",
    kind: "sans",
    weights: [400, 500, 600, 700],
    cssVariable: "--font-modern-display",
  },
  {
    family: "Instrument Sans",
    kind: "sans",
    weights: [400, 500, 600, 700],
    cssVariable: "--font-modern-body",
  },
  {
    family: "Zilla Slab",
    kind: "slab",
    weights: [500, 600, 700],
    cssVariable: "--font-rustic-display",
  },
  {
    family: "Karla",
    kind: "sans",
    weights: [400, 500, 600, 700],
    cssVariable: "--font-rustic-body",
  },
]
