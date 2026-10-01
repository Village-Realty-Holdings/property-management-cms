# Audit 1: the Site Builder after Phases 3–6 (Phase 7)

The first look at the whole build running. It covers the Admin, the Visual Editor and the three public Sites: design and UX (for Staff Users who are not designers), code quality against `AGENTS.md` and the ADRs, WCAG 2.2 AA, Home page performance, fidelity to the real Warren Beach and Avada sites, Beachside against its brand, and every "Acceptance for phase" item in the spec.

- **Commit audited:** `48d4fcc` (`origin/milestone/site-builder`, 30 Sep 2026)
- **Screenshots:** `docs/screenshots/audit-1/`
- **The user's own notes** (`user-notes-1.md`) are already iteration-1 work. Findings here that overlap them say so and don't repeat them.

## How it was run

- **Database:** a scratch database, `ms_audit1`, with the Sites' real schemas (`warren_beach`, `avada`, `beachside`). The real schema names matter because the Rental fixtures are looked up by schema name: under an `ms_` schema the Rental Blocks render empty. The database was dropped afterwards.
- **Seeding:** `pnpm site <slug> seed` once per Site, then a second time. The second run said "Nothing to change: already seeded" for all three.
- **Dev servers:** `pnpm site <slug> dev` on ports 3001–3003, all three at once, from the audited commit. They ran from one checkout with a dist dir per Site (a local, uncommitted `distDir` override), not from `../pm-*`: those worktrees already existed and belong to the user, so they were left alone.
- **Driving the app:** headless Chromium through playwright-core, signed in with `/auth/dev`. The run covered:
  - every Admin screen, at 1440 px and at 390 px
  - the Visual Editor in all three modes: hover, select, edit in place, undo, the Block picker, Ctrl-K, the width toggles, the guard, and a publish round trip that was then reverted
  - every public Page at 1440 and 390 px, the menus by keyboard, and the mobile sheet
- **Accessibility:** axe-core 4.13 with the WCAG 2.0/2.1/2.2 A and AA tags plus best-practice. It ran on 26 public Page and viewport pairs and on 8 Admin screens on every Site, plus the narrow Admin. The menus, focus visibility and reduced motion were checked by hand.
- **Performance:** a production build (`next build`, then `next start` on 3011–3013), measured on Home with Lighthouse-like throttling over CDP. Mobile was 412 px wide with 150 ms RTT, 1.6 Mbps down and 4× CPU. Desktop was unthrottled CPU on a fast network. Lighthouse itself is not installed, so these are the same metrics read from the browser.

## Summary

The build is in good shape for a first look:

- The three Sites run side by side, seed idempotently, and are recognisable.
- axe finds almost nothing.
- Theme mode is impressive: presets and controls restyle the canvas instantly, and the guard works.
- Publishing round-trips to the Site.

The biggest problems are in the editor's data path and in mobile layout:

- **The Visual Editor's canvas drops every image and every Page link.** This is one root cause that shows up in several places (finding 1).
- **The Media delete dialog says images are unused when they are on Home** (finding 2).
- **On phones, the header takes a quarter of the screen and pushes the Hero below the fold** (finding 3).

## Ranked findings

Impact ranks how badly a finding hurts a Staff User or a visitor, and how many of them. Effort: **S** is under half a day, **M** is one to two days, **L** is more.

### 1. The Visual Editor's canvas drops every Media image and every menu link to a Page

- **Evidence:**
  - In Page mode, Warren Beach Home's Search Hero shows a flat blue panel where the Site shows the beach photo (`01-canvas-drops-images-vs-site.jpg`). The Amenities tiles and every other image are missing too.
  - In Layout mode, Avada's Navigation renders nothing: all its items link to Pages (`02-layout-mode-drops-page-links-vs-site.jpg`).
  - Warren Beach's Navigation shows only "Emerald Coast Guide", the one item whose links are URLs (`02b-layout-mode-wb-navigation.jpg`).
  - Theme mode is fine, because it reads populated documents.
- **Where:**
  - The editor holds Pages and Layouts at depth 0, with Media and Pages as ids (`src/admin/editor/modes/pageDocument.ts`).
  - It casts them to the populated Block types when it posts them to the canvas: `src/admin/editor/bridge.ts:155,164-165` and `src/admin/editor/modes/PageMode.tsx:176-177` (`as unknown as PageBlock[]`).
  - The renderers then drop the ids: `imageOf()` in `src/site/brand.ts:26` returns null for a number, and `hrefOf()` in `src/site/regions/links.ts:23` returns null for a Page id.
