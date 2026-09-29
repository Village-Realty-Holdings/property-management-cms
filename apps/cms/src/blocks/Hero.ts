import type { Block } from "payload"

import { blockAdmin } from "./admin"
import { linkGroup } from "./link"
import { sameSite } from "./sameSite"

/** The large heading section at the top of a Page. */
export const Hero: Block = {
  slug: "hero",
  interfaceName: "HeroBlock",
  labels: { singular: "Hero", plural: "Heroes" },
  admin: blockAdmin({
    label: "Hero",
    image: "hero.svg",
    description:
      "The large heading at the top of a Page, with an image and a button.",
  }),
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "subheading", type: "textarea" },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      filterOptions: sameSite,
    },
    linkGroup("cta", "Call to action"),
  ],
}
