import type { ThemeInputs } from "./inputs"

/**
 * The fixed Theme presets. A preset is a full set of inputs, so applying one
 * is an ordinary edit of every control. The four general presets use only the
 * built-in fonts. A brand preset names the families the real brand uses
 * (`preferredFonts`); those are Google Fonts or uploaded Fonts, so the
 * preset also carries built-in stand-ins for a Site that has not added them.
 */
export type ThemePreset = {
  id: string
  name: string
  blurb: string
  /** Set for a Site brand's preset. */
  brand?: boolean
  inputs: ThemeInputs
  /** Font families the brand uses, when they are not built in. */
  preferredFonts?: { heading?: string; body?: string }
}

const builtIn = (family: string) => `built-in:${family}`

export const HARBOUR: ThemePreset = {
  id: "harbour",
  name: "Harbour",
  blurb: "Deep teal, sunny yellow, crisp corners.",
  inputs: {
    primary: "#2d4447",
    accent: "#fcd900",
    third: null,
    text: "#1a2a2c",
    darkSurface: null,
    neutralTint: "cool",
    headingFont: builtIn("Bricolage Grotesque"),
    bodyFont: builtIn("Instrument Sans"),
    headingWeight: "bold",
    headingCase: "normal",
    buttonCorners: "square",
    cardCorners: "square",
    spacing: "spacious",
    shadows: "subtle",
    buttonStyle: "solid",
    buttonLetters: "uppercase",
    buttonWeight: "bold",
    motion: "subtle",
  },
}

export const TERRACOTTA: ThemePreset = {
  id: "terracotta",
  name: "Terracotta",
  blurb: "Warm orange on stone, friendly rounding.",
  inputs: {
    primary: "#bf421d",
    accent: "#f6c9a8",
    third: null,
    text: "#2b2119",
    darkSurface: null,
    neutralTint: "warm",
    headingFont: builtIn("Public Sans"),
    bodyFont: builtIn("Public Sans"),
    headingWeight: "bold",
    headingCase: "normal",
    buttonCorners: "soft",
    cardCorners: "soft",
    spacing: "comfortable",
    shadows: "lifted",
    buttonStyle: "solid",
    buttonLetters: "normal",
    buttonWeight: "bold",
    motion: "subtle",
  },
}

export const CLASSIC: ThemePreset = {
  id: "classic",
  name: "Classic",
  blurb: "Navy and apricot, serif headings.",
  inputs: {
    primary: "#283d6b",
    accent: "#f2a65a",
    third: null,
    text: "#1d2433",
    darkSurface: null,
    neutralTint: "brand",
    headingFont: builtIn("Newsreader"),
    bodyFont: builtIn("Public Sans"),
    headingWeight: "medium",
    headingCase: "normal",
    buttonCorners: "pill",
    cardCorners: "soft",
    spacing: "comfortable",
    shadows: "none",
    buttonStyle: "solid",
    buttonLetters: "normal",
    buttonWeight: "medium",
    motion: "lively",
  },
}

export const MEADOW: ThemePreset = {
  id: "meadow",
  name: "Meadow",
  blurb: "Forest green, slab headings, relaxed.",
  inputs: {
    primary: "#2f5d3a",
    accent: "#e9c46a",
    third: null,
    text: "#1f2a20",
    darkSurface: null,
    neutralTint: "warm",
    headingFont: builtIn("Zilla Slab"),
    bodyFont: builtIn("Karla"),
    headingWeight: "bold",
    headingCase: "normal",
    buttonCorners: "rounded",
    cardCorners: "rounded",
    spacing: "spacious",
    shadows: "subtle",
    buttonStyle: "outline",
    buttonLetters: "normal",
    buttonWeight: "bold",
    motion: "none",
  },
}

/**
 * Adapted from research/brands/warren-beach/theme-preset.json. The measured
 * navy ink is now the Text colour, and the navy buttons are the Third colour.
 */
