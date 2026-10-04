import type { Block } from "payload"

import { surfaceFields } from "../fields/background"
import { trustItemsField } from "../fields/trustItems"

/** The fewest logos a partner-logo strip shows. */
const minLogos = 2

/** A strip of trust signals: text or stat items, or partner logos. */
export const TrustStrip: Block = {
  slug: "trustStrip",
  interfaceName: "TrustStripBlock",
  labels: { singular: "Trust strip", plural: "Trust strips" },
  fields: [
    {
      name: "heading",
      type: "text",
      admin: { description: "Optional. A line to introduce the strip." },
    },
    {
      name: "variant",
      label: "Shows",
      type: "select",
      required: true,
      defaultValue: "items",
      options: [
        { label: "Text or stat items", value: "items" },
        { label: "Partner logos", value: "logos" },
      ],
    },
    trustItemsField({
      required: true,
      defaultValue: [
        { stat: "4.9", text: "Average guest rating" },
        { text: "Free cancellation" },
        { text: "Local support, 7 days a week" },
      ],
      admin: {
        condition: (_data, siblingData) => siblingData?.variant !== "logos",
      },
    }),
    {
      name: "logos",
      type: "array",
      minRows: minLogos,
      maxRows: 8,
      labels: { singular: "Logo", plural: "Logos" },
      admin: {
        condition: (_data, siblingData) => siblingData?.variant === "logos",
      },
      // Not `required`: the stored shape keeps `logos` optional for a strip of
      // items. A strip of logos needs its minimum.
      validate: (value, { siblingData }) =>
        (siblingData as { variant?: string } | undefined)?.variant ===
          "logos" &&
        (!Array.isArray(value) || value.length < minLogos)
          ? `Add at least ${minLogos} logos.`
          : true,
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          admin: { description: "The partner's name, read out for the logo." },
        },
        { name: "image", type: "upload", relationTo: "media", required: true },
      ],
    },
    ...surfaceFields,
  ],
}
