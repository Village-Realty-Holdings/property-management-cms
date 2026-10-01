import type { Block } from "payload"

import { backgroundField } from "../fields/background"
import { iconField } from "../fields/icon"

/** Amenities, as a photo-tile mosaic or as an icon list. */
export const Amenities: Block = {
  slug: "amenities",
  interfaceName: "AmenitiesBlock",
  labels: { singular: "Amenities", plural: "Amenities" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "intro", type: "textarea" },
    {
      name: "variant",
      label: "Layout",
      type: "select",
      required: true,
      defaultValue: "icons",
      options: [
        { label: "Photo-tile mosaic", value: "mosaic" },
        { label: "Icon list", value: "icons" },
      ],
    },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 3,
      maxRows: 12,
      labels: { singular: "Amenity", plural: "Amenities" },
      defaultValue: [
        { label: "Private pool", icon: "waves" },
        { label: "Fast Wi-Fi", icon: "wifi" },
        { label: "Free parking", icon: "square-parking" },
      ],
      fields: [
        { name: "label", type: "text", required: true },
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          admin: {
            description: "The tile's photo, for the mosaic.",
            condition: (_data, _sibling, { blockData }) =>
              blockData?.variant !== "icons",
          },
        },
        iconField({
          admin: {
            description: 'The icon, for the icon list, such as "wifi".',
            condition: (_data, _sibling, { blockData }) =>
              blockData?.variant === "icons",
          },
        }),
      ],
    },
    backgroundField,
  ],
}
