import type { Block } from "payload"

import { backgroundField } from "../fields/background"
import { richTextEditor } from "../fields/richText"

/** How wide a Rich text Block sets its text. */
export const richTextWidths = ["reading", "wide"] as const

/**
 * Free-form text with headings, lists and links, at reading width or across
 * the page.
 */
export const RichText: Block = {
  slug: "richText",
  interfaceName: "RichTextBlock",
  labels: { singular: "Rich text", plural: "Rich text" },
  fields: [
    {
      name: "content",
      type: "richText",
      required: true,
      editor: richTextEditor,
    },
    {
      name: "width",
      label: "Width",
      type: "select",
      defaultValue: "reading",
      options: [
        { label: "Reading width", value: "reading" },
        { label: "Wide (the page's width)", value: "wide" },
      ],
    },
    backgroundField,
  ],
}
