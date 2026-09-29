import type { Block } from "payload"

import { blockAdmin } from "./admin"
import { blockRichTextEditor } from "./richTextEditor"

/** A free-form text section. */
export const RichText: Block = {
  slug: "richText",
  interfaceName: "RichTextBlock",
  labels: { singular: "Rich Text", plural: "Rich Text" },
  admin: blockAdmin({
    label: "Rich Text",
    image: "rich-text.svg",
    description: "Free-form text with headings, lists and links.",
    titleFrom: ["content"],
  }),
  fields: [
    {
      name: "content",
      type: "richText",
      required: true,
      editor: blockRichTextEditor,
    },
  ],
}
