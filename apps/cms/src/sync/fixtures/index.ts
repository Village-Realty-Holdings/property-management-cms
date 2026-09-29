import type { FakeFeedData } from "../fakeFeed"
import { demoBeach } from "./demoBeach"
import { demoMountain } from "./demoMountain"
import { demoVocabularies } from "./vocabulary"

/** The demo Feed accounts. A Site's `feedAccountRef` names one of them. */
export const DEMO_FEED_ACCOUNTS = ["demo-mountain", "demo-beach"] as const

/**
 * Demo Property Feed data: the shared vocabulary plus the "demo-mountain"
 * and "demo-beach" accounts. A fresh copy on every call.
 */
export function demoFeedData(): FakeFeedData {
  return {
    vocabularies: demoVocabularies(),
    accounts: {
      "demo-mountain": demoMountain(),
      "demo-beach": demoBeach(),
    },
  }
}
