import path from "node:path"

import type { CollectionConfig } from "payload"

import { anyone, signedIn } from "../access"
import { siteSchema } from "../database"

/**
 * Where local uploads go: one folder per Site, `media/<schema>/` (apps/site
 * ADR-0005). With no schema, Payload's default folder. Unused when object
 * storage is configured (src/storage.ts).
 */
export function mediaStaticDir(schema: string | undefined) {
  return schema ? path.resolve("media", schema) : undefined
}

const staticDir = mediaStaticDir(siteSchema())

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
    ...(staticDir ? { staticDir } : {}),
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
      // The S3 storage plugin adds `prefix` (only when a prefix is set) and
      // `_objectKey` (always) to upload collections (src/storage.ts). They
      // are declared here so the table has both columns in every
      // environment, and one migration fits local disk and S3 alike.
      name: "prefix",
      type: "text",
      admin: { hidden: true, readOnly: true },
    },
    {
      name: "_objectKey",
      type: "text",
      admin: { hidden: true, readOnly: true },
    },
    {
      name: "credit",
      type: "text",
      admin: { description: "Photographer or source, e.g. © Jane Doe" },
    },
  ],
}
