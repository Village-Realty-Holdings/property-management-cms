# Preview is drawn by the CMS, with the Site's own views

A Staff User previews a Draft inside the admin, at `cms.awayday.com`. The CMS draws the page itself: it reads the Draft through the Local API as that Staff User and renders it with the same view modules apps/site uses, from `packages/site-views`. The preview is shown in Payload's Live Preview panel next to the edit form and refreshes on every save, autosave included. The same page is also at `/preview/<site>/<collection>/<id>` for a full-window view. Both are behind the CMS login. Publishing is unchanged: it notifies only the owning Site's deployment (ADR-0009).

We chose this because preview is a CMS concern. It should work whenever the CMS works, for any Site, in every browser, and without extra keys, hostnames or cookies to keep in sync. This replaces the earlier design: a signed token redirected the Editor to the Site's deployment, which switched on Next Draft Mode and read Drafts with a per-Site preview key.

## Considered Options

- **Preview on the Site's deployment, in Draft Mode, with a preview key** (built in Waves 2 and 5). Rejected. Every Site needs a second, more powerful key, and its deployment has to be up to preview anything. Inside the admin panel, the Draft Mode cookie is third-party, so Safari drops it and quietly shows the published page.
- **The same, on a preview hostname per Site** (`pclodge.preview.awayday.com`). Rejected. It fixes Safari but keeps the keys and the dependency on the Site being up, and adds a hostname per Site.
- **The admin on each Site's domain** (`pclodge.com/cms-admin` routed to the CMS, or `admin.pclodge.com`). Rejected. Preview becomes same-origin, but it means a login per domain, a Microsoft (Entra) redirect URI and allowed-origin entry per domain, and running Payload under a path prefix. Staff work across Sites, so one admin suits them better.
- **A full stack per Site** (the admin inside apps/site, one database each). Rejected. It reverses ADR-0010.
- **The CMS proxies the Site's pages under its own URL.** Rejected. The Site's pages assume they're served from the root of their own domain: assets, links, refreshes and forms would all hit the CMS.

## Consequences

- The Site's views (page views, Blocks, the Site and Tuck-In frames, theme and fonts) move from apps/site into `packages/site-views`. They take their content as an argument and never read env or pick an adapter themselves.
- `packages/content`'s queries run over a client seam with two adapters: HTTP with the Site's reader key (apps/site), and the Local API as the Staff User (apps/cms preview). Mapping Payload documents to Site shapes and resolving Variables (ADR-0017) happen once, for both.
- The preview can differ from the live Site when the CMS and a Site's deployment run different versions of `packages/site-views`. Deploying the CMS and every Site from the same commit keeps them in step.
- apps/cms now renders one route group outside the admin, `(preview)`, with its own root layout and the Site's styles (amends ADR-0006). It's never public.
- The CMS bundle grows by the views, their CSS and fonts. Check the Workers size and memory limits early (ADR-0015).
- Links and forms in a preview don't act. Navigating or submitting from inside the admin would leave the preview.
- Removed: preview SiteReaders (`purpose`) and `CMS_PREVIEW_KEY`, the CMS preview token endpoint, the Site's `/api/preview` routes and preview banner, and Draft Mode handling in `packages/content`. SiteReaders read published content only.
- Only Pages, Guides and Curated Lists are previewed, because only they have Drafts (ADR-0002).
