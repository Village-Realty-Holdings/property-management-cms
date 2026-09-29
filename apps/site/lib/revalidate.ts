import { createHash, timingSafeEqual } from "node:crypto"

import {
  isCacheTag,
  uniqueTags,
  type CacheTag,
} from "@workspace/content/shared"

/**
 * Pure pieces of `POST /api/revalidate` (ADR-0009), the contract the CMS
 * calls: `Authorization: Bearer <REVALIDATION_SECRET>`, JSON `{ tags }`.
 */

const digest = (value: string) => createHash("sha256").update(value).digest()

/**
 * Whether the Authorization header carries `Bearer <secret>`. Compares
 * SHA-256 digests (equal-length buffers) in constant time, so neither the
 * secret nor its length leaks through timing.
 */
export function bearerMatches(header: string | null, secret: string): boolean {
  if (!secret || !header) return false
  const match = /^Bearer (.+)$/.exec(header.trim())
  if (!match?.[1]) return false
  return timingSafeEqual(digest(match[1]), digest(secret))
}

export type ParsedTags =
  | { ok: true; tags: CacheTag[] }
  | { ok: false; error: string }

/** `{ tags: string[] }` with at least one well-formed tag, de-duplicated. */
export function parseRevalidateBody(body: unknown): ParsedTags {
  const tags = (body as { tags?: unknown } | null)?.tags
  if (!Array.isArray(tags) || tags.length === 0) {
    return {
      ok: false,
      error: "Body must be { tags: string[] } with at least one tag",
    }
  }
  const invalid = tags.filter((tag) => !isCacheTag(tag))
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `Invalid tags: ${JSON.stringify(invalid).slice(0, 200)}`,
    }
  }
  return { ok: true, tags: uniqueTags(tags as CacheTag[]) }
}
