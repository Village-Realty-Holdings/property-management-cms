import type { Block } from "payload"

import { surfaceFields } from "../fields/background"

/**
 * An address and some text beside a map: a static map image, or a map card
 * drawn by the Site. Neither loads anything from another site.
 */
export const Location: Block = {
  slug: "location",
  interfaceName: "LocationBlock",
  labels: { singular: "Location", plural: "Locations" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "address", type: "textarea", required: true },
    { name: "text", type: "textarea" },
    {
      name: "map",
      type: "select",
      required: true,
      defaultValue: "card",
      options: [
        { label: "Map card", value: "card" },
        { label: "Static map image", value: "image" },
      ],
    },
    {
      name: "mapImage",
      label: "Map image",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "A picture of the map. Its alt text is read out for it.",
        condition: (_data, siblingData) => siblingData?.map === "image",
      },
      // Not `required`: a map card has no image.
      validate: (value: unknown, { siblingData }: { siblingData?: unknown }) =>
        (siblingData as { map?: string } | undefined)?.map === "image" &&
        (value === undefined || value === null || value === "")
          ? "Choose the map image."
          : true,
    },
    ...surfaceFields,
  ],
}
