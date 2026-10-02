import type { Block } from "payload"

import { surfaceFields } from "../fields/background"
import { linkGroup } from "../fields/link"

/** A short pitch with one button. */
export const CallToAction: Block = {
  slug: "callToAction",
  interfaceName: "CallToActionBlock",
  labels: { singular: "Call to action", plural: "Calls to action" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "body", type: "textarea" },
    linkGroup("button"),
    {
      name: "style",
      type: "select",
      required: true,
      defaultValue: "primary",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Inverted", value: "inverted" },
        { label: "Dark surface", value: "dark" },
      ],
    },
    ...surfaceFields,
  ],
}
