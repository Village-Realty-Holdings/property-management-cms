# Handoff: per-tenant home pages, theme, tenant copying

Branch: `master`. Last commit `57ff72b` (Warren Beach seed, header logo, visual editor fix). Everything below is **uncommitted** in the working tree.

## Goal

1. Each tenant gets a seeded starter site (home, vacation-rentals, property, property-management) built from its real site's copy and photos, plus theme, settings, header and footer. Warren Beach is committed; Sun Palace is in progress.
2. Creating a tenant in the admin asks whether to copy an existing tenant's site into it.

## What is done and committed (`57ff72b`)

- `scripts/seed.ts` seeds the root admin, both tenants and Warren Beach content.
- Header global has a `logo` upload, shown by `src/components/Logo/Logo.tsx` in header and footer (migration `20260908_172529_header_logo`, applied locally).
- New pages open in the visual editor: `src/components/admin/CreatePage.tsx` names Payload's autosaved empty draft "New page" via PATCH and refreshes.

## What is done but uncommitted

- **Shared site seeder** `scripts/seed/site.ts` (`seedSite(payload, tenant, content: SiteContent)`) builds the four pages, forms, media and globals from a content object. `scripts/seed/warren-beach.ts` and `scripts/seed/sun-palace.ts` export `SiteContent`. `scripts/seed.ts` loops tenants and calls `seedSite`.
- **Sun Palace theme preset** `sun-palace` in `src/lib/themePresets.ts`; **Quicksand** font added to `src/lib/themeCss.ts` and `src/Theme/fonts.ts`.
- **Per-tenant slugs.** `slugField({ disableUnique: true })` on Pages and Posts; Pages has `indexes: [{ fields: ['tenant','slug'], unique: true }]`. Posts cannot declare the same index because Payload names every compound index `tenant_slug_idx` and SQLite rejects the duplicate, so the posts index is meant to be added by hand in the migration (see "Not done").
- **Tenant filtering on the frontend.** `tenantWhere()` in `src/server/getTenant.ts`, used in `src/app/(frontend)/[slug]/page.tsx`, `posts/[slug]/page.tsx` and `src/blocks/ArchiveBlock/Component.tsx`. Posts list pages and the sitemaps are still global (they render `force-static`, so `headers()` is unavailable).
- **Copy from tenant.** `Tenants` gains a `copyFrom` relationship ("Start from"), shown only on create. `src/collections/hooks/copyTenantContent.ts` runs after create, calls `src/server/cloneTenant.ts`, then clears `copyFrom`. The cloner copies media (re-fetching each file through its public URL), forms, categories, posts, pages and the four globals, remapping every relationship with `src/lib/remapRelations.ts` (extracted from `scripts/import-postgres-export.ts`, which now imports it). Versioned collections are created as drafts first, then published on a second pass so page-to-page links resolve.
- **Migration** `src/migrations/20260908_175112_tenant_slugs.ts` was generated (drops the global unique slug indexes, adds the pages compound index, adds `tenants.copy_from_id`). **Not yet applied.**

## Not done, in order

1. Edit the migration by hand: after `CREATE INDEX posts_slug_idx`, add
   `CREATE UNIQUE INDEX posts_tenant_slug_idx ON posts (tenant_id, slug);` and drop it at the top of `down`. (A python edit for this was prepared but never ran; verify the file has one `tenant_slug_idx` for pages only.)
2. Remove the `indexes:` line from `src/collections/Posts/index.ts` if present, keeping `slugField({ disableUnique: true })` with a comment explaining why.
3. `npm run migrate`, then `npm run generate:types:payload`, then `npx tsc --noEmit -p tsconfig.json` (ignore the two pre-existing errors in `tests/int/puck/pickers.int.spec.tsx`).
4. `npm run seed`. The last run failed on `UNIQUE constraint failed: pages.slug` while creating Sun Palace's `property` page, which the migration fixes. Sun Palace media and forms already exist locally, so those log as "updated".
5. `npx eslint scripts src` on the changed files.
6. Start the dev server yourself (`! npm run dev`), open http://warren-beach.localhost:3000/ and http://sun-palace.localhost:3000/. The earlier Warren Beach screenshot was taken on a server that had cached empty header and theme from before the seed; confirm the logo, nav, blue palette and card images show on a fresh server.
7. Try the copy flow: Admin, Tenants, Create, pick "Start from", save. Check the new tenant's pages, media and theme. Media copying fetches `NEXT_PUBLIC_SERVER_URL + media.url`, so the dev server must be reachable at that URL.
8. Commit.

## Known gaps

- Visual editor's "New page" flow was not exercised in a browser after the change.
- Amenity card links other than "Pet friendly" point at `/vacation-rentals` without a filter, because the search only supports node and pets params.
- Autosaved drafts created by Payload have `tenant` null when no tenant is selected in the admin; not addressed.
- `ReviewsFeed` has no tenant or region filter, so Sun Palace uses a `testimonials` block with quotes from its site instead.

## Useful facts

- Dev server that was running on :3000 was killed; another `next dev` on the machine belongs to `~/Work/lobby`, leave it.
- Local D1 lives under `.wrangler/state/v3/d1/`; `sqlite3` works on it for inspection.
- Screenshot script: `scratchpad/shot.mjs` uses `/usr/bin/chromium` with Playwright and tenant subdomains (`*.localhost` resolves natively in Chromium).
- Scraped design tokens: `~/Work/resources/site-scraping/<host>/Design/latest/default/`.
