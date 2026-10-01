import { normalizeHex } from "./colour"
import {
  BUTTON_CORNERS,
  BUTTON_LETTERS,
  BUTTON_STYLES,
  BUTTON_WEIGHTS,
  CARD_CORNERS,
  HEADING_CASES,
  HEADING_WEIGHTS,
  MOTIONS,
  NEUTRAL_TINTS,
  SHADOWS,
  SPACINGS,
  valuesOf,
  type OptionValue,
} from "./options"

/**
 * The Theme's controls: everything a Staff User sets. There is no per-token
 * editing. Colours are `#rrggbb`. A font is an `AvailableFont.key`
 * (`built-in:<family>` or `font:<id>`).
 */
export type ThemeInputs = {
  primary: string
  accent: string
  /** Optional third brand colour. */
  third: string | null
  /** The ink: body and heading text. */
  text: string
  /** Dark bands. Null derives it from the ink. */
  darkSurface: string | null
  neutralTint: OptionValue<typeof NEUTRAL_TINTS>
  headingFont: string
  bodyFont: string
  headingWeight: OptionValue<typeof HEADING_WEIGHTS>
  headingCase: OptionValue<typeof HEADING_CASES>
  buttonCorners: OptionValue<typeof BUTTON_CORNERS>
  cardCorners: OptionValue<typeof CARD_CORNERS>
  spacing: OptionValue<typeof SPACINGS>
  shadows: OptionValue<typeof SHADOWS>
  buttonStyle: OptionValue<typeof BUTTON_STYLES>
  buttonLetters: OptionValue<typeof BUTTON_LETTERS>
  buttonWeight: OptionValue<typeof BUTTON_WEIGHTS>
  motion: OptionValue<typeof MOTIONS>
}

export type ThemeInputKey = keyof ThemeInputs

/** What Staff Users call each control, in the order the editor shows them. */
export const INPUT_LABELS: Record<ThemeInputKey, string> = {
  primary: "Primary colour",
  accent: "Accent colour",
  third: "Third colour",
  text: "Text colour",
  darkSurface: "Dark surface",
  neutralTint: "Neutral tint",
  headingFont: "Heading font",
  bodyFont: "Body font",
  headingWeight: "Heading weight",
  headingCase: "Heading case",
  buttonCorners: "Button corners",
  cardCorners: "Card corners",
  spacing: "Spacing",
  shadows: "Shadows",
  buttonStyle: "Button style",
  buttonLetters: "Button letters",
  buttonWeight: "Button weight",
  motion: "Motion",
}

/**
 * One line of help under a control, where its label alone can mislead. The
 * editor shows it under the control; the Theme record uses it as the field's
 * description.
 */
export const INPUT_HELP: Partial<Record<ThemeInputKey, string>> = {
  // Solid / Outline changes the primary button. The accent button is the
  // emphasised call to action (Meadow's gold works because it stays a fill).
  buttonStyle:
    "Style applies to primary buttons. The accent button stays filled.",
}

const ENUM_KEYS = {
  neutralTint: valuesOf(NEUTRAL_TINTS),
  headingWeight: valuesOf(HEADING_WEIGHTS),
  headingCase: valuesOf(HEADING_CASES),
  buttonCorners: valuesOf(BUTTON_CORNERS),
  cardCorners: valuesOf(CARD_CORNERS),
  spacing: valuesOf(SPACINGS),
  shadows: valuesOf(SHADOWS),
  buttonStyle: valuesOf(BUTTON_STYLES),
  buttonLetters: valuesOf(BUTTON_LETTERS),
  buttonWeight: valuesOf(BUTTON_WEIGHTS),
  motion: valuesOf(MOTIONS),
} as const

/**
 * Inputs read from storage or a form, made safe to derive from: an invalid or
 * missing value falls back to `fallback`'s, and an invalid optional colour is
 * unset. Never throws.
 */
export function normalizeInputs(
  raw: unknown,
  fallback: ThemeInputs
): ThemeInputs {
  const source: Record<string, unknown> =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const out: ThemeInputs = { ...fallback }
  const write = <K extends ThemeInputKey>(key: K, value: ThemeInputs[K]) => {
    out[key] = value
  }

  for (const key of ["primary", "accent", "text"] as const) {
    const hex = normalizeHex(str(source[key]))
    if (hex) write(key, hex)
  }
  for (const key of ["third", "darkSurface"] as const) {
    if (!(key in source)) continue
    write(key, normalizeHex(str(source[key])))
  }
  for (const key of ["headingFont", "bodyFont"] as const) {
    const value = str(source[key])?.trim()
    if (value) write(key, value)
  }
  for (const key of Object.keys(ENUM_KEYS) as (keyof typeof ENUM_KEYS)[]) {
    const allowed: readonly string[] = ENUM_KEYS[key]
    const value = source[key]
    if (typeof value === "string" && allowed.includes(value))
      write(key, value as never)
  }
  return out
}

const str = (value: unknown) => (typeof value === "string" ? value : null)

/** The labels of the controls that differ, in editor order. */
export function describeChanges(from: ThemeInputs, to: ThemeInputs): string[] {
  return (Object.keys(INPUT_LABELS) as ThemeInputKey[])
    .filter((key) => from[key] !== to[key])
    .map((key) => INPUT_LABELS[key])
}
