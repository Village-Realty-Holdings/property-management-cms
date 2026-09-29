import type { Block } from "payload"

import { blockAdmin } from "./admin"
import { linkGroup } from "./link"
import { blockRichTextEditor } from "./richTextEditor"

/**
 * What a change means for one audience, owners or guests: a title, an
 * intro, points, an optional closing paragraph and a button. Used twice by
 * the Tuck-In Page Template. `audience` also tags the Site's links to the
 * Client's website (utm_content `owner_…` or `guest_…`).
 */
export const Audience: Block = {
  slug: "audience",
  interfaceName: "AudienceBlock",
  labels: { singular: "Audience", plural: "Audiences" },
  admin: blockAdmin({
    label: "Audience",
    image: "audience.svg",
    description: "What the news means for owners or guests, point by point.",
    titleFrom: ["title"],
  }),
  fields: [
    {
      type: "row",
      fields: [
        { name: "title", type: "text", required: true },
        {
          name: "audience",
          type: "select",
          required: true,
          defaultValue: "guests",
          options: [
            { label: "Owners", value: "owners" },
            { label: "Guests", value: "guests" },
          ],
          admin: { width: "30%" },
        },
      ],
    },
    { name: "intro", type: "richText", editor: blockRichTextEditor },
    {
      name: "points",
      type: "array",
      labels: { singular: "Point", plural: "Points" },
      admin: {
        components: {
          RowLabel: {
            path: "/blocks/RowLabel#ArrayRowLabel",
            clientProps: { fields: ["title"], fallback: "Point" },
          },
        },
      },
      fields: [
        { name: "title", type: "text", required: true },
        { name: "text", type: "richText", editor: blockRichTextEditor },
      ],
    },
    {
      name: "closing",
      label: "Closing paragraph",
      type: "textarea",
    },
    linkGroup("cta", "Button"),
  ],
}
