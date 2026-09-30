import type { Block } from "payload"

import { backgroundField } from "../fields/background"

/** The Site's Rentals that sleep at least a given number of guests. */
export const LargeGroupRentals: Block = {
  slug: "largeGroupRentals",
  interfaceName: "LargeGroupRentalsBlock",
  labels: { singular: "Large-group rentals", plural: "Large-group rentals" },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "minSleeps",
      label: "Minimum sleeps",
      type: "number",
      required: true,
      min: 2,
      defaultValue: 12,
      admin: {
        step: 1,
        description: "Shows the Rentals that sleep at least this many guests.",
      },
    },
    backgroundField,
  ],
}
