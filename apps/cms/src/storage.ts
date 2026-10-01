import { s3Storage } from "@payloadcms/storage-s3"
import type { Plugin } from "payload"

/**
 * Object storage for Media (ADR-0008). The storage adapter is chosen here
 * and nowhere else (ADR-0015).
 *
 * - S3-compatible env set (Cloudflare R2's S3 API on Containers, or MinIO):
 *   `@payloadcms/storage-s3`. Files are stored under `<siteSlug>/<filename>`
 *   (Media sets each document's `prefix` to its Site's slug) and served
 *   straight from `S3_PUBLIC_URL`.
 * - Nothing set: no plugin, Payload keeps files on local disk in
 *   apps/cms/media (dev and tests).
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
        // No collection prefix: the document's `prefix` (its Site's slug)
        // is the whole key prefix.
        media: {
          generateFileURL: ({ filename, prefix }) =>
            mediaFileURL(env.S3_PUBLIC_URL!, prefix, filename),
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

/*
 * r2BindingStorage() — the alternative for running apps/cms on Workers
 * (ADR-0015). Not wired up yet.
 *
 * On Workers, `@payloadcms/storage-r2` talks to the bucket through the R2
 * binding (`env.BUCKET` from the Cloudflare context) instead of the S3 API
 * and its credentials. It would replace the `s3Storage` plugin above, for the
 * same bucket and the same `<siteSlug>/<filename>` keys, so switching between
 * Workers and Containers needs no data migration:
 *
 *   r2Storage({
 *     bucket: cloudflare.env.BUCKET,
 *     collections: { media: { generateFileURL } },
 *   })
 *
 * Wire it here (and only here) when the Workers deployment gets its binding.
 */
