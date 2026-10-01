import {
  UnknownFeedAccountError,
  type FeedAccountRef,
  type FeedListing,
  type FeedNode,
  type FeedPromo,
  type FeedReview,
  type FeedVocabularies,
  type PropertyFeed,
} from "./feed"
import { demoFeedData } from "./fixtures"

/** One Feed account's records. */
export type FakeFeedAccount = {
  nodes: FeedNode[]
  listings: FeedListing[]
  promos: FeedPromo[]
  reviews: FeedReview[]
}

export type FakeFeedData = {
  vocabularies: FeedVocabularies
  accounts: Record<FeedAccountRef, FakeFeedAccount>
}

/**
 * An in-memory Property Feed built from `data` (default: the demo fixtures,
 * accounts "demo-mountain" and "demo-beach"). Every call returns a deep copy,
 * so callers can't change the feed by mutating results. To change the feed
 * (a renamed or removed listing), build a new one from edited data.
 */
export function createFakeFeed(
  data: FakeFeedData = demoFeedData()
): PropertyFeed & { accounts(): FeedAccountRef[] } {
  const account = (ref: FeedAccountRef): FakeFeedAccount => {
    const found = Object.hasOwn(data.accounts, ref)
      ? data.accounts[ref]
      : undefined
    if (!found) throw new UnknownFeedAccountError(ref)
    return found
  }
  const copy = <T>(value: T): Promise<T> =>
    Promise.resolve(structuredClone(value))

  return {
    accounts: () => Object.keys(data.accounts),
    listVocabularies: async () => copy(data.vocabularies),
    listNodes: async (ref) => copy(account(ref).nodes),
    listListings: async (ref) => copy(account(ref).listings),
    getListing: async (ref, feedId) =>
      copy(account(ref).listings.find((l) => l.feedId === feedId) ?? null),
    listPromos: async (ref) => copy(account(ref).promos),
    listReviews: async (ref) => copy(account(ref).reviews),
  }
}
