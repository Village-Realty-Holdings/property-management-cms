import type { Block } from "payload"

import { backgroundField } from "../fields/background"

/**
 * A heading, some text and an email form. The form is visual only: it does
 * not send or store anything.
 */
export const Newsletter: Block = {
  slug: "newsletter",
  interfaceName: "NewsletterBlock",
  labels: { singular: "Newsletter", plural: "Newsletters" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "text", type: "textarea" },
    {
      name: "emailPlaceholder",
      label: "Email placeholder",
      type: "text",
      defaultValue: "Your email address",
    },
    {
      name: "buttonLabel",
      label: "Button label",
      type: "text",
      required: true,
      defaultValue: "Subscribe",
    },
    backgroundField,
  ],
}
