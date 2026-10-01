import type { Block } from "payload"

import { blockAdmin } from "./admin"

/**
 * A form guests fill in on the Site (ADR-0014). The Site renders the fields
 * for `kind` and stores each entry as a Submission of that kind, which the
 * CMS then forwards to the Site's Forwarding Destinations. No relationships,
 * so no same-Site rules.
 */
export const Form: Block = {
  slug: "form",
  interfaceName: "FormBlock",
  labels: { singular: "Form", plural: "Forms" },
  admin: blockAdmin({
    label: "Form",
    image: "form.svg",
    description:
      "A form guests send from the Site: booking inquiry, owner lead or general contact.",
  }),
  fields: [
    { name: "heading", type: "text" },
    { name: "intro", type: "textarea" },
    {
      name: "kind",
      type: "select",
      required: true,
      defaultValue: "contact",
      options: [
        { label: "Booking inquiry", value: "inquiry" },
        { label: "Owner lead", value: "ownerLead" },
        { label: "General contact", value: "contact" },
      ],
      admin: {
        description:
          "Booking inquiries ask for dates and guests, and name the Property when the page is opened with ?property=<slug>. Owner leads ask about the owner's home.",
      },
    },
    {
      name: "submitLabel",
      label: "Button label",
      type: "text",
      maxLength: 40,
      admin: { placeholder: "Send message" },
    },
    {
      name: "successMessage",
      type: "textarea",
      maxLength: 500,
      admin: {
        description:
          "Shown once the form is sent. Leave empty for the default.",
      },
    },
  ],
}
