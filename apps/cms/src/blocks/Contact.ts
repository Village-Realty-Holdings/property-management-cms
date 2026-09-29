import type { Block } from "payload"

import { blockAdmin } from "./admin"

/** How to reach the Site: a title, a line of copy, and the phone and email. */
export const Contact: Block = {
  slug: "contact",
  interfaceName: "ContactBlock",
  labels: { singular: "Contact", plural: "Contacts" },
  admin: blockAdmin({
    label: "Contact",
    image: "contact.svg",
    description: "How to reach the Site by phone and email.",
    titleFrom: ["title"],
  }),
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "text",
      type: "textarea",
      admin: {
        description: "Shown before the phone and email.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "phone",
          type: "text",
          defaultValue: "{phone}",
          admin: { description: "Usually {phone}, from Site Settings." },
        },
        {
          name: "email",
          type: "text",
          defaultValue: "{email}",
          admin: { description: "Usually {email}, from Site Settings." },
        },
      ],
    },
  ],
}
