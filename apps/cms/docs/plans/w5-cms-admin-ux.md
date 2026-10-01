# Wave 5: CMS admin UX

Improves the Payload admin for Editors, based on a browser walkthrough and a review of the admin config (2026-09-28). Scope is the CMS admin only. Property Feed, checkout, Sync and Curated List rule fields stay deferred (see `docs/module-layout.md`).

## Conventions

- Integration branch `mvp`. One worker per task on `mvp-w5-<slug>`, each with a PR against `mvp`.
- Workers own disjoint files (listed per task). Task 2 owns the shared field helpers, so it keeps their old exports stable for the other tasks.
- Workers never commit generated files: `packages/cms-types/src/payload-types.ts`, `apps/cms/src/migrations/*`, the admin `importMap`. The `checkpoint` skill regenerates them, with the migration named `cp5_admin_ux`.
- Dev stack: the `dev-up` skill. Admin login is the `BREAK_GLASS_*` pair in `apps/cms/.env`. The demo Editor account has no password, so set one locally to test as an Editor.
- Paths below are relative to `apps/cms/src`.

## Tasks

### 1. `mvp-w5-admin-shell`

Owns: `payload.config.ts`, `collections/index.ts`, `blocks/richTextEditor.ts`, `app/(payload)/custom.scss`, new `components/admin/*` (except `RetryForwarding.tsx`).

- Nav order: Content first and expanded, then Inbox (Submissions), then Feed/Reference, then Settings.
- Awayday branding: `admin.meta` title suffix, favicon, `graphics.Logo` and `Icon`, login page.
- Active Site always visible in the header. Opening a document silently switches the `payload-tenant` cookie and filters every list.
- Dashboard (`beforeDashboard`) with work queues for the selected Site: pending Reviews, failed Submissions, Drafts.
- Hide the ✕ and pencil controls on read-only relationship chips and read-only dates.
- Make the Site-safe Lexical editor the config default, so the default editor's upload, relationship and link pickers can't reach other Sites.

### 2. `mvp-w5-shared-fields`

Owns: `fields/sameSite.ts` (new), `fields/rule.ts`, `fields/seo.ts`, `fields/slug.ts`, `blocks/sameSite.ts` (becomes a re-export), `fields/submissionKinds.ts` (new).

- One fail-closed `sameSite` helper replacing the variants. Today `fields/rule.ts` allows everything when the Site is unknown, while `blocks/sameSite.ts` denies.
- Filter out withdrawn Amenities and Property Types in the rule pickers.
- Shared Submission kind options using the `GLOSSARY.md` terms.
- SEO group: remove the duplicate "SEO" heading and add character counters.

### 3. `mvp-w5-editorial`

Owns: `collections/Pages/*`, `collections/Guides.ts`, `collections/CuratedLists.ts`, `blocks/*` (except `richTextEditor.ts` and `sameSite.ts`), the preview route and `preview/*`.

- Block `RowLabel`s showing the heading or question instead of "Untitled" / "Question 01".
- "Add block" instead of "Add Layout", and a description and image for each block.
- Guides and Curated Lists use the same Content | SEO tabs as Pages and the same drafts settings: `{ validate: true }`, `maxPerDoc: 20`. Autosave on Guides.
- Page path defaults from the title (`"/" + slugify(title)`), with a placeholder.
- `listSearchableFields` on each list, and a Site column when no Site is selected.
- Clear message when Preview's Site deployment is unreachable, instead of a browser connection error.

### 4. `mvp-w5-submissions-media`

Owns: `collections/Submissions.ts`, `collections/Media.ts`, `forwarding/endpoint.ts` (if needed), `components/admin/RetryForwarding.tsx`.

- Guest data and `forwardingStatus` read-only, and no create.
- Retry forwarding button when forwarding has failed.
- Show the full last forwarding error, and plain-language retention help instead of `SUBMISSION_RETENTION_DAYS`.
- Media: jpeg, png, webp and avif only (no SVG), alt-text guidance, search fields.

### 5. `mvp-w5-site-settings`

Owns: `collections/Sites/**`, `collections/Users.ts`, `collections/SiteReaders.ts`, `collections/Amenities.ts`, `collections/PropertyTypes.ts`.

- Regroup the 8 Site tabs (contact details sit under Branding now) and fix the tab overflow at 390px.
- Mask the revalidation secret, and make the slug editable by Super Admin only.
- Colour placeholders or swatches.
- Hide the vocabularies from Editors.
- Consistent `adminsOnly` field access across the tabs.

### 6. `mvp-w5-feed-records`

Owns: `collections/Properties/*`, `collections/Locations/*`, `collections/Specials.ts`, `collections/Reviews/*`.

- Editorial tab first, with consistent tab names.
- Top-level `status` and `showOnSite` on Specials (`position: "sidebar"` doesn't work inside tabs).
- Computed `adminTitle` for Specials and Reviews, so the lists stop showing IDs.
- Search fields, `defaultLimit` 25–50, Yes/No instead of raw booleans.
- Property list shows Headline, falling back to Feed name.
- "Expired" indicator on Specials.
- Review moderation: Pending view, bulk Show/Hide, a Moderation select that can't be cleared.
- Location labels as "Parent › Name (Level)" in pickers.

## Out of scope

Curated List member preview, live preview, "View on Site" for feed records, nav/footer in Site Settings, Entra SSO on the login page.

## Done when

- All six PRs are merged into `mvp` through the `checkpoint` skill.
- Types, import map and the `cp5_admin_ux` migration are regenerated.
- Typecheck, lint and test are green.
- `mvp-cp-5` and `cp-5` are pushed.
- Each task has been checked in the running admin with agent-browser.
