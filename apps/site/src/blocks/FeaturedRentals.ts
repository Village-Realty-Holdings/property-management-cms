import type { Block } from "payload"

import { surfaceFields } from "../fields/background"

/** The Site's first few Rentals, as cards in a carousel or a grid. */
export const FeaturedRentals: Block = {
  slug: "featuredRentals",
  interfaceName: "FeaturedRentalsBlock",
  labels: { singular: "Featured rentals", plural: "Featured rentals" },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "count",
      type: "number",
      required: true,
      min: 1,
      max: 12,
      defaultValue: 3,
      admin: { step: 1, description: "How many Rentals to show." },
    },
    {
      name: "variant",
      label: "Layout",
      type: "select",
      required: true,
      defaultValue: "grid",
      options: [
        { label: "Carousel", value: "carousel" },
        { label: "Grid", value: "grid" },
      ],
    },
    ...surfaceFields,
  ],
}
