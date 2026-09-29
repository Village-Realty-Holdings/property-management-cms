# Module layout (plan, not yet implemented)

Vocabulary: see `CONTEXT.md`. The decisions behind this layout are in `docs/adr/`.

## Workspace

```
apps/
  cms/                 One Payload 3 deployment for all Sites. Admin at /admin, REST at /api (ADR-0006, 0010)
  site/                One codebase, deployed once per Site with SITE=<slug> (ADR-0010)
packages/
  cms-types/           NEW: generated payload-types.ts, committed. No runtime code
  content/             NEW: the site's CMS read module + shared tag and rule vocabulary
  site-views/          NEW: the Site's views (page views, Blocks, frames, theme), used by site and by cms Preview (ADR-0018)
  feed-client/         NEW (deferred): typed Property Feed client, once the Feed contract exists
  ui/                  (existing) shadcn components, used by site-views and site
  eslint-config/, typescript-config/   (existing)
```

Dependency direction (no cycles):

```
cms-types  ←  content/shared  ←  content/queries  ←  content  ←  site  →  feed-client
                                       ↑                          ↓
                                  site-views  ←───────────────────┘
                                       ↑
cms  →  cms-types, content/shared, content/queries, site-views, feed-client (Sync)
```

apps/cms imports `@workspace/content/shared` and `@workspace/content/queries` (no Next runtime) and `@workspace/site-views`, never the root `@workspace/content` entry, which uses `next/cache`.

## apps/cms

```
apps/cms/src/
  payload.config.ts          Assembles collections, globals, db, storage, the multi-tenant plugin, and types output → packages/cms-types
  database.ts                The pg module Payload uses: pg as is on Node; on Workers, a connection per checkout, so no socket outlives its request (ADR-0015)
  app/(payload)/             Payload-generated routes (admin, api, layout). Hand-edited only for custom endpoints
  app/(preview)/             Preview (ADR-0018): /preview/<site>/<collection>/<id>, its own root layout with the Site's styles. Staff only
  collections/
    Sites/                   The tenant collection, with tabs: identity (domain, deployment URL + secret, Feed account ref),
                             branding, legacy URL scheme, Amenity Presentation, Property Type labels,
                             default Stay Policy, Review Moderation rule, Forwarding Destinations
    Properties/
      index.ts               Collection config: Facts tab (read-only) + Editorial tab, status Active/Withdrawn
      facts.ts               Property Facts fields (incl. Rooms, Stay Policy, Amenity/Property Type refs), read-only via access/factsReadOnly
    Locations.ts             Mirrored from Feed nodes (parent, feed id, read-only) + editorial: Level, display name, visibility,
                             landing copy, Complex-only fields (address, shared amenities, check-in, housekeeping, fee notes)
    Specials.ts              Mirrored promo (rules, dates, eligible Properties, read-only) + public copy, slug, show-on-site
    Reviews.ts               Mirrored review + manager response (read-only) + Moderation state
    Amenities.ts             Awayday-wide vocabulary, NOT Site-scoped, Sync-written only (ADR-0013)
    PropertyTypes.ts         Awayday-wide vocabulary, NOT Site-scoped, Sync-written only (ADR-0013)
    Submissions.ts           Inquiry | Owner Lead | contact; forwarding status + retry (ADR-0014)
    CuratedLists.ts          Rule fields + editorial; drafts
    Pages.ts                 Blocks layout; drafts
    Guides.ts                Relations to Locations/Properties; drafts
    Media.ts                 Editorial uploads only (ADR-0008)
    Users.ts                 Staff Users: entraOid, role (admin | editor), Site Assignment, superAdmin (from Entra); Entra strategy + break-glass local login
    SiteReaders.ts           API-key auth, one per Site, used by that Site's deployment. Published content only. Not staff
  globals/                   None. Per-Site settings live on Sites, because Payload globals can't be scoped to a tenant
  blocks/                    One file per Block config (Hero, RichText, PropertyCarousel, CuratedListBlock, …)
  fields/                    Reusable field factories: slug(), seo(), rule() (Curated List rule shape)
  auth/                      Deep module: Entra OIDC sign-in → Payload session (ADR-0016)
  access/
    index.ts                 The ONLY place access functions are defined
  sync/                      Deep module: Feed → vocabularies, Locations, Properties, Specials, Reviews, per Site
  revalidation/              Deep module: content changes → cache tags on the owning Site's deployment
  forwarding/                Deep module: stored Submission → the Site's Forwarding Destination, with retries
  sections/                  Sections: which collections each turned-off Section hides in the admin (Nav, work queues, Site Settings)
  variables/                 Variables (ADR-0017): save validation for Pages and Guides, the editors' help panel
  pageTemplates/             Page Templates: the Tuck-In starting layout, applied when a Page is created
  preview/                   Deep module: a Draft → the Site's view of it, for the Staff User asking (ADR-0018)
```

Every content collection is registered with the multi-tenant plugin, which adds a required `site` field and scopes the admin to the selected Site. `Sites`, `Users`, `SiteReaders`, `Amenities` and `PropertyTypes` are the only collections that aren't Site-scoped.

