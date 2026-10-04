import type { Block } from "payload"

import { surfaceFields } from "../../fields/background"
import { navLinkFields } from "../../fields/navLink"

/** The bottom line of the Footer: a copyright notice and legal links. */
export const LegalBar: Block = {
  slug: "legalBar",
  interfaceName: "LegalBarBlock",
  labels: { singular: "Legal bar", plural: "Legal bars" },
  fields: [
    {
      name: "text",
      label: "Copyright text",
      type: "text",
      required: true,
      defaultValue: "© {year} {name}",
      admin: {
        description:
          "{year} becomes the current year and {name} the Brand's name.",
      },
    },
    { name: "links", type: "array", maxRows: 8, fields: navLinkFields() },
    // Default is the Footer's own surface.
    ...surfaceFields,
  ],
}
