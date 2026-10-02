# Site Builder milestone: spec and Definition of Done

This spec comes from the wayfinder map **"Wayfinder: Site Builder milestone"** (GitHub issue #34). The detail of every decision lives in the closed ticket linked from the map's "Decisions so far". This file is what coding agents build from.

- **Before building, read:**
  - `GLOSSARY-MAP.md`
  - `apps/site/GLOSSARY.md`
  - `apps/site/docs/adr/`, and ADRs 0004–0006 in particular
  - `node_modules/next/dist/docs/`, because this Next.js version has breaking changes
- **Branches:**
  - integration branch: `milestone/site-builder`
  - slices: `wip/<tag>-<slice>`, landed straight onto the integration branch (Phases 1 and 2 used `checkpoint/<n>-<name>` PRs)
- **How it runs:** the workflow `.claude/workflows/site-builder.js`. The runbook is at the end of this file.

## Reference material

| What                                                                                            | Where                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Per-Site schema research, genericize script, Media split                                        | branch `research/per-site-schema`, `apps/site/docs/research/per-site-schema.md`                                        |
| Warren Beach and Avada: logos, photos, palette, manifests, fixtures, screenshots, Theme presets | branch `research/brand-extraction`, `research/brands/`                                                                 |
| Theme UI prototype (token derivation, controls, ThemedCanvas, Visual Editor variant A)          | branch `prototype/theme-editing`, `apps/site/src/admin/prototype-theme/`                                               |
| Rental Brand Audit                                                                              | https://claude.ai/artifact/9BuGbS3zYXjZwbXaCjgnqW (local source `~/Projects/Personal/design-expert/design/audit.html`) |
| Hand-validated site themes and the anti-pattern to avoid (`brand*` variants)                    | `~/Projects/Personal/design-expert/design/playground/`                                                                 |

Prototype code is a reference, not a base. Rewrite it properly: add tests, handle errors, and don't copy the `PROTOTYPE` markers across.

## Standing rules for every agent

- **Never touch** the `property_management_site` database or `main`. Work in scratch databases or schemas named `ms_<something>`, and drop them when you're done.
- **Test-first:** drive `/tdd` for logic. Every phase keeps `pnpm check` green: lint, typecheck and test.
- **Admin:** it writes only through the Local API as the Staff User (ADR-0002). Blocks render the same way in the Visual Editor and on the Site.
- **Styling:** it comes from the Theme's tokens. There are no per-brand Block variants and no `brand-*` component variants.
- **Accessibility:** WCAG 2.2 AA across the Admin and the public Site.
- **Decisions the spec doesn't cover:** make the most conservative choice consistent with this spec and the ADRs, and report it. The slice reviewer rules on it, and it is recorded in the final PR body under "Decisions made during the build".

---

## Phase 1: Foundation (per-Site schema, Brand, SEO, Assets, Admin structure, Dashboard)

### Per-Site schema (ADR-0005)

- `postgresAdapter({ schemaName: process.env.DATABASE_SCHEMA })`. When it's unset, the adapter uses `public`.
- **Migrations:** port `scripts/genericize-migration.mjs` and `src/setSiteSchema.ts` from `research/per-site-schema`. There is one schema-agnostic migration, and running it creates the schema. Add a check (a lint script or test) that fails when `"public".` appears in `src/migrations`.
- **Media:** local files go in `media/<schema>/`. With S3/R2, keys use the prefix `<schema>`. Add the `_objectKey` and `prefix` Media fields and the migration the research found missing.
- **Env files:** `.env.example` documents `DATABASE_SCHEMA`. There is one env file per Site: `apps/site/.env.warren-beach`, `.env.avada` and `.env.beachside` (gitignored), with templates committed as `*.example`. Each has its own port: 3001 for Warren Beach, 3002 for Avada, 3003 for Beachside.
- **Running a Site:** `pnpm site <slug> <cmd>` (for example `pnpm site avada dev` or `pnpm site avada migrate`) loads that Site's env. For the worktree layout, see Phase 6.

### Brand and SEO replace Site Settings

- **The Brand global:** name, tagline, logo (Media), contact (phone, email, address), and social links. The public Site reads it for its identity.
- **The SEO global:**
  - title pattern (for example `%s · {name}`)
  - default description
  - social share image (Media)
  - favicon (Media)
  - `allowIndexing` (boolean)
- **What the Site renders from SEO:**
  - `robots.txt`
  - `sitemap.xml` (listing Published Pages)
  - the favicon
  - Open Graph defaults
  - each Page's own SEO: title, description and image, which already exist on Pages
  - with indexing off, `noindex` everywhere and a `robots.txt` that disallows all
- **Removed:** the `site-settings` global and the `branding.*` colour and font fields, with no migration. Seeds recreate content.
- **Domain:** read from the env (`SITE_URL`). It is not in the Brand.

### Assets: Fonts

- A `fonts` collection with a family name, a kind (serif, sans or slab), and files (weight, style and file). It is separate from Media, and its files live in their own upload collection or directory.
- **Add a Google Font by name:**
  - the server downloads the WOFF2 files for the chosen weights from Google Fonts
  - it stores them as a Font
  - the Site then serves them itself, self-hosted, with no calls to Google at runtime
- **The six current built-in fonts** (`src/site/fonts.ts`) stay as quick picks.
- **Deleting a Font the Theme uses is blocked.** The error names what uses it.

### Admin structure and Dashboard

- **Sidebar:**
  - at the top, the Site's logo and name, with a small schema badge
  - **Dashboard**
  - **Content:** Layouts, Pages, Media
  - **Settings:** Brand, SEO, Theme, Assets
  - **Tools:** Replace Text, Replace Image, Themes, Starter Kits (added by the Tools milestone, ADR-0008 and ADR-0009)
  - at the foot, View Site, the Staff User, and sign out
- **The Dashboard, at the Admin root (`/admin`):**
  - a Site card: logo, name, domain, View Site
  - **Continue editing:** the last 5 Pages or Layouts edited
  - **Waiting to publish:** Pages with unpublished changes
  - **SEO health:** the number of Published Pages missing a title or description, linking to SEO
  - a **Theme** card: swatches, when it was last saved, Edit Theme
  - quick actions: New Page, New Layout, Upload Media
- **Pages list:** title, path, a status chip (Draft / Published / Changes not published), the Layout it uses ("Listings, via /stays" or "No Layout"), and last updated. It has search, and New Page opens the Visual Editor.
- **Layouts list:** name, paths, "used by N Pages", and last updated. It has Duplicate. This list becomes real in Phase 3.
- **The Brand page:** sections for Identity, Contact and Social.
- **The SEO page:** the defaults form, plus a "Pages needing attention" table. Each row opens the Page in the Visual Editor with the Page tab open.
- **Assets › Fonts:**
  - each Font shows a sample line and its weights
  - Fonts in use show a lock and what uses them
  - Upload files, or Add Google Font
- **UX rules across the Admin:**
  - one page-header pattern: title, a one-line description, and the primary action on the right
  - a toast confirms every save, and failures show inline
  - empty states offer the primary action
  - destructive actions get a confirmation that names what depends on the item
  - loading states use skeletons
  - focus is visible, and the Admin can be used with the keyboard alone
- **Unsaved-changes guard** on every editor: Page, Layout, Theme, Brand and SEO.
  - Navigating away inside the Admin shows a Save / Discard / Stay dialog.
  - Closing or reloading the tab triggers the browser's `beforeunload` warning.
  - Build it once, as a shared hook or component.

**Acceptance for phase 1:**

- Three schemas migrate from zero, and each serves only its own content.
- The migration check fails when `"public".` is present.
- The Brand and SEO globals drive the Site. Robots, the sitemap and indexing behave as specified.
- Google Font import stores files and the Site serves them itself. Deleting an in-use Font is blocked (tested).
- The sidebar, Dashboard, lists, Brand, SEO and Fonts screens match this spec.
- The guard works for in-app navigation and for tab close.

---

## Phase 2: Theme tokens and the packages/ui rewire (ADR-0004)

### The Theme record

A `themes` collection (or global) with versions. It goes **live on save**. The history lists every version with the time, the author and a change summary. **Restore** puts an old version live again by saving it as a new version. There are no Drafts.

### Theme inputs

These are the controls. There is no per-token editing.

- **Colours:**
  - Primary
  - Accent
  - Third (optional)
  - Text (the ink)
  - Dark surface (defaults from the ink)
  - Neutral tint: Neutral / Warm / Cool / Brand
- **Fonts:** a heading font and a body font. Each is a built-in, an uploaded Font, or a Google Font added through Assets.
- **Type:**
  - Heading weight: Regular / Medium / Bold / Black
  - Heading case: Normal / UPPERCASE
- **Corners:**
  - Button corners: Square / Soft / Rounded / Pill
  - Card corners: Square / Soft / Rounded
- **Spacing:** Compact / Comfortable / Spacious.
- **Shadows:** None / Subtle / Lifted.
- **Buttons:**
  - Style: Solid / Outline
  - Letters: Normal / UPPERCASE / Title Case
  - Weight: Regular / Medium / Bold
- **Motion:** None / Subtle / Lively. This respects `prefers-reduced-motion`.
- **Presets** (fixed, in code):
  - Harbour, Terracotta, Classic, Meadow
  - one preset per Site brand: Warren Beach and Avada (from `research/brands/*/theme-preset.json`, adapted to the new inputs), and Beachside, described in Phase 6

### Tokens, in three tiers

1. **Brand inputs:** the controls above.
2. **Semantic tokens:** the shadcn set (`--background`, `--foreground`, `--primary`, … `--ring`), plus:
   - `--link`
   - `--surface-dark` and `--surface-dark-foreground`
   - `--third` and `--third-foreground`
   - `--radius`
   - `--font-sans` and `--font-display`
   - heading weight, case and tracking
   - shadows and durations
3. **Component tokens:**
   - `--btn-*`: radius, height, px, weight, transform, tracking, shadow, lift
   - `--card-radius` and `--card-shadow`
   - `--input-*`
   - `--section-y`

**Derivation rules:**

- Text-bearing colours are derived to pass AA automatically. This covers button text, link colour and muted text.
- The remaining failures produce **contrast warnings**. Each warning has a one-click suggested fix, and warnings never block saving.
- Tokens are structured so dark mode can be added later. Dark mode itself is not built.

### Rewiring packages/ui

- **Remove hardcoded look classes** from the components in `packages/ui` (for example `h-8`, `rounded-xl`, `hover:bg-primary/80`), so that they read component tokens.
- **The Site's Blocks** (`src/site/blocks`) read tokens only.
- **The Admin keeps its own neutral theme.** The component tokens have Admin defaults, so the Admin looks as it does today.

### Applying the Theme on the Site

- The layout emits the Theme's variables at `:root` (as `SiteFrame` does today), so portalled content (dialogs, sheets) is styled too.
- Fonts load through `@font-face`: built-in, uploaded, and Google-imported fonts are all self-hosted.

**Acceptance for phase 2:**

- **Tests** for:
  - token derivation, for each control
  - contrast warnings, including their suggested fixes
  - save / history / restore
  - the in-use Font lock
- **Rendering:**
  - a saved Theme renders on the Site exactly as previewed, including a dialog or sheet
  - restoring a version puts the Site back exactly (checked by comparing screenshots)
- **The four general presets and the two brand presets** each render a sample Page correctly.

---

## Phase 3: Layouts and region Blocks (ADR-0006)

- **A `layouts` collection:**
  - name
  - `header` (region Blocks)
  - `footer` (region Blocks, plus the allowed shared Blocks)
  - `paths` (a list of path prefixes)
  - `isDefault` (exactly one)
  - versions, with no Drafts, **live on save**, and history with restore
- **Resolving a Page's Layout:**
  1. If the Page picks a specific Layout, use it.
  2. If the Page picks "No Layout", render none.
  3. Otherwise, use the Layout whose path prefix is the longest match. `/stays` covers `/stays` and everything under it.
  4. Otherwise, use the default Layout.

  Unit tests must cover every case.

- **Page field:** `layout` with the modes `route` (the default), `specific` (a relationship), and `none`.
- **Header-only Blocks:**
  - **Logo:** from the Brand.
  - **Navigation:** menu items link to a Page (by relationship) or to a URL. There is one level of dropdowns, and a dropdown can be shown as mega-menu columns.
  - **Header actions:** phone number, button, login link.
  - **Utility strip.**
- **Footer-only Blocks:**
  - **Footer columns:** each column holds links, the address, opening hours or social links.
  - **Legal bar.**
- **Also allowed in the Footer:** Newsletter and Call to action.
- **Links follow Pages.** Navigation links to Pages follow path changes. Deleting a Page that a menu links to is blocked, and the error lists those menus.
- **Deleting Layouts:**
  - The default Layout can't be deleted.
  - Neither can a Layout that Pages pick explicitly; the error lists those Pages.
  - Path defaults simply drop.
- **Duplicate** and **"Make a new Layout from this one"** copy a Layout under a new name. The second also switches the current Page to the copy.
- **Migrating the chrome:** `SiteFrame`'s hardcoded header and footer become a seeded default Layout.

**Acceptance for phase 3:**

- **Tests:** resolution, delete protection, link-following, and live-on-save with restore.
- **Site:** the Site renders each Page with its resolved Layout.
- **Admin:** the Layouts list shows paths and usage.

---

## Phase 4: Block catalogue

Every Block renders from Theme tokens, has sensible defaults, and passes AA. It can take a background of Default, Muted, Primary or Dark surface where that makes sense. Each Block has a thumbnail for the Block picker.

**Page Blocks:**

| Block                     | Fields and options                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero (existing)           | Heading, subheading, image, CTA. **Plus:** eyebrow line, accent word (styled), optional fused trust strip                                                  |
| Search Hero               | A Hero with a visual-only booking search: dates, guests, location. Submitting shows a toast; nothing else happens.                                         |
| Rich text (existing)      | as today                                                                                                                                                   |
| Call to action (existing) | as today, plus the dark-surface background                                                                                                                 |
| Featured rentals          | Heading and a count. Renders fixture Rentals as cards, in a carousel or a grid.                                                                            |
| Large-group rentals       | Heading and a minimum sleeps. Renders fixture Rentals that sleep at least that many.                                                                       |
| Rental grid               | Fixture Rentals with filter chips (bedrooms, pets, location), sort, a grid and simple pagination. No map, no availability.                                 |
| Steps                     | 3–4 numbered steps, each with a title and text                                                                                                             |
| Features                  | A grid of icon, title and text (Lucide icons, picked by name)                                                                                              |
| Amenities                 | A **photo-tile mosaic** or an **icon list**                                                                                                                |
| Stats                     | 3–4 figures, each with a label                                                                                                                             |
| Image + text              | Image left or right, text, an optional **icon list**, an optional **caption**                                                                              |
| Testimonials              | Quote, name, **role line**, **star rating**; shown as a **carousel or grid**                                                                               |
| Trust strip               | Text or stat items, or a **partner-logo** variant                                                                                                          |
| Owner band                | Pitch, benefits, CTA (usually on the dark surface)                                                                                                         |
| Newsletter                | Heading, text, and a visual-only email form                                                                                                                |
| Blog teaser               | Fixture posts as 3 cards, each linking out                                                                                                                 |
| Location                  | Address, text, and a static map image or embed-free map card                                                                                               |
| FAQ                       | Question and answer pairs in an accordion. Emits `FAQPage` JSON-LD.                                                                                        |
| Form                      | A visual-only form with fields chosen from: name, email, phone, message, property address, dates. On submit it shows a success message and stores nothing. |

**Fixtures:**

- Each Site has its own module, `src/site/fixtures/<schema>.ts`, holding Rentals and blog posts. The Warren Beach and Avada data comes from `research/brands/*/rentals.fixture.json`.
- A Site with no fixtures renders the Rental Blocks empty, with a friendly message.
- Fixtures are not in the Admin.

**Acceptance for phase 4:**

- **Tests:** every Block renders from sample data. Rental Blocks select from fixtures correctly. FAQ outputs its JSON-LD.
- **Screenshots:** each Block under three presets, attached to the PR.

---

## Phase 5: The Visual Editor (ADR-0002, 0004, 0006)

**Routes:** `/admin/pages/[id]`, `/admin/layouts/[id]` and `/admin/theme` all open the Visual Editor. The form-based `PageEditor` is **removed**.

### Shell

- A dark top bar shows:
  - Back
  - the document name
  - a mode chip (Page / Layout / Theme)
  - "Used by N Pages" when a Layout is open
  - the **Ctrl-K** Page picker: a command dialog that searches Pages by title and path
  - Undo / Redo
  - Discard
  - Save and Publish for Pages, or Save for a Layout or the Theme ("Goes live on N Pages")
- The panel is **docked on the left**, with these tabs:
  - **Outline:** the Header, Page and Footer Block tree, with drag to reorder.
  - **Block:** the selected Block's settings.
  - **Page:** title, path, Layout mode (with "Make a new Layout from this one"), and SEO.
  - **History:** for Layouts and the Theme.
- **The canvas is an iframe** that renders the real Site route in an editing mode, so the breakpoints are real. Width toggles: desktop, tablet and mobile.

### Editing

- Hovering a Block outlines and labels it. Clicking selects it.
- Plain text (headings, short text, button labels) is edited in place. Rich text gets a floating toolbar: bold, italic, link, list.
- Everything else is edited in the Block tab.
- The selected Block has a toolbar: move up/down, duplicate, delete (undoable).
- A "+" between Blocks, and in the Outline, opens a searchable, grouped picker with thumbnails. In a Header or Footer it shows only the Blocks allowed there.

### Modes

- **Page mode:** Draft / Published / "Changes not published" chip. Save keeps the Draft, and Publish makes it live. The Layout is shown but locked; "Edit Layout" switches to Layout mode.
- **Layout mode:** the Page content is dimmed and locked. Save is live immediately. The panel includes the History tab.
- **Theme mode:** opened from Settings › Theme. The left panel holds:
  - the Theme controls: Presets, Colours, Fonts, Type, Corners, Spacing, Shadows, Buttons, Motion
  - contrast warnings, with one-click fixes
  - History

  Block editing is off. The unsaved Theme follows the Staff User across Pages through Ctrl-K until it is saved or discarded.

- **Keyboard shortcuts:** Ctrl-K (pick a Page), Ctrl-S (save), Ctrl-Z / Ctrl-Shift-Z (undo/redo), Esc (deselect), Delete (remove the Block).
- **Unsaved-changes guard:** uses the Phase 1 guard.

**Acceptance for phase 5:**

- **Instant preview:** changing a control or a field updates the canvas immediately, with no network round trip.
- **Page edits:** add, edit and reorder Blocks on a Page, publish it, and the Site matches.
- **Layout edits:** edit a Layout, and every Page using it changes on save. Restore works.
- **Theme mode:** preview across Pages, then save or discard.
- **Tests:** the guard works for in-app navigation and for tab close. The e2e smoke test covers this whole flow for one Site.

---

## Phase 6: Seed the three Sites

- **Scripts:** idempotent seeds, `pnpm site <slug> seed`. Each creates its schema, migrates it, and creates:
  - the Brand
  - SEO
  - the Theme (the brand preset)
  - Fonts
  - Media (the logo and photos)
  - Layouts (a default, plus others where the real site differs)
  - Pages
  - Navigation

  A second run must not duplicate anything.

- **Worktrees:** each Site gets its own worktree for local runs: `../pm-warren-beach`, `../pm-avada` and `../pm-beachside`, on `milestone/site-builder`, each with its env file. The script `pnpm sites:worktrees` creates them.
- **Warren Beach** (`warren_beach`):
  - Pages: Home, Rentals, Owners, Contact
  - Content: the real copy, logo and photos, from `research/brand-extraction`
  - Fonts: Source Sans 3, Lora and Work Sans, imported from Google Fonts
- **Avada Properties** (`avada`):
  - Pages: Home, Search, Owners, About, Contact
  - Colour: the AA primary `#ce4b25`
  - Font: Montserrat
  - **Hero photo:** don't use the Shutterstock image. Use another photo from the extraction.
- **Beachside Vacations** (`beachside`):
  - The invented brand from the map's Beachside Vacations brand ticket.
  - **Palette:**
    - Deep sea `#0E5E6F`
    - coral `#FF7F5C` (with ink text)
    - sand `#F2E3C9`
    - ink `#10323A`
    - dark surface `#0B2A31`
    - verify every pair against AA, and nudge any that fail
  - **Type and shape:**
    - Fraunces at weight 600 for headings, Nunito Sans for body
    - pill buttons and rounded cards
    - Spacious, Subtle shadows, Lively motion
  - **Wordmark:** an SVG half-sun over a wave line, drawn by the agent.
  - **Photos:** from Unsplash, with each attribution stored on the Media.
  - **Pages:**
    - Home: Search Hero, Featured rentals, Amenities, Testimonials, Newsletter
    - Rentals: Rental grid, FAQ
    - Owners: Hero, Steps, Stats, Owner band, FAQ, Form
    - Contact: Location, Form
  - **Fixtures:** 10 Rentals and 3 blog posts.
- **Fidelity:** Warren Beach and Avada must be **recognisable**. That means the same logo, palette, fonts, section order and copy, checked side by side with `research/brands/*/screenshots`. They don't need to match to the pixel. These demos are internal only.

**Acceptance for phase 6:**

- All three Sites run from their worktrees at the same time.
- A second seed run is a no-op.
- The Playwright smoke test passes per Site: Home renders, Admin sign-in works, and the editor saves and restores.
- Screenshot pairs (ours next to the real site) are attached to the PR.

## Phase 7: Audit

An Opus 5.5 audit runs against the three running Sites. It covers:

- the Admin and the public Site
- design and UX
- code quality and the standards in `AGENTS.md`
- accessibility (WCAG 2.2 AA)
- performance: Lighthouse-style checks on the Home pages
- fidelity to the real sites

It writes `apps/site/docs/audits/audit-<n>.md` with findings ranked by impact, and its top 10–15 findings become the next iteration's work.

## Improvement iterations 1–3

Each iteration:

1. takes the latest audit's top 10–15 findings
2. builds them as slices, through the same gates as the phases (see the runbook)
3. brings `pnpm check` and the acceptance suite back to green
4. ends with a fresh audit (`audit-<n+1>.md`), which seeds the next iteration

---

## Out of scope

- live TrackHS data, and real booking search
- storing or emailing form submissions
- Rentals or blog posts in the Admin
- Cloudflare deploys of the demo Sites
- dark mode, Theme or Layout Drafts, per-token editing, icon uploads
- pixel-perfect copies of the real sites, full sitemaps, public demos
- a cookie consent bar

## Definition of Done

The goal is complete when **all** of the following hold:

1. Phases 1–2 landed as merged checkpoint PRs, and Phases 3–6 landed slice by slice on `milestone/site-builder`. Every acceptance item above is covered by a passing acceptance test, or is listed in the final PR as carried forward.
2. **Three improvement iterations** each landed, and each has its audit report (`audit-1.md` to `audit-4.md`).
3. `pnpm check` is green on `milestone/site-builder`. The Playwright smoke test passes for all three Sites.
4. Warren Beach, Avada and Beachside Vacations run locally from their own worktrees and schemas, seeded idempotently. Warren Beach and Avada pass the side-by-side "recognisable" check, and Beachside matches its brand.
5. Every editor has the unsaved-changes guard: Page, Layout, Theme, Brand, SEO.
6. A final PR from `milestone/site-builder` into `development` is open for the user to merge. Its body links the checkpoint PRs and every audit, and lists every "Decisions made during the build".

---

## Runbook (how the goal runs)

One workflow, `.claude/workflows/site-builder.js`, runs Phases 3–7 and the iterations end to end. Args, all optional: `{ phases: [3, 4, 5, 6], iterations: 3 }`. Phases 1 and 2 were built with an earlier per-phase workflow (PRs #48 and #49).

1. **Plan and acceptance, side by side.**
   - An Opus lead cuts the remaining phases into 25–40 small slices (one screen, one Block, one behaviour). Each slice lists the slices it must come `after`.
   - One Opus agent per phase writes that phase's browser acceptance suite from this spec, under `apps/site/e2e/<n>-<slug>/`. The suite is red until the slices land, and it sits outside `pnpm check`.
2. **Build, as a dependency graph.** A slice starts as soon as the slices it comes after have landed. There are no waves and no phase gates. Each slice goes through:
   1. a Sonnet 5.5 coder in its own worktree, test-first, who makes the acceptance tests it covers pass
   2. an Opus review of the diff only, which also rules on the coder's open decisions
   3. a land step that fixes blocking findings, rebases and pushes onto `milestone/site-builder`
3. **Stabilise.** `pnpm check` and the whole acceptance suite must be green on the branch. Up to 3 fix rounds.
4. **Audit and iterate.** Audit 1 is Phase 7. Each iteration turns the latest audit's top findings into slices, builds them the same way, stabilises, and audits again.
5. **Ship.** The final PR into `development` is opened and left for the user.

- **The gates** are the acceptance tests and the audits. There is no per-phase UX review: the audit is the first full look at the running Sites.
- **Never stop early.** A slice that fails to land is logged and carried into iteration 1. Anything still red after stabilising is listed in the final PR.
- **Resumable:** relaunch with the run's id and finished agents are not repeated.
