import type { AvailableFont } from "../../fonts/available"
import { resolveFontStack, type FontRole } from "../../site/fontStacks"
import {
  BUTTON_CORNERS,
  BUTTON_LETTERS,
  BUTTON_STYLES,
  BUTTON_WEIGHTS,
  CARD_CORNERS,
  HEADING_CASES,
  HEADING_WEIGHTS,
  INPUT_LABELS,
  MOTIONS,
  NEUTRAL_TINTS,
  SHADOWS,
  SPACINGS,
  type ThemeInputs,
} from "../../theme"

/**
 * What the Theme screen says about a Theme's non-colour controls, in words a
 * Staff User reads. Pure: the page loads the data, this shapes it.
 */

export type DetailRow = { label: string; value: string }

type Choices = readonly { value: string; label: string }[]

const CHOICES: [keyof ThemeInputs, Choices][] = [
  ["headingWeight", HEADING_WEIGHTS],
  ["headingCase", HEADING_CASES],
  ["buttonCorners", BUTTON_CORNERS],
  ["cardCorners", CARD_CORNERS],
  ["spacing", SPACINGS],
  ["shadows", SHADOWS],
  ["buttonStyle", BUTTON_STYLES],
  ["buttonLetters", BUTTON_LETTERS],
  ["buttonWeight", BUTTON_WEIGHTS],
  ["motion", MOTIONS],
  ["neutralTint", NEUTRAL_TINTS],
]

const familyOf = (key: string) => key.slice(key.indexOf(":") + 1)

function fontLabel(
  key: string,
  role: FontRole,
  available: readonly AvailableFont[]
): string {
  const found = available.find((font) => font.key === key)
  const unusable = found?.source === "stored" && !found.files?.length
  if (found && !unusable) return found.family
  // What the Site shows in its place (see resolveFontStack).
  const usedInstead = familyOf(resolveFontStack(key, available, role).key)
  return found
    ? `${found.family} has no files (${usedInstead} is used instead)`
    : `A deleted Font (${usedInstead} is used instead)`
}

/** The fonts, then every other pick-from-a-list control, labelled. */
export function themeDetails(
  inputs: ThemeInputs,
  available: readonly AvailableFont[]
): DetailRow[] {
  return [
    {
      label: INPUT_LABELS.headingFont,
      value: fontLabel(inputs.headingFont, "heading", available),
    },
    {
      label: INPUT_LABELS.bodyFont,
      value: fontLabel(inputs.bodyFont, "body", available),
    },
    ...CHOICES.map(([key, choices]) => ({
      label: INPUT_LABELS[key],
      value:
        choices.find((choice) => choice.value === inputs[key])?.label ??
        String(inputs[key]),
    })),
  ]
}
