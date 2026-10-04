import type { Block } from "payload"

import { surfaceFields } from "../fields/background"

/**
 * Question and answer pairs in an accordion. The Site also emits them as
 * `FAQPage` JSON-LD, so the answers are plain text.
 */
export const Faq: Block = {
  slug: "faq",
  interfaceName: "FaqBlock",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "questions",
      type: "array",
      required: true,
      minRows: 2,
      maxRows: 20,
      labels: { singular: "Question", plural: "Questions" },
      defaultValue: [
        {
          question: "What time is check-in?",
          answer: "Check-in is from 4pm and check-out is by 10am.",
        },
        {
          question: "Can I bring a pet?",
          answer: "Some homes welcome pets. Look for the pet-friendly label.",
        },
      ],
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "textarea", required: true },
      ],
    },
    ...surfaceFields,
  ],
}
