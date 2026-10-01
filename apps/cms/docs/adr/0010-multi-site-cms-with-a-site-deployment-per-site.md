# One multi-Site CMS, with apps/site deployed once per Site

Awayday runs Sites for several unrelated Clients (Avada, Warren Beach, PC Lodge, All Seasons, and more to come). There is one apps/cms deployment and one Postgres database. Every content document belongs to exactly one Site (the one exception is the Feed vocabularies in ADR-0013), using Payload's multi-tenant plugin with `sites` as the tenant collection. apps/site is one codebase deployed separately for each Site, on that Site's domain, with a `SITE` env var.

We chose this over a full stack per Site (today's model: one WordPress install per client from a shared upstream) because the Sites share about 90% of their model. A stack per Site means N migrations, N logins and codebases drifting apart. We chose it over one site deployment serving every domain because these are separate Clients. Separate site deployments give each Client isolated caches, traffic, env config and deploy timing, and keep one Client's traffic spike or bad release away from the others.

## Considered Options

- **Full stack per Site (CMS + database + site).** Rejected. Physical isolation is the one real benefit, and it doesn't outweigh the operational cost of N stacks and the drift the legacy upstream suffered.
- **One site deployment serving every domain.** Rejected. It gives the smallest ops footprint, but a Client-facing incident or deploy would affect every Client at once.
- **Database per Site behind one Payload instance.** Rejected. Payload doesn't switch databases per request, so this ends up as a full stack per Site anyway.

## Consequences

- Isolation between Sites is enforced by access rules, not by the database. Cross-Site leakage is the worst-case bug, so the access module needs tests that assert a Staff User and a Site's public reads never see another Site's documents.
- Anything shared across Sites (Blocks, the Curated List rule language, theming primitives) is shared as code, never as content.
- apps/site gets its Site identity only from its deployment (`SITE`). It never infers the Site from the request, and it only ever holds read credentials scoped to that Site.
- Onboarding a Site means creating a Site record plus a site deployment. Offboarding a Client needs an export script that works per Site.
- A bad apps/cms deploy or migration still affects every Site, and one Site's large Sync shares CMS and database capacity with the rest.
