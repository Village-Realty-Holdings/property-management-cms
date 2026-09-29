import type { Block } from "payload"

import { linkGroup } from "../fields/link"

/** The large heading at the top of a Page, with an image and a button. */
export const Hero: Block = {
  slug: "hero",
  interfaceName: "HeroBlock",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "subheading", type: "textarea" },
    { name: "image", type: "upload", relationTo: "media" },
    linkGroup("cta", "Call to action"),
  ],
}
