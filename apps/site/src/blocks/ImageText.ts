import type { Block } from "payload"

import { surfaceFields } from "../fields/background"
import { iconField } from "../fields/icon"

/**
 * An image beside text, on the left or the right, with an optional icon list
 * and an optional caption on the image.
 */
export const ImageText: Block = {
  slug: "imageText",
  interfaceName: "ImageTextBlock",
  labels: { singular: "Image + text", plural: "Image + text" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "text", type: "textarea" },
    { name: "image", type: "upload", relationTo: "media" },
    {
      name: "caption",
      type: "text",
      admin: { description: "Optional. Shown with the image." },
    },
    {
      name: "imageSide",
      label: "Image side",
      type: "select",
      required: true,
      defaultValue: "left",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
    {
      name: "points",
      type: "array",
      maxRows: 8,
      labels: { singular: "Point", plural: "Points" },
      admin: { description: "Optional. A short list, each with an icon." },
      fields: [iconField(), { name: "text", type: "text", required: true }],
    },
    ...surfaceFields,
  ],
}