- **Why it matters:** this breaks ADR-0002's promise that Blocks render the same way in the Visual Editor and on the Site, and the spec's instant-preview rule. Staff Users editing a Layout see a broken header, and may "fix" it.
- **Overlap:** this extends user note 4 ("a picked image doesn't render live"). It is the root cause, and it also covers stored images and Page links.
- **Suggested fix:**
  - Give the canvas a lookup: Media by id (url, alt, size) and Pages by id (path, title). Send it with the document, or load it once on the canvas from the Local API as the Staff User.
  - Resolve ids through the lookup in `imageOf` and `hrefOf`, or in a single `resolveForCanvas(doc, lookup)` step before render.
  - Replace the `as unknown as` casts with a real "depth-0 Block" type, so the compiler catches this.
  - Add an e2e check that the canvas Hero `<img>` and the Navigation items match the public Site.
- **Effort:** M

### 2. The Media delete dialog says an image is unused when Pages show it

- **Evidence:**
  - On Beachside › Media, deleting `amenity-pool.webp` or `amenity-lounge.webp` says "Nothing else uses it", yet both are Amenities tiles on Home (`03-media-delete-says-unused.jpg`).
  - Deleting `hero-shoreline-dawn.webp` lists only "Home (SEO image)" and the SEO share image. It misses that it is Home's Search Hero photo.
- **Where:** `src/admin/usage.ts:56-64` only looks at a `hero` Block's `image` and a Page's SEO image. It doesn't look at Search Hero, Amenities, Image + text, Owner band, Location, Trust strip logos or Testimonials, nor at Blocks inside Layouts.
- **Why it matters:** a Staff User trusts the dialog, deletes the image, and the live Home page loses its photos. This breaks the spec's UX rule that destructive actions name what depends on the item.
- **Suggested fix:**
  - Walk every Block's upload fields generically from the Block configs (`src/blocks/catalogue.ts`), in Pages, both Drafts and Published, and in Layouts.
  - Block the delete of an image that is in use, the same way in-use Fonts are blocked, and list each use with a link that opens the Visual Editor on that Block.
  - Add a unit test per Block that has an upload field.
- **Effort:** S–M

### 3. On phones, the header wraps into two or three rows and the Hero starts below the fold

- **Evidence:**
  - At 390 px the header is 217 px tall on Avada (logo, then Menu, then phone and Contact Us, each on its own row) and 145 px on Warren Beach and Beachside.
  - Avada's H1 starts at y = 580 of 844, and the search form is off-screen (`04-mobile-header-and-hero.jpg`).
  - On top of the header, the Hero adds `pt-[calc(var(--section-y)*3.2)]`, which is about 300–430 px of empty sky before the eyebrow.
- **Where:**
  - The header region layout is in `src/site/LayoutFrame.tsx` and `src/site/regions/*`. The Logo, Navigation and Header actions Blocks each take a full row when they wrap.
  - The Hero padding is in `src/site/blocks/HeroShell.tsx:109`.
- **Suggested fix:**
  - Below `md`, put the header on one row: the logo on the left, and on the right a phone icon button and the Menu button.
  - Move the Header actions' CTA, phone and login into the menu sheet, or show them as icon buttons.
  - Cap the Hero's top padding on small screens. For example, `min-h-[min(100svh-header,40rem)]` with content aligned to the end, and no 3.2× `--section-y` below `sm`.
- **Effort:** S–M

### 4. Public pages download the Visual Editor (Lexical) for every visitor

- **Evidence:**
  - In the production build, Avada Home loads 19 scripts, about 406 KB gzipped.
  - Three of them are Lexical editor chunks, about 107 KB gzipped. `266fnc4abk6qw.js` contains `LexicalComposer`, `createEditor` and `$getRoot`.
  - Visitors never edit. Mobile Total Blocking Time is low (about 45 ms), but this is download and parse cost on every first visit.
- **Where:** `src/app/(site)/[[...path]]/page.tsx` imports `EditingPage`, which imports `EditorCanvas`, a client component, and the editing Blocks: `src/site/blocks/RichTextBlock.tsx` imports `RichTextEditing`. The public route's client manifest therefore carries the editor.
- **Suggested fix:**
  - Serve the canvas from its own route segment (for example `/(canvas)/__edit/[[...path]]`, still behind the Staff session check) so the public route never imports editing code.
  - Or load `EditorCanvas` and `RichTextEditing` with `next/dynamic` only when `editing` is true.
  - Add a size check, such as a test over the build manifest, that fails if `lexical` appears in the public route's chunks.
- **Effort:** M

### 5. The Hero's accent-word highlight cuts off the line above it

