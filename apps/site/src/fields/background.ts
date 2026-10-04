import type { Field, SelectField } from "payload"

/**
 * The surfaces a Block can sit on, each one a colour of the Theme: the page,
 * its muted tone, the primary, accent and third colours, and the dark
 * surface. (A Theme with no third colour draws Third as Primary.)
 */
export const backgrounds = [
  "default",
  "muted",
  "primary",
  "accent",
  "third",
  "dark",
] as const

export type Background = (typeof backgrounds)[number]

/** How a Block's text is coloured: worked out from its background, or set. */
export const textColours = ["auto", "white", "dark"] as const

export type TextColour = (typeof textColours)[number]

/**
 * `custom` for a field that says how a Block looks, not what it says. The
 * Visual Editor shows these under the Block tab's Style heading.
 */
export const STYLE = { style: true } as const

/**
 * A Block's background: one of the Theme's colours. The Block's text, links
 * and buttons are drawn to read on it.
 */
export const backgroundField: SelectField = {
  name: "background",
  label: "Background",
  type: "select",
  defaultValue: "default",
  options: [
    { label: "Default", value: "default" },
    { label: "Muted", value: "muted" },
    { label: "Primary", value: "primary" },
    { label: "Accent", value: "accent" },
    { label: "Third colour", value: "third" },
    { label: "Dark surface", value: "dark" },
  ],
  custom: STYLE,
}

/**
 * A Block's text colour. Automatic is the colour the Theme works out to read
 * on the background. White and Dark (the Theme's text colour) are used as
 * they are, even where they are hard to read (apps/site ADR-0013).
 */
export const textColourField: SelectField = {
  name: "textColour",
  label: "Text colour",
  type: "select",
  defaultValue: "auto",
  options: [
    { label: "Automatic", value: "auto" },
    { label: "White", value: "white" },
    { label: "Dark", value: "dark" },
  ],
  admin: {
    description:
      "Automatic reads well on the background. White and Dark are used as they are.",
  },
  custom: STYLE,
}

/** A Block's surface: its background and its text colour, from the Theme. */
export const surfaceFields: Field[] = [backgroundField, textColourField]
