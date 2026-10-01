import type { Block } from "payload"

import { linkGroup } from "../fields/link"
import { trustItemsField } from "../fields/trustItems"

/**
 * The large heading at the top of a Page, with an image and a button. It can
 * carry an eyebrow line above the heading, an accent word in the heading, and
 * a trust strip fused to its foot.
 */
export const Hero: Block = {
  slug: "hero",
  interfaceName: "HeroBlock",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      admin: { description: "A short line above the heading." },
    },
    { name: "heading", type: "text", required: true },
    {
      name: "accentWord",
      label: "Accent word",
      type: "text",
      admin: {
        description:
          "A word or phrase from the heading, shown in the accent style.",
      },
    },
    { name: "subheading", type: "textarea" },
    { name: "image", type: "upload", relationTo: "media" },
    linkGroup("cta", "Call to action"),
    trustItemsField({
      name: "trustStrip",
      label: "Trust strip",
      labels: { singular: "Trust item", plural: "Trust items" },
      admin: { description: "Optional. Fused to the foot of the Hero." },
    }),
  ],
}
