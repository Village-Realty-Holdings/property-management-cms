import type { Block } from "payload"

import { blockAdmin } from "./admin"
import { sameSite } from "./sameSite"

/** Cards linking to Curated Lists, in the order chosen. */
export const CuratedListCards: Block = {
  slug: "curatedListCards",
  interfaceName: "CuratedListCardsBlock",
  labels: { singular: "Curated List Cards", plural: "Curated List Cards" },
  admin: blockAdmin({
    label: "Curated List Cards",
    image: "curated-list-cards.svg",
    description: "Cards linking to Curated Lists, in the order you choose.",
  }),
  fields: [
    { name: "heading", type: "text" },
    {
      name: "lists",
      label: "Curated Lists",
      type: "relationship",
      relationTo: "curated-lists",
      hasMany: true,
      required: true,
      minRows: 1,
      filterOptions: sameSite,
    },
  ],
}
