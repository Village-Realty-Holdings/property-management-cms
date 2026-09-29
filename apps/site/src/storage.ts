import { s3Storage } from "@payloadcms/storage-s3"
import type { Plugin } from "payload"

/**
 * Object storage for Media. The storage adapter is chosen here and nowhere
 * else (apps/cms ADR-0008 and ADR-0015, carried over by apps/site ADR-0001).
 *
 * - S3-compatible env set (Cloudflare R2's S3 API, or MinIO):
 *   `@payloadcms/storage-s3`. Files are stored under their filename and
 *   served straight from `S3_PUBLIC_URL`.
 * - Nothing set: no plugin, Payload keeps files on local disk in
 *   apps/site/media (dev and tests).
 * - Partly set: throws, so a misconfigured deployment doesn't silently fall
 *   back to local disk.
 */

type Env = Record<string, string | undefined>

const S3_VARS = [
  "S3_BUCKET",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_URL",
] as const

export function storagePlugins(env: Env = process.env): Plugin[] {
  const missing = S3_VARS.filter((name) => !env[name])
  if (missing.length === S3_VARS.length) return []
  if (missing.length > 0) {
    throw new Error(
      `Object storage is partly configured; missing ${missing.join(", ")}`
    )
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
      collections: {
        media: {
          generateFileURL: ({
            filename,
            prefix,
          }: {
            filename: string
            prefix?: string
          }) => mediaFileURL(env.S3_PUBLIC_URL!, prefix, filename),
        },
      },
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
