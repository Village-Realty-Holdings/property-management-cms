# Wave 7: Preview drawn by the CMS

Editors see their Draft drawn as the Site will show it, in a panel next to the edit form, and it refreshes on every save and autosave. They never leave the admin. Publishing still updates only the owning Site. Terms: `GLOSSARY.md` (Preview, Draft, Published, Site). Decision: `docs/adr/0018-preview-drawn-by-the-cms.md`. Layout: `docs/module-layout.md` (packages/content, packages/site-views, apps/cms `preview/`).

## Decisions

- The admin stays at one domain (`cms.awayday.com`), with the Site picker.
- The CMS draws the preview. The Site's deployment isn't involved and doesn't need to be running.
- Preview reads the Draft as the logged-in Staff User. There are no preview keys, tokens or Draft Mode.
- The Live Preview panel and the Preview button both open `/preview/<site>/<collection>/<id>`. The URL needs the collection because Pages, Guides and Curated Lists number their ids separately.
- Publish is unchanged (ADR-0009).
- The old Site-side preview is removed (step 5).

## Conventions

- Branch `mvp-preview` off `mvp`, with a PR into `mvp`.
- Use the `payload`, `dev-up` and `checkpoint` project skills. One migration, named `preview_in_cms`.
- Read `node_modules/next/dist/docs/` before changing either app (Next 16).
- Move code before changing it. Step 2 is a move with only the changes it needs, so the diff stays reviewable.

## 0. Spike (before anything else, half a day)

Answer these in the PR description before going on:

- Can apps/cms render one of apps/site's Blocks, with Tailwind and `next/font`, in a `(preview)` route group next to `(payload)`, without the Site's CSS reaching the admin?
- The CMS Worker bundle size and memory with the views added (ADR-0015). If it's over the limits, stop and report.

## 1. packages/content: queries over a client seam

- Add the subpath `@workspace/content/queries`, with no Next runtime: the uncached queries, the document mapping and `QueryContext`.
- Rename `RestClient` to `ContentClient` (`find`, `create`). `createRestClient` is its HTTP adapter.
- `contentAdapter(ctx)` builds a whole `ContentAdapter` from a context and resolves Variables (moved from the root entry's `withVariables`).
- The root entry (`@workspace/content`) keeps its interface and caching and builds its adapter with `contentAdapter(contextFromEnv())`. Remove `isDraft`, `draftMode()` and `cmsPreviewKey()`.
- Tests: the existing query tests run through `contentAdapter` with the test client. Delete `rest/preview.test.ts`.

## 2. packages/site-views: the Site's views

- Move from apps/site: `components/blocks`, `components/site` (except `preview-banner.tsx`), `components/tuck-in`, `components/editorial`, the theme provider, and the fonts and display helpers they use.
- Add `PageView`, `GuideView` and `CuratedListView`, taken from the bodies of the matching apps/site routes.
- Views take `content: ContentAdapter`. Replace every `@workspace/content` import that fetches data (`getSiteSettings`, `searchProperties`, `getCuratedList`, `listSpecials`, `getSpecial`) with that argument, passed down through `RenderBlocks`. Views never read env (`requireSiteEnv`, `hasSite`) or pick an adapter.
- Views take a `preview` flag. When it's on, links and forms don't act (see step 3).
- apps/site routes become thin: fetch the document, return the view with the root entry's adapter. The public pages must render exactly as before, so compare screenshots of Home, a Page, a Guide, a Curated List and the Tuck-In before and after.

## 3. apps/cms: the Preview route

`preview/` (deep module), with this interface:

```ts
previewFor(req, { site, collection, id }): Promise<Preview | NotFound | LoginRequired>
```

It hides:

- The login check: anyone but a Staff User gets `LoginRequired`.
- Reading the document with `draft: true` and `overrideAccess: false` as that Staff User, and checking its Site matches `site` (otherwise `NotFound`).
- Building the Local API `ContentClient` and `contentAdapter({ site, draft: true, client })`.

`app/(preview)/preview/[site]/[collection]/[id]/page.tsx`:

- Calls `previewFor` and redirects `LoginRequired` to `/admin/login?redirect=…`. `NotFound` is a 404.
- Renders the matching view with `preview` on, inside `(preview)`'s own root layout with the Site's styles and fonts.
- Mounts `RefreshRouteOnSave` from `@payloadcms/live-preview-react` (version 3.90.2), so saves and autosaves refresh it.
- Is never cached or indexed (`noindex`, `Cache-Control: no-store`).

Collections (Pages, Guides, Curated Lists):

- `admin.livePreview.url` and `admin.preview` both return `/preview/<site slug>/<collection>/<id>`, or `null` while the document has no id.
- Breakpoints: Mobile 390×844, Tablet 768×1024, Desktop 1440×900.
- Turn autosave on for Pages and Curated Lists (Guides have it), so the panel refreshes while the Editor types. If `validate: true` shows errors mid-edit on half-filled Blocks, keep the manual save and say so in the PR.

Tests go through `previewFor`: an anonymous request, a SiteReader, a Staff User without that Site, a mismatched Site, a Draft newer than the published version, and Variables resolved in the Draft.

## 4. Publish updates only its Site

Already built (ADR-0009). Verify it end to end with two Sites running: publish a Page on demo-mountain. Its URL updates on demo-mountain, demo-beach isn't notified, and the Preview matched what went live.

## 5. Remove the Site-side preview

- apps/cms: `preview/endpoint.ts`, `token.ts`, `unreachable.ts` and `path.ts`, and the endpoint in `payload.config.ts`. Also the preview branch in `access/index.ts` and `access/previewReader.test.ts`.
- SiteReaders: remove `purpose`. The migration deletes SiteReaders whose `purpose` is `preview`, then drops the column.
- apps/site: `app/api/preview/*`, `lib/preview.ts`, `PreviewBanner` and where it's mounted, and `CMS_PREVIEW_KEY` in `.env.example`.
- Seed and tooling: `previewKey` in the seed output, and the dev-up script and `SKILL.md`.
- `Sites.revalidationSecret` stays: revalidation still uses it.

## Out of scope

Preview of Properties, Locations and Specials (no Drafts, ADR-0002), browse pages (`/rentals`, `/areas`), per-keystroke updates without autosave, and a "View live page" button.
