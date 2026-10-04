import type { Block } from "payload"

import { surfaceFields } from "../fields/background"

/**
 * Every Rental of the Site in a grid, with filter chips (bedrooms, pets,
 * location), a sort and simple pagination.
 */
export const RentalGrid: Block = {
  slug: "rentalGrid",
  interfaceName: "RentalGridBlock",
  labels: { singular: "Rental grid", plural: "Rental grids" },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "pageSize",
      label: "Page size",
      type: "number",
      required: true,
      min: 3,
      max: 24,
      defaultValue: 6,
      admin: { step: 1, description: "How many Rentals each page shows." },
    },
    ...surfaceFields,
  ],
}
