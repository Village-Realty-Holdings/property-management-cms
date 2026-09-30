import path from "node:path"

import { APIError, type CollectionConfig } from "payload"

import { anyone, signedIn } from "../access"
import { siteSchema } from "../database"
import { FONT_FILES_SLUG } from "../storage"

/**
 * Where local font files go: `media/<schema>/fonts/`, next to the Site's
 * Media (apps/site ADR-0005). With no schema, `media/fonts/`. Unused when
 * object storage is configured (src/storage.ts puts them under
 * `<schema>/fonts`).
 */
export function fontFilesStaticDir(schema: string | undefined) {
  return schema
    ? path.resolve("media", schema, "fonts")
    : path.resolve("media", "fonts")
}

/** The formats a browser loads, by file extension and the type each has. */
const FORMATS = {
  woff2: ["font/woff2"],
  woff: ["font/woff"],
  ttf: ["font/ttf", "font/sfnt", "application/x-font-ttf"],
  otf: ["font/otf", "application/x-font-opentype"],
} as const

const MIME_TYPES = Object.values(FORMATS).flat()

/**
 * Checks a font file's name and type. Payload has already limited the type to
 * MIME_TYPES (sniffed from the bytes when it can be). This also requires the
 * extension to be a font one, and to agree with the type, so a file named
 * `a.woff2` can't be a TrueType one, and the URL's extension always names the
 * format.
 */
export function fontFileProblem(
  filename: string | undefined,
  mimeType: string | undefined
): string | null {
  const extension = filename?.split(".").pop()?.toLowerCase() ?? ""
  if (!Object.hasOwn(FORMATS, extension)) {
    return "Font files must be .woff2, .woff, .ttf or .otf."
  }
  const allowed: readonly string[] = FORMATS[extension as keyof typeof FORMATS]
  if (mimeType && !allowed.includes(mimeType)) {
    return `This file's contents aren't a .${extension} font.`
  }
  return null
}

const staticDir = fontFilesStaticDir(siteSchema())

/**
 * The files behind a Font (Fonts collection): woff2, and woff, ttf and otf.
 * A collection of its own, apart from Media, with its own folder. It is
 * managed through Fonts; the Admin doesn't list it. Files are read by anyone,
 * because visitors' browsers load them, and are served by the Site itself
 * (src/storage.ts).
 */
export const FontFiles: CollectionConfig = {
  slug: FONT_FILES_SLUG,
  labels: { singular: "Font file", plural: "Font files" },
  admin: {
    useAsTitle: "filename",
    defaultColumns: ["filename", "mimeType", "updatedAt"],
    group: "Assets",
  },
  access: {
    create: signedIn,
    read: anyone,
    update: signedIn,
    delete: signedIn,
  },
  upload: {
    mimeTypes: MIME_TYPES,
    staticDir,
    crop: false,
    focalPoint: false,
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        // On create the upload is on the request; `data` has the name and
        // the type Payload found from the bytes.
        const filename = data?.filename ?? req.file?.name
        const mimeType = data?.mimeType ?? req.file?.mimetype
        if (!filename && !req.file) return data
        const problem = fontFileProblem(filename, mimeType)
        if (problem) throw new APIError(problem, 400, undefined, true)
        return data
      },
    ],
  },
  fields: [
    {
      // Declared for the same reason as on Media: the S3 storage plugin adds
      // them, and one migration must fit local disk and S3 alike.
      name: "prefix",
      type: "text",
      admin: { hidden: true, readOnly: true },
    },
    {
      name: "_objectKey",
      type: "text",
      admin: { hidden: true, readOnly: true },
    },
  ],
}
