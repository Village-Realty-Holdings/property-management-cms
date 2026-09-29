# Postgres as the database, reached through Hyperdrive

We use Postgres (`@payloadcms/db-postgres`) on a managed provider (Neon, Supabase or PlanetScale Postgres), reached from Cloudflare through Hyperdrive, with committed Payload migrations run from CI. The model is relational: Properties, the Location tree, Specials, Reviews and Curated List rules filtering on Amenities, Location ancestry and numeric facts, all under a Site tenant field. Postgres handles those joins and filters, has real transactions for the Sync, and keeps apps/cms portable between Workers and Containers (ADR-0015).

## Considered Options

- **Cloudflare D1 (SQLite)**, which Payload's official Cloudflare template uses. Rejected. The D1 adapter is beta and has no interactive transactions. It has an open data-loss issue (#15219) where array-field updates run as DELETE then INSERT with nothing grouping them atomically, and an open 100-parameter limit issue (#14766). Each D1 database also has a single writer. Rich Property documents, the multi-tenant field and concurrent Syncs are exactly the conditions those issues hit.
- **MongoDB.** Viable, but Curated List rules and Location-ancestry filters are relational queries, and we'd lose migration review.

## Consequences

- On Workers, node-postgres runs without its own pool (`max: 1`). Hyperdrive provides the pooling. Hyperdrive query caching is disabled for the CMS, so the admin never reads stale data straight after a write.
- Every collection or field change needs `payload migrate:create`, committed alongside it. Prod runs migrations only.
