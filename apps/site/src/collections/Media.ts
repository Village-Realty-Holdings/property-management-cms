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

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

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
    // Photos, plus SVG for a Brand's wordmark. Payload inspects every SVG
    // and refuses one that carries a script. No GIF.
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/svg+xml",
    ],
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
    {
      // Where a photo came from and on what terms, for stock photos such as
      // Unsplash's. Optional: a Site's own photos have none.
      name: "attribution",
      type: "group",
      admin: {
        description: "For stock photos: who took it, where it came from.",
      },
      fields: [
        { name: "author", label: "Author", type: "text" },
        {
          name: "sourceUrl",
          label: "Source URL",
          type: "text",
          admin: { placeholder: "https://unsplash.com/photos/…" },
          validate: (value: unknown) =>
            value == null || value === "" || isHttpUrl(value)
              ? true
              : "Enter a full web address that starts with https://",
        },
        {
          name: "licence",
          label: "Licence",
          type: "text",
          admin: { placeholder: "Unsplash License" },
        },
      ],
    },
  ],
}
