/**
 * `@workspace/content/proxy`: reads for apps/site's proxy.ts (legacy URL
 * redirects). Next.js doesn't run `'use cache'` in the proxy, so the cached
 * reads of `@workspace/content` throw there; these read the CMS directly and
 * keep results in memory for a short while instead. The CMS's revalidation
 * doesn't reach this memo: a change shows within `ttlMs`.
 */
import { contentAdapterName } from "./env"
import { fakeAdapter } from "./fake"
import { contextFromEnv } from "./rest/fromEnv"
import { getLegacyUrls, isLegacyPropertySlug } from "./queries/legacy"
import type { LegacyUrlSettings } from "./shared"

const ttlMs = 60_000
/** Bounds the memo: root-level lookups are keyed by arbitrary paths. */
const maxEntries = 1_000

type Entry = { value: Promise<unknown>; expires: number }
const memo = new Map<string, Entry>()

function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = memo.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T>
  if (memo.size >= maxEntries) {
    for (const [k, entry] of memo) if (entry.expires <= now) memo.delete(k)
    if (memo.size >= maxEntries) memo.clear()
  }
  const value = load()
  memo.set(key, { value, expires: now + ttlMs })
  // A failure isn't remembered: the next request tries again.
  value.catch(() => {
    if (memo.get(key)?.value === value) memo.delete(key)
  })
  return value
}

/** Clears the memo (tests). */
export function clearProxyMemo(): void {
  memo.clear()
}

/** The Site's Legacy URLs tab. */
export function getLegacyUrlSettings(): Promise<LegacyUrlSettings> {
  if (contentAdapterName() === "fake") {
    return fakeAdapter.getSiteSettings().then((s) => s.legacyUrls)
  }
  const ctx = contextFromEnv()
  return remember(`${ctx.site}:legacyUrls`, () => getLegacyUrls(ctx))
}

/**
 * Whether /{slug} is a legacy Property URL: an Active Property has the slug
 * and no published Page owns the path (root-level pattern).
 */
export function isPropertySlug(slug: string): Promise<boolean> {
  if (contentAdapterName() === "fake") {
    return Promise.all([
      fakeAdapter.getProperty(slug),
      fakeAdapter.getPage([slug]),
    ]).then(([property, page]) => property !== null && page === null)
  }
  const ctx = contextFromEnv()
  return remember(`${ctx.site}:property:${slug}`, () =>
    isLegacyPropertySlug(ctx, slug)
  )
}
