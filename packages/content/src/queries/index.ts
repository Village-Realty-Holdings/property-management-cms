/**
 * `@workspace/content/queries`: the uncached queries and the mapping from
 * Payload documents to the Site's shapes, over a `ContentClient` (ADR-0018).
 * No Next runtime, so apps/cms can use it. The root entry wraps it with
 * Next caching for apps/site.
 */
export { contentAdapter, withVariables } from "./adapter"
export {
  ContentRequestError,
  type ContentClient,
  type ContentQuery,
  type FieldError,
  type PaginatedResponse,
} from "./client"
export { loadLocationTree, loadSite, type QueryContext } from "./context"
export { getCuratedList } from "./curatedLists"
export { getGuide, listGuides } from "./guides"
export { getLocation } from "./locations"
export { getPage } from "./pages"
export { getProperties, getProperty, searchProperties } from "./properties"
export { getSiteSettings } from "./site"
export { listSitemapEntries } from "./sitemap"
export { getSpecial, listSpecials } from "./specials"
export { submit, SubmissionError } from "./submit"
export type * from "../types"
export type { CacheTag, CuratedListRule } from "../shared"