- **Evidence:** on Beachside, the coral box over "by the sea" covers the descender of the "y" in "your". On Avada, the "Mountain" box clips "your", and the "Smoky" box clips its own "y" (`05-accent-word-clips-descenders.jpg`). These are the first words a visitor reads.
- **Where:** `src/site/blocks/HeroShell.tsx:33` (a `bg-accent box-decoration-clone` span) together with `leading-[0.95]` on the heading at line 135.
- **Suggested fix:**
  - Give the heading more leading when it has an accent word (about 1.1).
  - Or draw the highlight lower and behind the text, for example `background: linear-gradient(transparent 55%, var(--accent) 0)`, with `position: relative; z-index: -1` so it sits under the glyphs.
  - Or style the accent as a colour or underline, as the real Avada site does ("SMOKY MOUNTAIN" in orange).
- **Effort:** S

### 6. The desktop navigation wraps onto two lines between 768 and 1279 px

- **Evidence:**
  - On Warren Beach at 1024 px, "About Us" and "Property Management" drop to a second line (`06-nav-wraps-at-1024.jpg`). The header grows from 89 to 109 px.
  - The Visual Editor's "desktop" canvas is 1120 px wide at a 1440 px screen, so Staff Users always see the wrapped header.
  - The same happens on Avada at 768–1024 px.
- **Where:** `src/site/regions/NavigationMenu.tsx:86`: the inline menu shows from `md` (768 px) with `flex-wrap`.
- **Suggested fix:**
  - Switch between the inline menu and the Menu button with a container query on the header's width (`@container`), not the viewport.
  - Drop `flex-wrap`.
  - If the items don't fit, fall back to the Menu button.
- **Effort:** S

### 7. Pages that don't start with a Hero have no H1

