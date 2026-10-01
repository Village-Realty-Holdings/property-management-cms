import type { Block } from "payload"

import { blockAdmin } from "./admin"

/** The headline of a Tuck-In: "{site} Joins {client}!". */
export const Announcement: Block = {
  slug: "announcement",
  interfaceName: "AnnouncementBlock",
  labels: { singular: "Announcement", plural: "Announcements" },
  admin: blockAdmin({
    label: "Announcement",
    image: "announcement.svg",
    description: "A headline announcing the news, with an optional subheading.",
    titleFrom: ["headline"],
  }),
  fields: [
    {
      name: "headline",
      type: "text",
      required: true,
      admin: { placeholder: "{site} Joins {client}!" },
    },
    { name: "subheading", type: "textarea" },
  ],
}
