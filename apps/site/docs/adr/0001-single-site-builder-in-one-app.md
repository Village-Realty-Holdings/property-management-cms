# apps/site is a single-Site builder: Payload, the Admin and the public Site in one app

We restarted the product as a simple site builder for one Site. apps/site holds a fresh Payload install, the Admin and the public Site in one Next.js app with one deployment and no tenancy. The public Site reads content through Payload's Local API. The multi-site MVP in apps/cms (tag `archive/mvp-2026-09`) was broader than we need now, and most of its structure existed to keep Sites apart. Its code is ported into apps/site piece by piece with tenancy removed, and apps/cms is kept only as reference until it is removed.

## Considered Options

- **Keep apps/cms and take tenancy out of it, with apps/site calling it over REST.** Rejected. Two deployments, a REST client and a read credential are there to isolate Sites from each other (apps/cms ADR-0006, 0007, 0010). With one Site they are cost without benefit.
- **Continue the multi-site MVP.** Rejected for now. We want a much better editing experience on one Site first.

## Consequences

- There is no `site` field, tenant plugin or Site Assignment. Site Settings is a Payload global. It is now split into the Brand and SEO globals. Several Sites run as separate deployments, each in its own Postgres schema (ADR-0005).
- apps/site is self-contained. It shares only `packages/ui`, and it doesn't use `packages/content`, `packages/cms-types` or `packages/site-views`.
- A bad deploy can break both the Admin and the public Site at once. We accept that for one app.
- These carry over from apps/cms unchanged: Postgres (apps/cms ADR-0005), hosting on Cloudflare Workers through OpenNext, kept portable to Containers (apps/cms ADR-0015), and Media stored in R2 through the storage adapter (apps/cms ADR-0008), without the per-Site prefix.
- Pages start with three Blocks: Hero, Rich text and Call to action. The catalogue grows in the Site Builder milestone (map issue #34). Pages have Drafts.
