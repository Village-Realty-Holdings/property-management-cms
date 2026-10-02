import type { Block } from "payload"

import { surfaceFields } from "../../fields/background"
import { navLinkFields } from "../../fields/navLink"

/**
 * A thin strip above the Header: the Brand's phone number, one short line,
 * and a few links. Any of the three can be left out.
 */
export const UtilityStrip: Block = {
  slug: "utilityStrip",
  interfaceName: "UtilityStripBlock",
  labels: { singular: "Utility strip", plural: "Utility strips" },
  fields: [
    {
      name: "showPhone",
      label: "Show the phone number",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "The Brand's phone number, with a phone icon, at the start of the strip. Guests can tap it to call.",
      },
    },
    {
      name: "text",
      type: "text",
      maxLength: 120,
      admin: { description: "A short line, such as an offer or a notice." },
    },
    { name: "links", type: "array", maxRows: 4, fields: navLinkFields() },
    // Default is the strip's own look: the Theme's primary colour.
    ...surfaceFields,
  ],
}
