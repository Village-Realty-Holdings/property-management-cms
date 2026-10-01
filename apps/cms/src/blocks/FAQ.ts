import type { Block } from "payload"

import { blockAdmin } from "./admin"
import { blockRichTextEditor } from "./richTextEditor"

/** Questions and answers. */
export const FAQ: Block = {
  slug: "faq",
  interfaceName: "FAQBlock",
  labels: { singular: "FAQ", plural: "FAQs" },
  admin: blockAdmin({
    label: "FAQ",
    image: "faq.svg",
    description: "Questions and answers guests can expand.",
  }),
  fields: [
    { name: "heading", type: "text" },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Question", plural: "Questions" },
      admin: {
        components: {
          RowLabel: {
            path: "/blocks/RowLabel#ArrayRowLabel",
            clientProps: { fields: ["question"], fallback: "Question" },
          },
        },
      },
      fields: [
        { name: "question", type: "text", required: true },
        {
          name: "answer",
          type: "richText",
          required: true,
          editor: blockRichTextEditor,
        },
      ],
    },
  ],
}
