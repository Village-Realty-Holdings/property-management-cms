import type { Block } from "payload"

import { backgroundField } from "../fields/background"

/** Three or four numbered steps, each with a title and text. */
export const Steps: Block = {
  slug: "steps",
  interfaceName: "StepsBlock",
  labels: { singular: "Steps", plural: "Steps" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "intro", type: "textarea" },
    {
      name: "steps",
      type: "array",
      required: true,
      minRows: 3,
      maxRows: 4,
      labels: { singular: "Step", plural: "Steps" },
      defaultValue: [
        { title: "Tell us about your home", text: "Share a few details." },
        { title: "We set everything up", text: "Photos, listing and pricing." },
        { title: "Start earning", text: "We look after every stay." },
      ],
      fields: [
        { name: "title", type: "text", required: true },
        { name: "text", type: "textarea", required: true },
      ],
    },
    backgroundField,
  ],
}
