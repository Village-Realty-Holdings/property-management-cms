# Tag-based revalidation, pushed from the CMS to each Site's deployment

apps/site caches reads inside `packages/content` using `'use cache'` + `cacheTag`. apps/cms `afterChange`/`afterDelete` hooks look up the document's Site and POST the affected tags to that Site's deployment at `/api/revalidate`, authenticated with that Site's shared secret. The deployment URL and secret are stored on the Site record. The site then calls `revalidateTag(tag, 'max')` for each tag. The tag vocabulary is defined once in `@workspace/content/shared`, so neither app hand-writes tag strings. A Sync run suppresses per-document notifications and sends one batched notification per Site when it finishes.

## Considered Options

- **Time-based revalidation only.** Rejected. Editors expect to see changes within seconds.
- **`revalidatePath`.** Rejected. A Property change affects its own page, its Location pages, search results and every Curated List. Tags express that without apps/cms knowing each Site's URL scheme, and URL schemes differ per Site because legacy URLs are preserved.

## Consequences

- Any Property change invalidates that Site's `properties` tag and all of its Curated Lists (see ADR-0003). That's coarse but correct, and it never crosses Sites.
- Availability and Quotes are never tag-cached, since they're live from the Feed (ADR-0001).
- A failed notification means stale content until the next change or a time-based expiry. Every cached read therefore also has a `cacheLife` ceiling.
- On Cloudflare (ADR-0015), each Site's Worker uses OpenNext's R2 incremental cache and the Durable Objects sharded tag cache, so `revalidateTag` applies across the whole Worker. `bypassTagCacheOnCacheHit` stays `false` until OpenNext #1295 (stale after revalidate with the regional cache) is fixed.
- `'max'` serves the stale copy once while it refreshes. If Editors need changes visible on the very next request, the revalidate route uses `{ expire: 0 }` instead. Decide this during the build.
