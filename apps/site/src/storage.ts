import { s3Storage } from "@payloadcms/storage-s3"
import type { Plugin } from "payload"

import { siteSchema } from "./database"

/**
 * Object storage for uploads. The storage adapter is chosen here and nowhere
 * else (apps/cms ADR-0008 and ADR-0015, carried over by apps/site ADR-0001).
 *
 * - S3-compatible env set (Cloudflare R2's S3 API, or MinIO):
 *   `@payloadcms/storage-s3`. Files are stored under their filename and
 *   served straight from `S3_PUBLIC_URL`. With `DATABASE_SCHEMA` set they go
 *   under a `<schema>/` prefix, so every Site can share one bucket
 *   (apps/site ADR-0005).
 * - Nothing set: no plugin, Payload keeps files on local disk in
 *   apps/site/media/<schema> (dev and tests).
 * - Partly set: throws, so a misconfigured deployment doesn't silently fall
 *   back to local disk.
 *
 * Font files (the `font-files` collection) go under `<schema>/fonts`, and
 * are not served from `S3_PUBLIC_URL`: their URL stays Payload's own file
 * route on the Site's origin, so a Site never asks another host for its fonts
 * (apps/site ADR-0004 and the Fonts spec).
 *
 * To put another upload collection in the bucket, add its slug to
 * UPLOAD_COLLECTIONS. That collection must also declare the `prefix` and
 * `_objectKey` text fields the plugin adds (see Media), so its table is the
 * same with and without S3.
 */

/** Slugs of the upload collections whose files go to object storage. */
export const FONT_FILES_SLUG = "font-files"

export const UPLOAD_COLLECTIONS: readonly string[] = ["media", FONT_FILES_SLUG]

type Env = Record<string, string | undefined>

const S3_VARS = [
  "S3_BUCKET",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_URL",
] as const

export function storagePlugins(
  env: Env = process.env,
  uploadCollections: readonly string[] = UPLOAD_COLLECTIONS
): Plugin[] {
  const missing = S3_VARS.filter((name) => !env[name])
  if (missing.length === S3_VARS.length) return []
  if (missing.length > 0) {
    throw new Error(
      `Object storage is partly configured; missing ${missing.join(", ")}`
    )
  }
  const prefix = siteSchema(env)
  const mediaOptions = {
    // One folder per Site in the shared bucket: <bucket>/<schema>/<file>.
    ...(prefix ? { prefix } : {}),
    generateFileURL: ({
      filename,
      prefix,
    }: {
      filename: string
      prefix?: string
    }) => mediaFileURL(env.S3_PUBLIC_URL!, prefix, filename),
  }
  // Font files: <bucket>/<schema>/fonts/<file>, no generateFileURL.
  const fontOptions = {
    prefix: [prefix, "fonts"].filter(Boolean).join("/"),
  }
  return [
    s3Storage({
      bucket: env.S3_BUCKET!,
      config: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION || "auto",
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID!,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
        },
        // R2 and MinIO both accept path-style requests.
        forcePathStyle: true,
      },
      disableLocalStorage: true,
      collections: Object.fromEntries(
        uploadCollections.map((slug) => [
          slug,
          slug === FONT_FILES_SLUG ? fontOptions : mediaOptions,
        ])
      ),
    }),
  ]
}

/** `<publicUrl>/<prefix>/<filename>`, with the filename URL-encoded. */
export function mediaFileURL(
  publicUrl: string,
  prefix: string | undefined,
  filename: string
): string {
  const base = publicUrl.replace(/\/+$/, "")
  const key = [prefix, encodeURIComponent(filename)].filter(Boolean).join("/")
  return `${base}/${key}`
}