- **Evidence:**
  - axe reports `page-has-heading-one` on Beachside Rentals and Contact, at both widths.
  - Their first heading is an H2 ("All our beach homes", and Location's heading) (`13-beachside-rentals-no-h1-sort-truncated.jpg`).
  - Any Page a Staff User starts with a Rental grid, Location, Form or Rich text has the same problem.
- **Where:** every Block except Hero and Search Hero hard-codes `h2` (for example `src/site/blocks/RentalGridBlock.tsx` and `LocationBlock.tsx`, through `BlockSection`).
- **Suggested fix:** pass a heading level through the Block context: the first Block on a Page renders its heading as `h1`, and the rest as `h2`. Hero already gets `first`, so generalise that. Add a test that every seeded Page has exactly one H1.
- **Effort:** S

### 8. Block buttons use the Accent colour, so CTAs are off-brand and inconsistent

- **Evidence:**
  - On Avada, the header's "Contact Us" button is the brand orange `#ce4b25` (Primary). Every Block CTA ("Search", "Request A Free Rental Projection", "Subscribe") is the Accent `#b45309`, a brown amber that the real site never uses (`08-avada-home-ours-vs-real.jpg`).
  - On Warren Beach, every CTA is cyan `#009dd6` with navy text. The real site uses white text on navy or blue buttons (`09-warren-beach-owners-ours-vs-real.jpg`).
  - On Beachside, "Search homes" is coral and "Subscribe" is deep sea: two different button colours on one page.
- **Where:** `src/site/blocks/BlockButton.tsx:70` defaults to `tone = "accent"`. Hero, CTA, Blog teaser and Newsletter use it, while `HeaderActions` uses Primary. The Avada preset's accent is in `src/theme/presets.ts`.
- **Suggested fix:**
  - Make Primary the default for a Block's main action, and use Accent only for secondary emphasis or on a primary panel (`onAccent`).
  - Set the Avada preset's Accent to a brand orange that passes AA with white text, or with ink, and don't use an amber that isn't in the brand.
  - Re-check the Warren Beach button text: white on `#0071ce` passes AA.
- **Effort:** S

### 9. Warren Beach drifts from the real site in ways a visitor would notice

- **Evidence** (`07-warren-beach-home-ours-vs-real.jpg`, `09-warren-beach-owners-ours-vs-real.jpg`):
  - **Hero:** a dark ink gradient turns the bright turquoise beach photo navy-purple. The real one is bright and untinted, with a centred, smaller heading.
  - **Section headings:** ink `#1f1646`. On the real site they are brand blue.
  - **Fonts:** Lora (the Owners page's uppercase serif headings) and Work Sans (the Owners body text) are imported but unused. The Theme takes one heading font and one body font, and both are Source Sans 3.
  - **"Vacations are better together":** a grid of all 10 large-group Rentals, about 1,600 px tall. The real site shows a 3-up carousel with "View More".
  - **Footer:** no logo, no bold blue column headings, and social links as the plain words "facebook" and "instagram". The real footer has logo, headings and icon buttons.
  - **Logo:** the WEBP has a white box that shows on the off-white (`#f8fafc`) header.
  - **Owners page:** the Owner band and the Newsletter are both solid primary blue and run together into one 600 px slab.
- **Where:** `src/seed/warren_beach.ts`, the Warren Beach preset in `src/theme/presets.ts`, the Hero overlay in `HeroShell.tsx`, and `src/site/regions/FooterColumns.tsx`.
- **Suggested fix:**
  - Add a Hero "overlay" option (None, Light or Dark), and seed None or Light for Warren Beach.
  - Add a Theme option "Headings in the primary colour".
  - Seed the Large-group rentals Block as a carousel.
  - Have the Footer columns social links render icons, and add an optional logo to the Footer.
  - Use the transparent logo, or set the header to white.
  - Seed a muted background on the Newsletter when it follows a primary panel.
- **Effort:** M

### 10. Spacing is too loose: Pages are 40–50% taller than the sites they copy

- **Evidence:**
  - At 1440 px, Avada Home is 6,862 px against the real site's 4,807 (same sections), and Avada Owners is 9,619 against 6,503. Warren Beach Home is 5,077 against 2,933.
  - Spacious gives `--section-y` = 134 px, top and bottom, on every section.
  - The Hero's top padding is 3.2× that.
  - Avada Search's intro has about 250 px of empty band before "Browse Vacation Rentals" (`15-avada-search-ours-vs-real.jpg`).
  - Avada's Trust strip, which is fused to the Hero's foot on the real site, sits in its own padded section.
- **Where:** the `spacing` scale in `src/theme/derive.ts:126` and `BlockSection`'s padding.
- **Suggested fix:**
  - Scale section padding with the viewport (for example `clamp(3rem, 6vw, var(--section-y))`).
  - Halve the padding between two sections with the same background.
  - Give Search Hero the fused trust strip the Hero already has (Avada Owners uses it), and seed Avada Home's trust items into it instead of a separate Trust strip Block.
- **Effort:** S

### 11. Avada's header never says "Avada Properties"

- **Evidence:** the header shows the 45 px hexagon badge and the grey tagline "Smoky Mountain Vacation Rentals", but not the name. The real site shows the badge with "AVADA PROPERTIES" beside it (`08-avada-home-ours-vs-real.jpg`).
- **Where:** `src/site/regions/Logo.tsx`: the Logo renders the image _or_ the name, never both.
- **Suggested fix:** add a Logo Block option, "Show the Site name beside the logo", and seed it on for Avada. Keep the image's alt text short ("Avada Properties"). Today the link's accessible name is the whole image description: "Avada Properties: a hexagon badge with a sunset over mountain ridges".
- **Effort:** S

### 12. Admin times are in UTC, so Staff Users see tomorrow's date

- **Evidence:** at 18:33 local time on 30 Sep, the Dashboard, the Pages and Layouts lists and the History tabs all say "Oct 1, 2026, 1:33 AM" (`11-admin-dashboard.jpg`). Only the History tab adds "UTC".
- **Where:** `src/admin/dashboard/UpdatedAt.tsx` formats with `timeZone: "UTC"` "so the server and the browser agree".
- **Suggested fix:** render the time on the client in the browser's time zone. Use a small client component with `suppressHydrationWarning`, or render the relative time ("2 hours ago") with the absolute time in `title`.
- **Effort:** S

### 13. Layout mode previews another Page, and selecting from the Outline doesn't move the canvas

- **Evidence:**
  - Choosing "Edit Layout" from Warren Beach Home opens Layout mode on Contact, so the Staff User loses the Page they were looking at. This is also shown in finding 1's screenshot.
  - Picking "Amenities" in the Outline selects it, but the canvas stays on the Hero. The user has to scroll to find the Block they picked.
- **Where:** the "Edit Layout" link in `src/admin/editor/modes/PageMode.tsx`, and the preview Page choice in `src/admin/editor/modes/LayoutMode.tsx`. The selection is sent over the bridge in `src/admin/editor/bridge.ts` and `src/site/editing/overlay.tsx`.
- **Suggested fix:**
  - Pass the current Page with "Edit Layout" (`?page=<id>`) and preview that Page.
  - On selection from the panel, have the canvas `scrollIntoView({ block: "center" })` the Block.
- **Effort:** S

### 14. The Admin offers deletes it can't perform

- **Evidence:**
  - The Default Layout's row has an enabled Delete button.
  - Its dialog says "This is the default Layout, so it can't be deleted…" and still offers a red "Delete Layout" button (`12-delete-default-layout-dialog.jpg`).
- **Where:** `src/admin/dashboard/LayoutRowActions.tsx`.
- **Suggested fix:**
  - Disable Delete for the default Layout and for Layouts that Pages pick, with a tooltip that gives the reason.
  - When the dialog can only explain, give it a single "OK" button.
  - Apply the same pattern to in-use Media once finding 2 lands.
- **Effort:** S

### 15. Images aren't responsive: phones download desktop-sized originals

- **Evidence:**
  - `images: { unoptimized: true }`, and no Payload `imageSizes`, so every image is the original upload. The heroes are 1,800–2,000 px wide; Beachside's `rental-villa-marisol.webp` is 214 KB. None has a `srcset`.
  - Desktop Home downloads 0.5–1.0 MB of images.
  - Mobile LCP (production, throttled) is 2.7 s on Warren Beach, which needs improvement, and 2.2–2.3 s on Avada and Beachside.
  - Next warns that the Rental grid's first card is the LCP image yet `loading="lazy"` (Avada Search, Beachside Rentals at 390 px).
- **Where:** `next.config.ts` (`images.unoptimized`), `src/collections/Media.ts` (no `imageSizes`), and the image components in `src/site/blocks/*`.
- **Suggested fix:**
  - Add Payload `imageSizes` (for example 480, 960, 1600 wide, as WEBP) and render `srcset` and `sizes`. A custom Next image loader that maps to those sizes keeps this Workers-friendly.
  - Make the first Rental card eager when its Block is first on the Page.
- **Effort:** M

### 16. Beachside headings are weight 700, not the brand's Fraunces 600

- **Evidence:** computed `font-weight: 700` on every Beachside heading. The spec says "Fraunces at weight 600". The Heading weight control offers Regular, Medium, Bold and Black, and Bold maps to 700. The 600 file is downloaded and unused.
- **Where:** `src/theme/derive.ts` (the weight map), and the Beachside preset.
- **Suggested fix:** add "Semibold" (600) to Heading weight, set the Beachside preset to it, and reseed.
- **Effort:** S

### 17. The sign-in page doesn't say which Site it is for

- **Evidence:** three Sites run side by side on 3001–3003, and each sign-in page reads only "Sign in to the Admin", with no logo, name or schema.
- **Where:** `src/app/(admin)/admin/sign-in/page.tsx`.
- **Suggested fix:** show the Brand's logo and name, and the schema badge the sidebar uses.
- **Effort:** S

### 18. The Admin sidebar logo is unreadable and the Site name is truncated

- **Evidence:** wide logos are squeezed into a 28 px square: Warren Beach's wordmark becomes a grey smudge. The name is cut to "Warren Beach …" (`11-admin-dashboard.jpg`).
- **Where:** `src/admin/components/AdminSidebar.tsx`.
- **Suggested fix:**
  - Fit the logo inside a 28 × 96 px box with `object-contain`, or use the Brand's square icon when the SEO favicon exists.
  - Let the name wrap to two lines.
- **Effort:** S

### 19. There is no skip link before the menus

- **Evidence:** keyboard users tab through the logo, up to six menu triggers and the header actions before reaching the content. No Site page has a skip link. Landmarks exist (`header`, `nav`, `main`, `footer`), so WCAG 2.4.1 is met, but a skip link is the expected pattern with mega menus.
- **Where:** `src/site/LayoutFrame.tsx`.
- **Suggested fix:** add a visually hidden "Skip to content" link that shows on focus and targets `<main id="content">`.
- **Effort:** S

### 20. The Rental grid's Sort control is truncated

- **Evidence:** the select reads "Name (A t" and its label wraps to "Sort / by" at 1440 px (`13-beachside-rentals-no-h1-sort-truncated.jpg`).
- **Where:** `src/site/blocks/rentals/RentalGridBrowser.tsx`.
- **Suggested fix:** give the select `min-w-44`, and keep the label on one line (`whitespace-nowrap`).
- **Effort:** S

### Lower-impact findings

| #   | Title                                                 | Evidence and where                                                                                                                                                                                                       | Suggested fix                                                                                                                  | Effort |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 21  | Avada and Beachside have no favicon                   | `GET /favicon.ico` 404 on both. Their seeds set no SEO favicon (`src/seed/avada.ts`, `beachside.ts`).                                                                                                                    | Seed the badge and the half-sun mark as favicons. Serve a default from the Brand logo when SEO has none.                       | S      |
| 22  | `/p-admin` is still deployed                          | The production build serves Payload's admin at `/p-admin` (200). ADR-0002 says it goes once the Admin covers Pages, Layouts, Media, Brand, SEO and Theme, which it now does.                                             | Remove the `(payload)/p-admin` route and its import map. Keep `/api`.                                                          | S      |
| 23  | Test databases leak                                   | 84 `pm_test_*` databases sit on the dev Postgres. `getTestPayload` drops its database only in `teardown`, so a run that is killed or times out leaks it (`src/test/getTestPayload.ts:57`).                               | Add a vitest `globalSetup` that drops `pm_test_*` databases older than an hour, and name them with a timestamp.                | S      |
| 24  | Loading skeletons only on Settings                    | `loading.tsx` exists for Brand, SEO and Fonts only. Dashboard, Pages, Layouts and Media show nothing while loading (1–2 s in dev). The spec says "loading states use skeletons".                                         | Add `loading.tsx` skeletons for the four.                                                                                      | S      |
| 25  | List wording differs from the spec                    | The Pages list's Layout column says "Default (default)". The spec's form is "Listings, via /stays", "No Layout". The Dashboard Theme card says "View Theme"; the spec says "Edit Theme".                                 | Render "Default, the default" or "Listings, via /stays". Rename the action.                                                    | S      |
| 26  | Media screen crops logos and has no search            | Logos are cut by `object-cover` ("WARREN BI / DESTIN"). The upload form takes the top third of the page.                                                                                                                 | `object-contain` on a checkerboard for SVG and PNG. Collapse Upload into the header button. Search and filter are user note 1. | S      |
| 27  | Other Sites' brand presets are offered everywhere     | Avada's Theme lists "Warren Beach" and "Beachside" presets (`src/theme/presets.ts`).                                                                                                                                     | Show only the current Site's brand preset (by schema) beside the general four. Keep the rest for tests.                        | S      |
| 28  | Footer feature links ignore their filter              | "Pet Friendly", "Heated Pool" and "Hot Tub" in Warren Beach's footer and mega menu all go to `/rentals` with no filter applied. The Rental grid's chips can't be set from the URL.                                       | Read `?bedrooms=&pets=&location=` in `RentalGridBrowser`, and link the menus with them.                                        | M      |
| 29  | Unsplash attribution is stored but shown nowhere      | Beachside Media carry `credit` and `attribution`, but neither the Site nor the Media screen shows them.                                                                                                                  | Show the credit under the Media card. Optionally add a "Photo credits" line to the Legal bar.                                  | S      |
| 30  | Eight migrations, not "one schema-agnostic migration" | `src/migrations` has 8 genericized files. They are correct (the check passes), but they drift from the spec's single migration.                                                                                          | Either squash them before the final PR or update the spec and ADR-0005 to say "genericized migrations".                        | S      |
| 31  | Scratch schemas get no Rentals                        | `fixturesFor(siteSchema())` keys by schema name, so `ms_*` schemas (which tests and `SEED_SITE` use) render the Rental Blocks empty. That makes audits and e2e less realistic.                                           | Let `SEED_SITE` (or a `FIXTURES_SITE` env) pick the fixtures too.                                                              | S      |
| 32  | Tailwind scans all of `apps/**`                       | `packages/ui/src/styles/globals.css:75` uses `@source "../../../apps/**/*.{ts,tsx}"`, which includes apps/cms and any build output that isn't gitignored. A dist dir outside `.next` produced CSS parse errors and 500s. | Point `@source` at `apps/site/src` and `packages/ui/src` only.                                                                 | S      |

## Accessibility (WCAG 2.2 AA)

- **axe:** 0 violations on every Admin screen on all three Sites, at 1440 px and at 390 px.
- **On the Site:** 0 violations except `page-has-heading-one` on Beachside Rentals and Contact (finding 7). Colour contrast passes on all three Themes, including Beachside's coral with ink text.
- **Keyboard:**
  - Header menus open with Enter. Escape closes them and returns focus to the trigger.
  - The mobile menu sheet takes focus, and Escape returns focus to the Menu button.
  - Focus is visible: a 2 px outline on links and a ring on form controls and buttons.
- **Reduced motion:** honoured. `--duration` drops from 300 ms to 0 ms, and the button lift is removed.
- **Target size (2.5.8):** footer and contact links are 18–23 px tall. They pass through the spacing exception, because they are stacked with gaps. Raising them to 24 px would remove the doubt.
- **Gaps:**
  - no H1 on some Pages (finding 7)
  - no skip link (finding 19)
  - an over-long accessible name on the logo link (finding 11)
  - the Visual Editor's canvas iframe is titled "Home as visitors see it", which is good, but in Page mode it lacks the images it claims to show (finding 1)

## Performance (Home, production build)

| Site         | Profile         | TTFB   | FCP    | LCP    | CLS   | TBT   | JS (gzip) | Images |
| ------------ | --------------- | ------ | ------ | ------ | ----- | ----- | --------- | ------ |
| Warren Beach | mobile, slow 4G | 241 ms | 1.06 s | 2.73 s | 0     | 41 ms | 354 KB    | 284 KB |
| Avada        | mobile, slow 4G | 247 ms | 1.03 s | 2.20 s | 0.075 | 43 ms | 354 KB    | 75 KB  |
| Beachside    | mobile, slow 4G | 240 ms | 1.02 s | 2.33 s | 0.007 | 47 ms | 354 KB    | 306 KB |
| Warren Beach | desktop         | 160 ms | 320 ms | 544 ms | 0.009 | 0     | 354 KB    | 960 KB |
| Avada        | desktop         | 173 ms | 352 ms | 472 ms | 0.011 | 0     | 354 KB    | 529 KB |
| Beachside    | desktop         | 158 ms | 332 ms | 496 ms | 0.001 | 0     | 354 KB    | 852 KB |

- **What's good:**
  - HTML is about 20–28 KB gzipped.
  - Fonts are self-hosted, with no third-party requests.
  - The Hero image and the logo are preloaded.
  - CLS is low.
- **What to fix:**
  - the editor's JS on public pages (finding 4)
  - non-responsive images (finding 15)
- **Caching:** every request reads the Theme, Brand, SEO, Layouts and the Page from Postgres (`connection()` in the layout, with no cache). That is fine locally, at 70–90 ms TTFB once warm. Worth a `cacheTag` and `revalidateTag` on save before the Workers deploy.

## Fidelity

- **Warren Beach: recognisable, with drift.**
  - Recognisable from the same logo, nav labels and mega menu, copy, section order (Search Hero → Featured → Amenities mosaic → Large-group → Newsletter) and blue palette.
  - Drifts in the Hero tint, ink headings, button colours, the unused Lora and Work Sans, the large-group grid, and the footer (finding 9).
  - Owners swaps the real split hero-and-form for a full-bleed Hero followed by the form (`09-…`).
- **Avada: recognisable.**
  - Section order on Home and Owners matches the real pages closely (`08-…`), with the right copy, the Montserrat font and the orange-on-dark Owner band.
  - Misses: the name in the header (finding 11), the off-brand brown CTAs (finding 8), the trust strip not fused to the Hero, missing eyebrows ("CURATED PICKS", "SIMPLE PROCESS"), the uppercase orange accent in the Hero, and much looser spacing (finding 10).
  - The Search page has no map, which is out of scope.
- **Beachside: matches its brand.**
  - Deep sea, coral with ink text, sand, the ink and the dark surface are all used.
  - Fraunces and Nunito Sans, pill buttons, rounded cards, Spacious spacing, Subtle shadows and Lively motion.
  - The half-sun wordmark, and the Pages exactly as specified (`10-beachside-home.jpg`).
  - Misses: headings at 700 rather than 600 (finding 16), no favicon (finding 21), and the accent-box clipping on Home (finding 5).

## Acceptance items

Each item is **Pass** (seen working in this audit), **Covered** (an acceptance spec exists and wasn't re-run here: no browser test files were named for this task), or **Gap**.

**Phase 1**

| Item                                                       | Status  | Notes                                                                                                                                                                          |
| ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Three schemas migrate from zero, each serves only its own  | Pass    | Seeded `warren_beach`, `avada` and `beachside` from zero in one database. Each Site served only its own Pages, Brand and Theme.                                                |
| Migration check fails on `"public".`                       | Covered | `scripts/check-migrations.test.ts` runs in `pnpm check`.                                                                                                                       |
| Brand and SEO drive the Site; robots, sitemap, indexing    | Pass    | `noindex, nofollow`, `Disallow: /` and an empty sitemap with indexing off. Title pattern, OG and Twitter tags come from SEO. The favicon is missing on two seeds (finding 21). |
| Google Font import self-hosted; in-use Font delete blocked | Pass    | No requests leave the Site. Fonts come from `/api/font-files/...`. The Fonts screen locks Source Sans 3 and names its uses.                                                    |
| Sidebar, Dashboard, lists, Brand, SEO, Fonts match spec    | Partial | Matches except the wording (25), the skeletons (24) and the default-Layout delete (14).                                                                                        |
| Guard for in-app navigation and tab close                  | Pass    | In-app: Save / Discard / Stay seen on Brand, Page and Theme. Tab close is covered by `e2e/5-visual-editor/unsaved-guard.e2e.ts`.                                               |

**Phase 2**

| Item                                                                  | Status  | Notes                                                                                                                                    |
| --------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tests: derivation, contrast warnings, save/history/restore, Font lock | Covered | Unit tests in `src/theme/**` and `src/fonts/**`.                                                                                         |
| Saved Theme renders as previewed, incl. a dialog or sheet             | Covered | `e2e/theme/renders-as-previewed.e2e.ts`. Seen live: choosing the Terracotta preset restyled the canvas at once, with no reload (`14-…`). |
| Restore puts the Site back exactly                                    | Covered | `e2e/theme/restore.e2e.ts`                                                                                                               |
| The 4 general and 2 brand presets render a sample Page                | Covered | `e2e/theme/presets-render.e2e.ts`                                                                                                        |

**Phase 3**

| Item                                                          | Status  | Notes                                                                   |
| ------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| Tests: resolution, delete protection, link-following, restore | Covered | `src/layouts/*.test.ts` and `e2e/3-layouts/*`                           |
| The Site renders each Page with its resolved Layout           | Pass    |                                                                         |
| The Layouts list shows paths and usage                        | Pass    | "Default · No paths · Used by 4 Pages". Delete is wrongly enabled (14). |

**Phase 4**

| Item                                                                     | Status | Notes                                                                                       |
| ------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------- |
| Every Block renders from sample data; Rentals from fixtures; FAQ JSON-LD | Pass   | `FAQPage` JSON-LD seen on Beachside Rentals. The fixture Rentals render on all three Sites. |
| Screenshots of each Block under three presets                            | Pass   | `docs/screenshots/4-blocks`                                                                 |

**Phase 5**

| Item                                                          | Status         | Notes                                                                                                                                                          |
| ------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instant preview with no network round trip                    | **Gap**        | Works for text and Theme controls. Images and Page links never render in Page or Layout mode (finding 1).                                                      |
| Page edits: add, edit, reorder, publish, and the Site matches | Pass (partial) | Edited the Beachside Owners H1 in place, published it, saw it on `/owners`, then reverted and republished. Add and reorder are covered by `page-edits.e2e.ts`. |
| Layout edits: every Page changes on save; restore             | Covered        | `layout-edits.e2e.ts`. The canvas misrenders the Layout being edited (finding 1).                                                                              |
| Theme mode: preview across Pages, then save or discard        | Pass (partial) | Preview, Discard and the guard were seen. Ctrl-K across Pages is covered by `theme-mode.e2e.ts`.                                                               |
| Guard and the e2e smoke for one Site                          | Covered        | `unsaved-guard.e2e.ts` and `smoke.e2e.ts`                                                                                                                      |

**Phase 6**

| Item                                                    | Status          | Notes                                                                                                                      |
| ------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| All three Sites run at the same time                    | Pass            | Ran together on 3001–3003. The `../pm-*` worktrees exist, but this audit ran from its own checkout (see "How it was run"). |
| A second seed run is a no-op                            | Pass            | "Nothing to change: already seeded" on all three.                                                                          |
| The smoke test passes per Site                          | Covered         | `e2e/6-seed-sites/2-sites.e2e.ts`                                                                                          |
| Screenshot pairs                                        | Pass            | `docs/screenshots/6-seed`, plus the pairs in this audit                                                                    |
| Warren Beach and Avada recognisable; Beachside on brand | Pass with drift | See "Fidelity" and findings 8–11 and 16.                                                                                   |

## Code quality (AGENTS.md and the ADRs)

- **ADR-0002 (writes as the Staff User):** followed. Every Admin read and write passes `overrideAccess: false` with the Staff User, and the public Site reads as a visitor (`src/site/queries.ts`). `/p-admin` should now go (22).
- **ADR-0004 and ADR-0006 (live on save, with history):** followed. History and restore exist for the Theme and Layouts, with no Drafts.
- **ADR-0005 (one schema per Site):** works. No `"public".` in the migrations. The open questions are the number of migrations (30) and the fixtures keyed by schema name (31).
- **AGENTS.md (this Next.js version):** uses Next 16 conventions: `proxy.ts` (not `middleware`), `connection()`, `preload` on `next/image`, and Turbopack. No deprecation warnings at runtime. The build passes. `DEV_SIGN_IN` is refused in production, as ADR-0003 says.
- **Type safety:**
  - 26 `as unknown as` casts outside tests. Most are harmless conversions from Payload types.
  - The casts in `src/admin/editor/bridge.ts` and `PageMode.tsx` hide finding 1. Typing the depth-0 document properly would have caught it.
  - 3 `as any`, 10 `eslint-disable`, and no `@ts-ignore`, TODOs, `console.log` or `PROTOTYPE` markers.
- **Module seams:** the Blocks are shared between the Site and the canvas through `context.editing`, which is good. But the public route imports the canvas (finding 4).
- **Tests:** broad unit coverage and per-phase acceptance suites. The Media usage logic (finding 2) is tested only for the Hero, which is why the gap survived. Test databases leak (23).
