# Everything on Cloudflare: sites on Workers, CMS on Workers but kept portable to Containers

All apps are hosted on Cloudflare. Each Site deployment of apps/site runs on Workers through OpenNext. apps/cms also starts on Workers through OpenNext, on the paid plan. That's a known compromise: Payload on Workers has no sharp, no GraphQL, 128 MB of memory and CPU limits per request. So apps/cms is built to move to Cloudflare Containers (plain Node) without code changes, and it moves when any trigger below is hit.

## Portability rules for apps/cms

- Database through a plain Postgres connection string (Hyperdrive on Workers, direct or Hyperdrive on Containers), never a Workers-only binding in collection or domain code.
- No dependence on Payload `imageSizes`, crop or focal point. Image variants are produced at delivery time by Cloudflare Images (ADR-0008), which works the same from either host.
- No GraphQL. apps/site uses REST (ADR-0007).
- Jobs are started by calling Payload's jobs endpoint from Cloudflare Cron Triggers, Queues or Workflows, never by `autoRun`.
- Anything that needs a platform binding (storage, the Sync fan-out entry point) is chosen in one place, `payload.config.ts` or the worker entry, not in collections or modules.

## Triggers to move apps/cms to Containers

- Admin users can't be created or log in on Workers. There's an open Payload PR on PBKDF2 iteration limits (#18276), so check this on day one.
- Admin or bulk operations hit the CPU or 128 MB memory limits.
- Editors need crop or focal-point editing in the admin.

## Considered Options

- **Containers from day one.** It's the lower-risk runtime for Payload, but the user chose to start on Workers and keep Containers as a fallback.
- **D1 instead of Postgres.** Rejected (see ADR-0005).

## Consequences

- `'use cache'` with PPR is the least mature part of OpenNext on Workers (open cached-shell and concurrency bugs as of 2026-09). Pin Next and OpenNext versions, and test real page shapes early.
