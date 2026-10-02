import type { Block } from "payload"

import { linkGroup } from "../fields/link"

export const buttonStyles = ["primary", "accent", "outline"] as const
export const buttonAligns = ["start", "centre", "end"] as const

/**
 * One button: a label and a link, in one of three styles, at the start, the
 * centre or the end of its line. Small enough to sit under a Rich text in a
 * Container; on the Page itself it is a band with the one button.
 */
export const Button: Block = {
  slug: "button",
  interfaceName: "ButtonBlock",
  labels: { singular: "Button", plural: "Buttons" },
  fields: [
    linkGroup("link"),
    {
      name: "style",
      type: "select",
      required: true,
      defaultValue: "primary",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Accent", value: "accent" },
        { label: "Outline", value: "outline" },
      ],
    },
    {
      name: "align",
      label: "Alignment",
      type: "select",
      required: true,
      defaultValue: "start",
      options: [
        { label: "Start", value: "start" },
        { label: "Centre", value: "centre" },
        { label: "End", value: "end" },
      ],
    },
  ],
}
