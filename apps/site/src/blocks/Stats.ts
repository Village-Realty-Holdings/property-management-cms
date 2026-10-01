import type { Block } from "payload"

import { backgroundField } from "../fields/background"

/** Three or four figures, each with a label. */
export const Stats: Block = {
  slug: "stats",
  interfaceName: "StatsBlock",
  labels: { singular: "Stats", plural: "Stats" },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "stats",
      type: "array",
      required: true,
      minRows: 3,
      maxRows: 4,
      labels: { singular: "Stat", plural: "Stats" },
      defaultValue: [
        { value: "120+", label: "Homes" },
        { value: "4.9", label: "Average guest rating" },
        { value: "15", label: "Years on the coast" },
      ],
      fields: [
        {
          name: "value",
          type: "text",
          required: true,
          admin: { description: 'The figure, such as "4.9" or "120+".' },
        },
        { name: "label", type: "text", required: true },
      ],
    },
    backgroundField,
  ],
}
