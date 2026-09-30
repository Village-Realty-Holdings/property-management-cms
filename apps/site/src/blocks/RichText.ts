import type { Block } from "payload"

import { backgroundField } from "../fields/background"
import { richTextEditor } from "../fields/richText"

/** Free-form text with headings, lists and links. */
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
    backgroundField,
  ],
}
