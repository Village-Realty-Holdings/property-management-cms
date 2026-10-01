import type { Block } from "payload"

import { linkGroup } from "../../fields/link"

/** The Header's phone number, a button and a login link. */
export const HeaderActions: Block = {
  slug: "headerActions",
  interfaceName: "HeaderActionsBlock",
  labels: { singular: "Header actions", plural: "Header actions" },
  fields: [
    {
      name: "showPhone",
      label: "Show a phone number",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "phone",
      label: "Phone number",
      type: "text",
      admin: {
        condition: (_, sibling) => sibling?.showPhone !== false,
        description: "Leave empty to show the Brand's phone number.",
      },
    },
    linkGroup("button"),
    linkGroup("login", "Login link"),
  ],
}
