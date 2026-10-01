import { PropertyFeedUnavailableError, type PropertyFeed } from "./feed"

/**
 * The HTTP adapter for the real Property Feed. A stub until the Feed's
 * contract is agreed (docs/module-layout.md, "Open items"): every call
 * throws `PropertyFeedUnavailableError`.
 */
export function createHttpFeed(): PropertyFeed {
  const pending = async (): Promise<never> => {
    throw new PropertyFeedUnavailableError()
  }
  return {
    listVocabularies: pending,
    listNodes: pending,
    listListings: pending,
    getListing: pending,
    listPromos: pending,
    listReviews: pending,
  }
}
