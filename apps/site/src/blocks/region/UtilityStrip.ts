import type { Block } from "payload"

import { navLinkFields } from "../../fields/navLink"

/** A thin strip above the Header: one short line, and a few links. */
export const UtilityStrip: Block = {
  slug: "utilityStrip",
  interfaceName: "UtilityStripBlock",
  labels: { singular: "Utility strip", plural: "Utility strips" },
  fields: [
    {
      name: "text",
      type: "text",
      required: true,
      maxLength: 120,
      admin: { description: "A short line, such as an offer or a notice." },
    },
    { name: "links", type: "array", maxRows: 4, fields: navLinkFields() },
  ],
}
