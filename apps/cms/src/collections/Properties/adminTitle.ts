import type { TextField } from "payload"

type PropertyNames = {
  headline?: string | null
  feedName?: string | null
}

const trimmed = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

/** The Property's name in the admin: its Headline, else its feed name. */
export function propertyLabel(doc: PropertyNames | null | undefined): string {
  return trimmed(doc?.headline) || trimmed(doc?.feedName)
}

/**
 * `adminTitle`: the Property's name in lists and relationship pickers
 * (`useAsTitle`). Set on every save, including the Sync's, from the Headline
 * or the feed name; documents saved before it existed fall back on read.
 * Not shown in the edit view.
 */
export const propertyAdminTitleField: TextField = {
  name: "adminTitle",
  label: "Property",
  type: "text",
  admin: {
    readOnly: true,
    condition: () => false,
    description: "The Headline, or the feed name. Set automatically.",
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) =>
        propertyLabel({ ...originalDoc, ...data }) || null,
    ],
    afterRead: [
      ({ value, siblingData }) => value || propertyLabel(siblingData),
    ],
  },
}
