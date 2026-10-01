/**
 * The Sync (docs/module-layout.md, "sync/"): Property Feed → Amenities,
 * Property Types, Locations, Properties, Specials and Reviews, per Site.
 * It is the only way Properties and Locations come into existence, and it
 * writes only Feed-owned fields (ADR-0001, 0002, 0012, 0013).
 *
 *   syncVocabularies(ctx)            Amenities + Property Types (not Site-scoped)
 *   reconcile(ctx, site)             full pass for one Site → ReconcileReport
 *   syncListing(ctx, site, feedId)   one listing → created | updated | withdrawn | unchanged
 *
 * The trigger (Feed webhook, job, cron) is left to callers: today the
 * `POST /api/sites/:id/reconcile` endpoint and the `sync:demo` script.
 */
import { createFakeFeed } from "./fakeFeed"
import type { PropertyFeed } from "./feed"
import { createHttpFeed } from "./httpFeed"

export {
  reconcile,
  syncListing,
  syncVocabularies,
  SyncSiteError,
  type Counts,
  type ReconcileReport,
  type SiteRef,
  type SyncContext,
  type SyncError,
  type SyncOutcome,
  type VocabularyReport,
} from "./reconcile"
export {
  PropertyFeedUnavailableError,
  UnknownFeedAccountError,
  type PropertyFeed,
} from "./feed"
export { createFakeFeed, type FakeFeedData } from "./fakeFeed"
export { DEMO_FEED_ACCOUNTS, demoFeedData } from "./fixtures"

/**
 * The Property Feed this deployment syncs from: the in-memory demo feed when
 * `PROPERTY_FEED=fake`, otherwise the HTTP adapter (pending the Feed's
 * contract, so its calls throw `PropertyFeedUnavailableError`).
 */
export function propertyFeedFromEnv(
  value: string | undefined = process.env.PROPERTY_FEED
): PropertyFeed {
  return value === "fake" ? createFakeFeed() : createHttpFeed()
}
