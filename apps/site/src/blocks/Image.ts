import type { Block } from "payload"

export const imageAspects = ["original", "16x9", "4x3", "1x1"] as const

/**
 * One Media image, at its own shape or cropped to one, with an optional
 * caption. Its alt text is the Media's.
 */
export const Image: Block = {
  slug: "image",
  interfaceName: "ImageBlock",
  labels: { singular: "Image", plural: "Images" },
  fields: [
    { name: "image", type: "upload", relationTo: "media" },
    {
      name: "caption",
      type: "text",
      admin: { description: "Optional. Shown under the image." },
    },
    {
      name: "aspect",
      label: "Shape",
      type: "select",
      required: true,
      defaultValue: "original",
      options: [
        { label: "Original", value: "original" },
        { label: "16:9", value: "16x9" },
        { label: "4:3", value: "4x3" },
        { label: "1:1", value: "1x1" },
      ],
    },
  ],
}