### `access/`: small, closed set of named rules

The interface is a handful of exports, and collections compose them without writing inline access functions. Each rule returns a Payload `where` constrained to the caller's Sites, never a bare `true`, except for Super Admins.

| Export               | Meaning                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `isSuperAdmin`       | Staff User with the superAdmin flag                                                                     |
| `adminOfSite`        | Admin, limited to documents on their assigned Sites                                                     |
| `staffOfSite`        | Admin or Editor, limited to documents on their assigned Sites                                           |
| `publishedForReader` | SiteReader: `_status = published` AND `site = reader's Site`; staff: via `staffOfSite`                  |
| `activeForReader`    | SiteReader: Property `status = active` AND `site = reader's Site`; staff: via `staffOfSite`             |
| `factsReadOnly`      | Field-level: update denied for everyone through access-controlled APIs (the Sync uses `overrideAccess`) |

Locality: "what a caller can see" is defined in one file, and the cross-Site leak tests (ADR-0010) run against this module's exports.

The multi-tenant plugin covers the admin UI's Site scoping. These rules are the guarantee for the API.

### `auth/`

The interface is two routes (`/auth/entra/start`, `/auth/entra/callback`) plus a Payload auth strategy registered on `Users`. Hidden: PKCE and state, ID-token verification against Entra's signing keys, find-or-create by `oid`, syncing the Super Admin flag from app roles, rejecting users without `cms_user`, and the admin login-screen button.

### `sync/`: the deep module

Interface (the whole surface callers see):

```ts
syncListing(ctx: SyncContext, site: SiteRef, feedId: string): Promise<SyncOutcome>  // created | updated | withdrawn | unchanged
reconcile(ctx: SyncContext, site: SiteRef): Promise<ReconcileReport>                // full pass for one Site: nodes, listings, Specials, Reviews
syncVocabularies(ctx: SyncContext): Promise<void>                                   // Amenities + Property Types (not Site-scoped)
type SyncContext = { payload: Payload; feed: PropertyFeed }
```

The trigger is deliberately left out of the interface. A Feed webhook, a Payload job or a cron can each call these later.

Hidden behind it:

