import type { Block } from "payload"

import { surfaceFields } from "../../fields/background"
import { navLinkFields } from "../../fields/navLink"

/**
 * The Footer's columns. Each has a heading and holds one kind of content:
 * links, the address, opening hours or social links.
 */
export const FooterColumns: Block = {
  slug: "footerColumns",
  interfaceName: "FooterColumnsBlock",
  labels: { singular: "Footer columns", plural: "Footer columns" },
  fields: [
    {
      name: "columns",
      type: "array",
      maxRows: 6,
      fields: [
        { name: "heading", type: "text", required: true },
        {
          name: "content",
          label: "Holds",
          type: "select",
          required: true,
          defaultValue: "links",
          options: [
            { label: "Links", value: "links" },
            { label: "The address", value: "address" },
            { label: "Opening hours", value: "hours" },
            { label: "Social links", value: "social" },
          ],
          admin: {
            description:
              "The address and social links come from the Brand unless you override the address here.",
          },
        },
        {
          name: "links",
          type: "array",
          maxRows: 12,
          fields: navLinkFields(),
          admin: { condition: (_, sibling) => sibling?.content === "links" },
        },
        {
          name: "address",
          type: "textarea",
          admin: {
            condition: (_, sibling) => sibling?.content === "address",
            description: "Leave empty to show the Brand's address.",
          },
        },
        {
          name: "hours",
          label: "Opening hours",
          type: "textarea",
          admin: {
            condition: (_, sibling) => sibling?.content === "hours",
            description:
              "One line per day or range, such as Mon–Fri 9:00–17:00.",
          },
        },
      ],
    },
    // Default is the Footer's own surface.
    ...surfaceFields,
  ],
}
