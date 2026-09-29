import type { Payload } from "payload"

import type { Site } from "@workspace/cms-types"

import { createFakeFeed, reconcile, syncVocabularies } from "../sync"

/**
 * Runs the Sync for each demo Site against the fake Property Feed, the only
 * way Properties and Locations come into existence (ADR-0001). Returns whether
 * the Sync ran.
 */
export async function runSync(payload: Payload, sites: Site[]) {
  const ctx = { payload, feed: createFakeFeed() }
  await syncVocabularies(ctx)
  for (const site of sites) {
    const report = await reconcile(ctx, site)
    payload.logger.info({ report }, `Synced ${site.slug} from the fake feed`)
  }
  return true
}
