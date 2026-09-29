import type { Payload } from "payload"

import type { Site } from "@workspace/cms-types"
import { uniqueTags, type CacheTag } from "@workspace/content/shared"

/** A Site by ID, or the Site document itself. */
export type SiteRef = Site["id"] | string | Site

export type NotifyOptions = {
  /** Abort the request after this long. @default 3000 */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 3_000

type Target = {
  id: Site["id"] | string
  deploymentUrl: string
  revalidationSecret: string
}

/**
 * Tells one Site's deployment to revalidate `tags` (ADR-0009): POSTs
 * `{ tags }` to `${deploymentUrl}/api/revalidate` with
 * `Authorization: Bearer <revalidationSecret>`.
 *
 * Never throws. A Site without a deployment URL or secret is skipped; network
 * errors, timeouts and non-2xx responses are logged. A missed notification
 * means stale content until the next change or the cache's time ceiling.
 */
export async function notify(
  payload: Payload,
  site: SiteRef,
  tags: CacheTag[],
  { timeoutMs = DEFAULT_TIMEOUT_MS }: NotifyOptions = {}
): Promise<void> {
  const unique = uniqueTags(tags)
  const id = siteId(site)
  if (unique.length === 0) return
  try {
    const target = await resolveTarget(payload, site)
    if (!target) {
      payload.logger.debug(
        `Revalidation skipped for Site ${id}: no deployment URL or secret`
      )
      return
    }
    await post(payload, target, unique, timeoutMs)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      payload.logger.error(
        `Revalidation of Site ${id} timed out after ${timeoutMs}ms`
      )
      return
    }
    payload.logger.error({ err: error }, `Revalidation failed for Site ${id}`)
  }
}

/** Notifies every Site, e.g. after a change to an Awayday-wide vocabulary. */
export async function notifyAllSites(
  payload: Payload,
  tags: CacheTag[],
  options?: NotifyOptions
): Promise<void> {
  if (tags.length === 0) return
  try {
    const { docs } = await payload.find({
      collection: "sites",
      depth: 0,
      overrideAccess: true,
      pagination: false,
      select: { deploymentUrl: true, revalidationSecret: true },
    })
    await Promise.all(
      docs.map((site) => notify(payload, site as Site, tags, options))
    )
  } catch (error) {
    payload.logger.error({ err: error }, "Revalidation of all Sites failed")
  }
}

export type RevalidationBatch = {
  /** Queues `tags` for `site`. Nothing is sent until `flush`. */
  add(site: SiteRef, tags: CacheTag[]): void
  /** Sends one notification per Site with its de-duplicated tags, then empties the batch. Never throws. */
  flush(): Promise<void>
}

/**
 * Collects tags per Site so a Sync run sends one notification per Site when
 * it finishes, instead of one per document (which it suppresses with
 * `context.skipRevalidation`).
 */
export function createBatch(
  payload: Payload,
  options?: NotifyOptions
): RevalidationBatch {
  const pending = new Map<string, { site: SiteRef; tags: Set<CacheTag> }>()
  return {
    add(site, tags) {
      const key = String(siteId(site))
      const entry = pending.get(key)
      if (!entry) {
        pending.set(key, { site, tags: new Set(tags) })
        return
      }
      // Keep the Site document when one was given: it may save a lookup.
      if (typeof site === "object") entry.site = site
      for (const tag of tags) entry.tags.add(tag)
    },
    async flush() {
      const entries = [...pending.values()]
      pending.clear()
      await Promise.all(
        entries.map(({ site, tags }) =>
          notify(payload, site, [...tags], options)
        )
      )
    },
  }
}

export function siteId(site: SiteRef): Site["id"] | string {
  return typeof site === "object" ? site.id : site
}

/**
 * The Site's deployment URL and secret. Uses the given Site document when it
 * has both; otherwise loads the Site, bypassing access control (the secret
 * is hidden from most readers).
 */
async function resolveTarget(
  payload: Payload,
  site: SiteRef
): Promise<Target | null> {
  const doc =
    typeof site === "object" && site.deploymentUrl && site.revalidationSecret
      ? site
      : await payload.findByID({
          collection: "sites",
          id: siteId(site),
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
          select: { deploymentUrl: true, revalidationSecret: true },
        })
  const deploymentUrl = doc?.deploymentUrl?.trim()
  const revalidationSecret = doc?.revalidationSecret
  if (!doc || !deploymentUrl || !revalidationSecret) return null
  return { id: doc.id, deploymentUrl, revalidationSecret }
}

async function post(
  payload: Payload,
  { id, deploymentUrl, revalidationSecret }: Target,
  tags: CacheTag[],
  timeoutMs: number
) {
  const url = `${deploymentUrl.replace(/\/+$/, "")}/api/revalidate`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${revalidationSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags }),
      signal: controller.signal,
    })
    // Release the connection; the body is not used.
    await response.body?.cancel()
    if (!response.ok) {
      payload.logger.error(
        `Revalidation of Site ${id} failed: ${url} responded ${response.status}`
      )
      return
    }
    payload.logger.debug(`Revalidated ${tags.join(", ")} on Site ${id}`)
  } finally {
    clearTimeout(timer)
  }
}