export const WARREN_BEACH: ThemePreset = {
  id: "warren-beach",
  name: "Warren Beach",
  blurb: "Coastal blue, deep navy ink, cyan accent, friendly pill buttons.",
  brand: true,
  inputs: {
    primary: "#0071ce",
    accent: "#009dd6",
    third: "#1f1646",
    text: "#1f1646",
    darkSurface: null,
    neutralTint: "cool",
    headingFont: builtIn("Public Sans"),
    bodyFont: builtIn("Public Sans"),
    headingWeight: "medium",
    headingCase: "normal",
    buttonCorners: "pill",
    cardCorners: "soft",
    spacing: "comfortable",
    shadows: "none",
    buttonStyle: "solid",
    buttonLetters: "normal",
    buttonWeight: "medium",
    motion: "subtle",
  },
  preferredFonts: { heading: "Source Sans 3", body: "Source Sans 3" },
}

/**
 * Adapted from research/brands/avada/theme-preset.json. Title Case buttons,
 * the teal ink and the near-black owner bands are now expressible.
 */
export const AVADA: ThemePreset = {
  id: "avada",
  name: "Avada",
  blurb: "Sunrise orange on deep teal ink, Montserrat, soft buttons.",
  brand: true,
  inputs: {
    primary: "#ce4b25",
    accent: "#b45309",
    third: null,
    text: "#072629",
    darkSurface: "#181818",
    neutralTint: "cool",
    headingFont: builtIn("Bricolage Grotesque"),
    bodyFont: builtIn("Instrument Sans"),
    headingWeight: "bold",
    headingCase: "normal",
    buttonCorners: "soft",
    cardCorners: "rounded",
    spacing: "spacious",
    shadows: "subtle",
    buttonStyle: "solid",
    buttonLetters: "title",
    buttonWeight: "bold",
    motion: "subtle",
  },
  preferredFonts: { heading: "Montserrat", body: "Montserrat" },
}

/** The invented Beachside Vacations brand (spec Phase 6). */
export const BEACHSIDE: ThemePreset = {
  id: "beachside",
  name: "Beachside",
  blurb: "Deep sea and coral on sand, Fraunces headings, pill buttons.",
  brand: true,
  inputs: {
    primary: "#0e5e6f",
    accent: "#ff7f5c",
    third: "#f2e3c9",
    text: "#10323a",
    darkSurface: "#0b2a31",
    neutralTint: "warm",
    headingFont: builtIn("Newsreader"),
    bodyFont: builtIn("Public Sans"),
    headingWeight: "bold",
    headingCase: "normal",
    buttonCorners: "pill",
    cardCorners: "rounded",
    spacing: "spacious",
    shadows: "subtle",
    buttonStyle: "solid",
    buttonLetters: "normal",
    buttonWeight: "bold",
    motion: "lively",
  },
  preferredFonts: { heading: "Fraunces", body: "Nunito Sans" },
}

export const GENERAL_PRESETS: readonly ThemePreset[] = [
  HARBOUR,
  TERRACOTTA,
  CLASSIC,
  MEADOW,
]
export const BRAND_PRESETS: readonly ThemePreset[] = [
  WARREN_BEACH,
  AVADA,
  BEACHSIDE,
]

/** Every preset, general first. */
export const PRESETS: readonly ThemePreset[] = [
  ...GENERAL_PRESETS,
  ...BRAND_PRESETS,
]

/** Where a new Site's Theme starts. */
export const DEFAULT_PRESET = HARBOUR
export const DEFAULT_INPUTS: ThemeInputs = DEFAULT_PRESET.inputs

export function findPreset(id: string): ThemePreset | undefined {
  return PRESETS.find((preset) => preset.id === id)
}

/**
 * The inputs a Staff User gets by picking `preset`: its preferred fonts where
 * the Site has them (matched by family name, case-insensitively), otherwise
 * the preset's built-in stand-ins.
 */
export function presetInputs(
  preset: ThemePreset,
  fonts: readonly { key: string; family: string }[]
): ThemeInputs {
  const pick = (family: string | undefined, standIn: string) => {
    const wanted = family?.trim().toLowerCase()
    const found = wanted
      ? fonts.find((font) => font.family.trim().toLowerCase() === wanted)
      : undefined
    return found?.key ?? standIn
  }
  return {
    ...preset.inputs,
    headingFont: pick(
      preset.preferredFonts?.heading,
      preset.inputs.headingFont
    ),
    bodyFont: pick(preset.preferredFonts?.body, preset.inputs.bodyFont),
  }
}
