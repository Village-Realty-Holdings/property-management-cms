import type { Block } from "payload"

import { blockAdmin } from "./admin"
import { linkGroup } from "./link"

/** A short pitch with one button. */
export const CallToAction: Block = {
  slug: "callToAction",
  interfaceName: "CallToActionBlock",
  labels: { singular: "Call to Action", plural: "Calls to Action" },
  admin: blockAdmin({
    label: "Call to Action",
    image: "call-to-action.svg",
    description: "A short pitch with one button.",
  }),
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
      ],
    },
  ],
}
