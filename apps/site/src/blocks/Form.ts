import type { Block } from "payload"

import { backgroundField } from "../fields/background"

/**
 * A visual-only form. On submit it shows its success message and stores
 * nothing.
 */
export const Form: Block = {
  slug: "form",
  interfaceName: "FormBlock",
  labels: { singular: "Form", plural: "Forms" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "intro", type: "textarea" },
    {
      name: "formFields",
      label: "Fields",
      type: "select",
      hasMany: true,
      required: true,
      defaultValue: ["name", "email", "message"],
      options: [
        { label: "Name", value: "name" },
        { label: "Email", value: "email" },
        { label: "Phone", value: "phone" },
        { label: "Message", value: "message" },
        { label: "Property address", value: "propertyAddress" },
        { label: "Dates", value: "dates" },
      ],
      admin: { description: "The fields the form shows, in this order." },
    },
    {
      name: "submitLabel",
      label: "Submit label",
      type: "text",
      required: true,
      defaultValue: "Send",
    },
    {
      name: "successMessage",
      label: "Success message",
      type: "textarea",
      required: true,
      defaultValue:
        "Thank you. We have received your message and will be in touch soon.",
    },
    backgroundField,
  ],
}