- `feed.ts`: the `PropertyFeed` seam, with only what the Sync needs (listings, nodes, promos, reviews, vocabularies). There are two adapters, an HTTP one against the Property Feed and an in-memory one for tests, so it's a real seam.
- `map-listing.ts`: a pure function from Feed Listing to Property Facts. It never touches Editorial Content or the slug (ADR-0002).
- `mirror.ts`: the one upsert/withdraw routine that every mirrored collection uses. It writes only the Feed-owned fields, so Editorial Content, slugs, Levels and Moderation are never touched (ADR-0001, 0002, 0012).
- Order within a reconcile: nodes before listings (so a Property's Location exists), then listings before Specials and Reviews (so their Property references resolve).
- Upsert keyed by (Site, Feed ID), Withdrawn/Active transitions scoped per Site, and one batched `revalidation.notify` per Site at the end (ADR-0009).
- These avoid the legacy multi-account delete bug: withdrawal is computed per Site from that Site's full listing set.

Tests go through `syncListing`/`reconcile` with the in-memory feed and a test Payload instance. They don't test past the interface.

### `revalidation/`

```ts
revalidationHooks(tagsFor: (doc) => CacheTag[]): { afterChange; afterDelete }   // attached per collection
notify(site: SiteRef, tags: CacheTag[]): Promise<void>                           // used by sync for batching
```

Hidden: looking up the Site's deployment URL and secret, the POST, de-duplication of tags, honouring the `context.skipRevalidation` flag that the Sync sets, and error logging that never fails an Editor's save. Tag strings come from `@workspace/content/shared`.

### `forwarding/`

```ts
forwardSubmission(ctx, submissionId): Promise<ForwardOutcome>   // called by an afterChange hook and by the admin "retry" action
```

Hidden: choosing the destination from the Site's Forwarding Destinations by Submission kind, the adapters (Feed CRM, webhook, email), idempotency, and recording status and errors on the Submission.

## packages/cms-types

This package contains only `src/payload-types.ts`, generated by `payload generate:types` in apps/cms with `typescript.outputFile` pointing here. The file is committed, so apps/site builds without running the CMS, and CI checks that it's current. The `declare module 'payload'` augmentation stays in apps/cms, so this package has no dependency on `payload`. To be verified at setup: `typescript.declare: false`.

A turbo task `generate:types` (in apps/cms) is a dependency of `typecheck`/`build` for `cms-types` consumers.

## packages/content

Root entry (`@workspace/content`), used by apps/site only. The Site comes from the deployment (`SITE` env + that Site's reader key) and never appears in the interface.

```ts
getProperty(slug) // Active only; returns null for Withdrawn → site renders 410/redirect
getProperties(feedIds) // content for a Feed search result, in the Feed's order
searchProperties(filter) // non-dated browse: Location, Amenities, minSleeps, …; paginated
getLocation(path) // with ancestors + child Locations
getCuratedList(slug) // resolves members from its rule
getPage(path) / getGuide(slug) / listGuides(filter)
getSiteSettings()
```

Published content only. There is no draft mode: Drafts are previewed in the CMS (ADR-0018).

Hidden: SDK/REST client, Site scoping, `depth`/`select` choices, `'use cache'` + `cacheTag` + `cacheLife` ceilings, and mapping Payload docs to site-facing shapes (for example, feed-text fallback when Editorial Content is empty, per ADR-0002).

Subpath `@workspace/content/shared` is pure TS with no Next or Payload runtime:

- `cacheTags`: the single tag vocabulary (`property(slug)`, `properties`, `location(id)`, `curatedLists`, `page(path)`, `siteSettings`, …). Tags are per deployment, so they don't carry the Site.
- `resolveVariablesDeep(doc, values)` and `variableValuesFrom(site)`: the Variable resolver (ADR-0017). `getPage`/`getGuide` apply it; apps/cms validates with the same names.
- `curatedListWhere(rule)`: compiles a Curated List rule to a Payload `where`. The site uses it to resolve members, and apps/cms can use it for an admin member-count preview.

Subpath `@workspace/content/queries` holds the uncached queries and the mapping from Payload documents to Site shapes, with no Next runtime. They take a `QueryContext`: the Site's slug, whether to read Drafts, and a `ContentClient` (`find`, `create`). The client is the seam, with two adapters:

- HTTP (`createRestClient`): the Site's reader key, used by the root entry.
- Local API (in apps/cms `preview/`): `payload.find` as the Staff User with `overrideAccess: false`, used by Preview.

`contentAdapter(ctx)` builds a whole `ContentAdapter` from a context, with Variables resolved (ADR-0017), so both apps get identical shapes.

## packages/site-views

The Site's views: `PageView`, `GuideView`, `CuratedListView`, the Blocks, `SiteFrame`, `TuckInFrame`, `SiteTheme` and fonts. apps/site routes and the CMS Preview route both render them.

```tsx
<PageView page={page} content={content} year={year} mediaBaseUrl={cmsUrl} preview />
<GuideView guide={guide} content={content} preview />        // inside SiteFrame
<CuratedListView list={list} content={content} preview />    // inside SiteFrame
```

`content` is a `ContentAdapter`. Views and Blocks that need more data (Site Settings, Property grids, Curated List cards, browse options) read it through that argument, never from env or a module-level adapter. apps/site passes the root entry's cached `content`, Preview passes the Local API one. `year` is an argument too: apps/site caches it so pages prerender, and apps/cms can't use `'use cache'`.

- `preview` mounts `PreviewGuard`, which stops link clicks and form submits, so nothing leaves the Preview.
- Forms call the Site's Server Actions through `FormActionsProvider` (apps/site's root layout). Without it (Preview), they don't send.
- Tailwind scans the package through an `@source` in `@workspace/ui/globals.css`.

Hidden: layout, chrome selection for Pages (the Site's header and footer, or the Tuck-In's), Block rendering, theming from Site Settings.

## packages/feed-client (deferred)

This waits for the Property Feed contract. It will hold the typed client for Availability search, Quote and (if confirmed) booking, used by apps/site, plus the listing calls behind the Sync's `PropertyFeed` adapter. Until a second consumer exists, the site-side calls can live in apps/site.

## apps/site additions (when built)

- `app/api/revalidate/route.ts`: verifies the Site's secret, then calls `revalidateTag(tag, 'max')` for each tag. This is thin by design.
- Legacy URL redirects, generated from Site Settings (`/cabin-rentals/{slug}`, `/property-details/{slug}`, `/rentals/{slug}`, `/{slug}/`).
- Image delivery through Cloudflare Images (OpenNext `IMAGES` binding), limited to the R2 host and the feed photo hosts (ADR-0008).
- Theming from Site Settings (tokens), not per-Site forks.

## Open items

- **Early spike**: `'use cache'` + PPR on OpenNext with real page shapes, and Payload admin user creation on Workers (ADR-0015 triggers).
- **Revalidation freshness**: `revalidateTag(tag, 'max')` or `{ expire: 0 }`, depending on whether Editors need changes visible on the next request (ADR-0009).
- **Submission retention**: the retention period and the delete-on-request process for guest personal data (ADR-0014).

## Deferred

Property work is on hold. Until it resumes, Properties come from the in-memory demo feed.

- **Property Feed contract**: listing shape, change notifications, search, Quote, booking.
- **Checkout**: whether it goes through the Feed with hosted payment fields (recommended) or somewhere else.
- **Sync trigger** (Feed webhook, schedule, or both). The `sync/` interface is ready for either.
- **Sync on Cloudflare**: Cron Trigger → one Queue message or Workflow per Site → `reconcile` in pages (Workers cron CPU limits).
- **Curated List rule fields**: likely Location, Amenities, Property Type, bedrooms, sleeps, pets.
- Places / Things to Do, guest accounts and favourites, long-term stays.
