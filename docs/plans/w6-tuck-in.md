# Wave 6: Sections, Variables and the Tuck-In Page Template

Adds per-Site Sections, Variables and the first Page Template (Tuck-In) to the CMS and apps/site, and fixes the cut-off admin header logo. Terms: `CONTEXT.md` (Section, Page Template, Tuck-In, Variable, Former Brand, Client). Decision: `docs/adr/0017-variables-resolved-when-the-site-renders.md`.

## Conventions

- Branch `mvp-tuck-in` off `mvp`, with a PR into `mvp`.
- Use the `payload`, `dev-up` and `checkpoint` project skills. This branch includes its own generated types, import map and a migration named `tuck_in`.
- Keep it simple. Grow and Feedback Page Templates come later, so leave a small, obvious place to add a template. Don't build a template engine.

## 1. Sections

- Add a `sections` checkbox group to the Site tab of Sites: `properties`, `inbox`, `guides`, `curatedLists`. Each defaults to true, and the migration backfills true for existing Sites.
- Show it on the Site create form so a Super Admin picks Sections when creating a Site. A Tuck-In Site is simply one with all four off.
- Admins (on their assigned Sites) and Super Admins can edit Sections, using the existing `adminsOnly` field access. Editors can read them only.
- Pages, Media and Site Settings are always available.
- Add a custom `admin.components.Nav` server component that reads the active Site from the `payload-tenant` cookie, removes the turned-off collections from `visibleEntities.collections`, and renders Payload's `DefaultNav` (`@payloadcms/next`). With no Site selected, show everything.
- WorkQueues skips turned-off Sections.
- Site Settings hides the tabs and groups that belong to turned-off Sections.
- Hide in the admin only. Don't change access control or the API.

## 2. Client details on the Site

- Add the Client's name and website to the Site, as optional `adminsOnly` fields.
- The Site's name is the Former Brand for a Tuck-In, so nothing extra is needed for that.

## 3. Variables (per ADR-0017)

Built-in Variables, taken from Site Settings:

- `{site}`: the Site's name
- `{client}` and `{client-url}`: the Client's name and website
- `{phone}` and `{email}`: from Branding
- `{domain}`
- Add others only where a Site Settings field clearly fits.

Custom Variables:

- A key/value list in Site Settings, editable by Admins.
- Keys are lowercase-kebab and can't clash with built-in names.

Where Variables work: Page and Guide rich text, block text fields, SEO title and description, link labels and link URLs (e.g. `tel:{phone}`).

How they work:

- Store content as typed. Replace Variables in apps/site when it reads content, using one pure resolver in `@workspace/content/shared` that also exports the built-in names.
- Validate on save in the CMS. An unknown Variable blocks publishing, with the field and name in the error. A known Variable with an empty value is a warning, and it renders as empty.
- When a Site Settings change touches a Variable's value, it also revalidates that Site's `pages` and `guides` tags (ADR-0009).
- Tell editors in the admin which Variables exist, for example in a field description or a small help panel on Pages and Guides.

## 4. Tuck-In Page Template

Reference implementation: `../pclodge-landing`, in particular `site.config.ts`, `lib/site-config.ts`, `app/page.tsx` and `components/landing/*`. Live examples:

- https://live-absolute-vacations.pantheonsite.io/
- https://live-beach-bums.pantheonsite.io/
- https://www.forevervacationrentals.com/

Blocks (add them to `pageBlocks`, and reuse `link.ts` and `RichText`):

- **Announcement**: the headline, with an optional subheading.
- **Audience**: title, intro, points (title plus rich text with links), an optional closing paragraph and a CTA. It's used for owners and for guests.
- **Contact**: a title plus the phone and email.

Choosing the template:

- Creating a Page offers a Page Template choice: Blank (the default) or Tuck-In.
- Tuck-In pre-fills the layout (Announcement, owners Audience, guests Audience, Contact) with the pclodge-landing copy rewritten to use Variables. For example, the headline becomes "{site} Joins {client}!" and the CTAs link to `{client-url}`.
- The Page remembers its template.

Rendering in apps/site:

- A Tuck-In Page renders with the Tuck-In chrome instead of the Site's usual header and nav: a top bar with the phone, a header logo linking to the Client's website, and a footer.
- Links to the Client's website get UTM parameters the way pclodge-landing's `withUtm` adds them, with the Site's slug in place of `site.slug`.
- Match pclodge-landing closely, themed from Site Settings.
- Other Pages don't change.

## 5. Header logo is cut off

- The Awayday mark in the admin header (`graphics.Icon`, `components/admin/Brand.tsx`, `app/(payload)/custom.scss`) is clipped.
- Find the cause in the running admin and fix it. Check desktop and 390px width, in light and dark themes.

## Done when

- Typecheck, lint and tests are green. Tests cover:
  - which collections each Sections combination hides
  - that Admins can edit Sections and Editors can't
  - the Variable resolver: built-ins, Custom Variables, empty values, unknown names, a Variable split across text runs
  - save validation
  - revalidation when a Variable-backed Site Settings field changes
  - the Tuck-In template pre-fill
  - the UTM helper
- Checked with agent-browser:
  - create a Site with every Section off: the nav shows only Pages, Media and Settings
  - create a Tuck-In Page and edit its copy
  - change the phone in Site Settings: the rendered page updates without re-saving the Page
  - an unknown `{emial}` blocks publishing
  - the rendered page looks close to pclodge-landing, at desktop and 390px
  - a Site with every Section on still shows everything
  - the header logo is no longer clipped
- The PR description has before/after screenshots and lists open questions, e.g. whether pclodge-landing should move onto the CMS.
