import type { Block } from "payload"

import { backgroundField } from "../fields/background"
import { iconField } from "../fields/icon"

/** A grid of features, each with an icon, a title and text. */
export const Features: Block = {
  slug: "features",
  interfaceName: "FeaturesBlock",
  labels: { singular: "Features", plural: "Features" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "intro", type: "textarea" },
    {
      name: "features",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 12,
      labels: { singular: "Feature", plural: "Features" },
      defaultValue: [
        {
          icon: "sparkles",
          title: "Spotless homes",
          text: "Cleaned and checked before every stay.",
        },
        {
          icon: "map-pin",
          title: "Great locations",
          text: "A short walk from the sea.",
        },
        {
          icon: "headphones",
          title: "Real support",
          text: "A person on hand when you need one.",
        },
      ],
      fields: [
        iconField({ required: true }),
        { name: "title", type: "text", required: true },
        { name: "text", type: "textarea", required: true },
      ],
    },
    backgroundField,
  ],
}
