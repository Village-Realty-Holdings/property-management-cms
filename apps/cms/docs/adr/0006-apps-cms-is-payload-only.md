# apps/cms is a Payload-only app with the admin at /admin

apps/cms uses Payload's standard layout. There's an `app/(payload)` route group with its own root layout, the admin at `/admin` and REST at `/api`, and `/` redirects to `/admin`. The existing template `app/layout.tsx` and `app/page.tsx` are removed, because Payload's route group must own the root layout. apps/cms renders no public pages. Everything public lives in apps/site. The one exception is Preview (ADR-0018): a `(preview)` route group, behind the CMS login, that draws Drafts with apps/site's views.

## Considered Options

- **Admin at the root (`routes.admin: '/'`).** Rejected. It collides with future custom routes (the Sync webhook, preview handlers), and it's the path Payload's docs and plugins least expect.
- **Frontend and admin in one app (`(frontend)` + `(payload)`).** Rejected. apps/site already exists as a separately deployed public app. Keeping them apart means a site deploy can't break the admin and the other way round.

## Consequences

- The Payload admin has its own styling, so `@workspace/ui` and Tailwind aren't used inside the admin. Custom admin components use Payload's UI kit. The `(preview)` route group has its own root layout, so the Site's Tailwind styles load there and never in the admin.
