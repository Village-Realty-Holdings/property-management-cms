/**
 * The choices for every Theme control that is a pick from a short list. The
 * single source of truth: the Theme record's select fields, the editor's
 * controls and the input types all come from these arrays. Values are stored;
 * labels are what Staff Users read; hints are one short line under a choice.
 */

type Option<V extends string> = {
  readonly value: V
  readonly label: string
  readonly hint?: string
}

const options = <const T extends readonly Option<string>[]>(list: T) => list

export const NEUTRAL_TINTS = options([
  { value: "neutral", label: "Neutral", hint: "Pure greys" },
  { value: "warm", label: "Warm", hint: "Greys lean sand" },
  { value: "cool", label: "Cool", hint: "Greys lean blue" },
  { value: "brand", label: "Brand", hint: "Greys lean your primary colour" },
])

export const HEADING_WEIGHTS = options([
  { value: "regular", label: "Regular" },
  { value: "medium", label: "Medium" },
  { value: "bold", label: "Bold" },
  { value: "black", label: "Black" },
])

export const HEADING_CASES = options([
  { value: "normal", label: "Normal" },
  { value: "uppercase", label: "UPPERCASE" },
])

export const BUTTON_CORNERS = options([
  { value: "square", label: "Square" },
  { value: "soft", label: "Soft" },
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
])

export const CARD_CORNERS = options([
  { value: "square", label: "Square" },
  { value: "soft", label: "Soft" },
  { value: "rounded", label: "Rounded" },
])

export const SPACINGS = options([
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
])

export const SHADOWS = options([
  { value: "none", label: "None" },
  { value: "subtle", label: "Subtle" },
  { value: "lifted", label: "Lifted" },
])

export const BUTTON_STYLES = options([
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
])

export const BUTTON_LETTERS = options([
  { value: "normal", label: "Normal" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "title", label: "Title Case" },
])

export const BUTTON_WEIGHTS = options([
  { value: "regular", label: "Regular" },
  { value: "medium", label: "Medium" },
  { value: "bold", label: "Bold" },
])

export const MOTIONS = options([
  { value: "none", label: "None" },
  { value: "subtle", label: "Subtle" },
  { value: "lively", label: "Lively" },
])

/** The stored values of an option list. */
export type OptionValue<T extends readonly { value: string }[]> =
  T[number]["value"]

/** The values of an option list, e.g. for a validator. */
export const valuesOf = <T extends readonly { value: string }[]>(
  list: T
): OptionValue<T>[] => list.map((option) => option.value)
