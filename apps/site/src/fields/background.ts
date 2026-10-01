import type { SelectField } from "payload"

/** The surfaces a Block can sit on, each one a Theme token. */
export const backgrounds = ["default", "muted", "primary", "dark"] as const

export type Background = (typeof backgrounds)[number]

/**
 * A Block's background: the Theme's Default, Muted or Primary colour, or its
 * Dark surface. The Block's text, links and buttons are drawn to read on it.
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
    { label: "Dark surface", value: "dark" },
  ],
}
