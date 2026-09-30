import type {
  Field,
  GlobalBeforeChangeHook,
  GlobalBeforeValidateHook,
  GlobalConfig,
  SelectField,
  TextFieldSingleValidation,
} from "payload"

import { anyone, signedIn } from "../access"
import { checkFontKey } from "../theme/record/fontKeys"
import { saveSummary } from "../theme/record/summary"
import { normalizeHex } from "../theme/colour"
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
} from "../theme/options"
import {
  INPUT_LABELS,
  normalizeInputs,
  type ThemeInputs,
} from "../theme/inputs"
import { FALLBACK_INPUTS } from "../theme/record/fallback"

const COLOUR_KEYS = [
  "primary",
  "accent",
  "third",
  "text",
  "darkSurface",
] as const

const colourField = (
  name: "primary" | "accent" | "third" | "text" | "darkSurface",
  options: { required: boolean; description?: string }
): Field => ({
  name,
  label: INPUT_LABELS[name],
  type: "text",
  required: options.required,
  ...(options.required ? { defaultValue: FALLBACK_INPUTS[name] ?? "" } : {}),
  validate: (value: unknown) => {
    if (value == null || value === "") {
      return options.required
        ? `Enter the ${INPUT_LABELS[name].toLowerCase()} as a hex code, such as #283d6b.`
        : true
    }
    return (
      normalizeHex(typeof value === "string" ? value : null) !== null ||
      `Enter the ${INPUT_LABELS[name].toLowerCase()} as a hex code, such as #283d6b.`
    )
  },
  ...(options.description
    ? { admin: { description: options.description } }
    : {}),
})

const selectField = (
  name: keyof ThemeInputs,
  list: readonly { value: string; label: string }[]
): SelectField => ({
  name,
  label: INPUT_LABELS[name],
  type: "select",
  required: true,
  defaultValue: FALLBACK_INPUTS[name] as string,
  options: list.map(({ value, label }) => ({ value, label })),
})

const fontField = (name: "headingFont" | "bodyFont"): Field => ({
  name,
  label: INPUT_LABELS[name],
  type: "text",
  required: true,
  defaultValue: FALLBACK_INPUTS[name],
  validate: ((value, { req }) =>
    checkFontKey(
      value,
      INPUT_LABELS[name],
      req.payload,
      req
    )) satisfies TextFieldSingleValidation,
  admin: {
    description:
      "A built-in font (built-in:<family>) or a stored Font (font:<id>). The Theme editor picks it from a list.",
  },
})

/** Colours are stored as `#rrggbb`; an invalid value is left for the validator. */
const normalizeColours: GlobalBeforeValidateHook = ({ data }) => {
  if (!data) return data
  const next: Record<string, unknown> = { ...data }
  for (const key of COLOUR_KEYS) {
    const value = next[key]
    if (typeof value !== "string") continue
    if (value.trim() === "") {
      next[key] = null
      continue
    }
    next[key] = normalizeHex(value) ?? value
  }
  return next
}

/**
 * Records who saved the version and what changed. Both are always set here,
 * so nothing a client sends for them is kept.
 */
const recordVersionDetails: GlobalBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const previous = normalizeInputs(originalDoc, FALLBACK_INPUTS)
  const next = normalizeInputs({ ...originalDoc, ...data }, FALLBACK_INPUTS)
  const first = !originalDoc?.id
  return {
    ...data,
    updatedBy: req.user?.collection === "users" ? req.user.id : null,
    changeSummary: saveSummary(previous, next, {
      first,
      note: typeof data.note === "string" ? data.note : null,
    }),
    // The note is spent on this version's summary: don't carry it on.
    note: null,
  }
}

const staffOnly = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

/**
 * The Theme: the Site's look, set by the Theme controls in
 * src/theme/inputs.ts (apps/site ADR-0004). Its own record with a version
 * history. There are no Drafts: a save goes live at once, and restoring an
 * earlier version saves it again as a new version, so the history only grows.
 * Server code reads and writes it through src/theme/record.
 */
export const Theme: GlobalConfig = {
  slug: "theme",
  label: "Theme",
  access: {
    read: anyone,
    update: signedIn,
    readVersions: signedIn,
  },
  // Every version is kept: the history lists them all.
  versions: { max: 0 },
  hooks: {
    beforeValidate: [normalizeColours],
    beforeChange: [recordVersionDetails],
  },
  fields: [
    colourField("primary", { required: true }),
    colourField("accent", { required: true }),
    colourField("third", {
      required: false,
      description: "Optional. Leave empty for a two-colour Theme.",
    }),
    colourField("text", {
      required: true,
      description: "The ink: body and heading text.",
    }),
    colourField("darkSurface", {
      required: false,
      description: "Dark bands. Leave empty to derive it from the text colour.",
    }),
    selectField("neutralTint", NEUTRAL_TINTS),
    fontField("headingFont"),
    fontField("bodyFont"),
    selectField("headingWeight", HEADING_WEIGHTS),
    selectField("headingCase", HEADING_CASES),
    selectField("buttonCorners", BUTTON_CORNERS),
    selectField("cardCorners", CARD_CORNERS),
    selectField("spacing", SPACINGS),
    selectField("shadows", SHADOWS),
    selectField("buttonStyle", BUTTON_STYLES),
    selectField("buttonLetters", BUTTON_LETTERS),
    selectField("buttonWeight", BUTTON_WEIGHTS),
    selectField("motion", MOTIONS),
    {
      name: "note",
      type: "text",
      maxLength: 500,
      access: { read: staffOnly },
      admin: {
        description:
          "Optional. Replaces the automatic summary of this save in the history.",
      },
    },
    {
      name: "changeSummary",
      type: "text",
      access: { read: staffOnly },
      admin: { readOnly: true },
    },
    {
      name: "updatedBy",
      label: "Saved by",
      type: "relationship",
      relationTo: "users",
      access: { read: staffOnly },
      admin: { readOnly: true },
    },
  ],
}
