/**
 * Revalidation (ADR-0009): content changes → cache tags on the owning Site's
 * deployment, which revalidates them at `/api/revalidate`.
 *
 * - `revalidationHooks(tagPresets.<collection>)` on each collection.
 * - `createBatch(payload)` for the Sync, which sets `context.skipRevalidation`
 *   on its writes and sends one notification per Site when it finishes.
 * - `notify` / `notifyAllSites` to send tags directly.
 *
 * Tag strings come from `@workspace/content/shared` (`cacheTags`).
 */
export {
  revalidationHooks,
  revalidationSettled,
  type TagsFor,
  type TagsForArgs,
} from "./hooks"
export {
  createBatch,
  notify,
  notifyAllSites,
  type NotifyOptions,
  type RevalidationBatch,
  type SiteRef,
} from "./notify"
export { tagPresets } from "./tags"
