import type { CollectionConfig } from "payload"

import { anyone, signedIn } from "../access"

/**
 * Images uploaded by Staff Users for Pages, the Brand and SEO. No image
 * sizes, crop or focal point: sharp isn't available on Workers (apps/cms
 * ADR-0008 and ADR-0015). Files go to R2 or local disk (src/storage.ts).
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    useAsTitle: "filename",
    defaultColumns: ["filename", "alt", "updatedAt"],
    listSearchableFields: ["alt", "filename"],
  },
  access: {
    create: signedIn,
    read: anyone,
    update: signedIn,
    delete: signedIn,
  },
  upload: {
    // Photos only: no SVG (it can carry scripts) and no GIF.
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    crop: false,
    focalPoint: false,
  },
  fields: [
    {
      name: "alt",
      label: "Alt text",
      type: "text",
      required: true,
      admin: {
        description:
          "Describe what the image shows for people who can't see it, in a short sentence. Don't start with \"Image of\".",
      },
    },
    { name: "caption", type: "text" },
    {
      name: "credit",
      type: "text",
      admin: { description: "Photographer or source, e.g. © Jane Doe" },
    },
  ],
}
