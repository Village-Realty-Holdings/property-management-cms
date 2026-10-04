# Foundation

The first slice of the Site Builder. A User signs in to the Admin, creates a Page from Blocks, publishes it, and sees it on the public Site. Terms: `apps/site/GLOSSARY.md`. Decisions: `apps/site/docs/adr/0001` to `0003`.

## Decisions

- One Next.js app (`apps/site`) with three root layouts in route groups:
  - `(payload)`: Payload's admin at `/p-admin` and REST at `/api`. Reference only (ADR-0002).
  - `(admin)`: the Admin at `/admin`, built with shadcn/ui from `packages/ui`.
  - `(site)`: the public Site, as a catch-all route. `/` is Home.
- Top-level paths the Site can't use for Pages: `admin`, `p-admin`, `api`, `auth`, `media`.
- The Admin reads and writes through Payload's Local API as the signed-in User (`overrideAccess: false`), from Server Components and Server Actions. There is no REST client.
- User sessions come from our own auth strategy. Payload's local strategy is disabled (ADR-0003), and that also disables Payload's built-in JWT check. `auth/` issues a signed `site-session` cookie (HS256 with the Payload secret, 8 hours), and a custom Payload strategy reads it. Every Payload request, the Admin, and `/p-admin` authenticate the same way.
- Sign-in routes: `/auth/entra/start`, `/auth/entra/callback`, `/auth/dev` (dev only, ADR-0003) and `/auth/sign-out`.
- Entra decides who may sign in, through the `site_user` app role. There are no roles in the app.
- Media uses the S3 adapter against R2 when `S3_*` is set, and local disk otherwise. Keys are plain filenames.
- Site Settings is a Payload global. The Site reads it for its name and branding, and branding becomes CSS variables on the Site's root layout.
- Pages have Drafts, without autosave. The Site reads Published Pages only.
- The public Site renders at request time (`connection()`), so a publish shows at once. Caching and revalidation come later.
- Until the Visual Editor, the Admin edits rich text as Markdown and stores it as Lexical, with Payload's own converters (`admin/richText.ts`).
- `src/proxy.ts` passes the requested Admin path to the render, so signing in from a deep link returns to it.
- The dev User is `dev@awayday.test` (Payload rejects `localhost` email addresses).

## Steps

1. **Plan**: this file.
2. **Scaffold**: `package.json`, Next config with `withPayload`, TypeScript, ESLint, PostCSS, OpenNext and wrangler, and the Payload config with Postgres (`database.ts` ported), storage (`storage.ts` ported, no prefix) and the `(payload)` route group at `/p-admin`. Generated types go in `src/payload-types.ts`.
3. **Auth**: `users` (email, name, `entraOid`) with the local strategy disabled. Port `auth/` from apps/cms: OIDC, the sign-in flow, find-or-create by `oid`, without roles. Add the session cookie strategy, the dev sign-in, sign-out, and sign-in buttons on `/p-admin`'s login screen. Startup fails if `DEV_SIGN_IN` is set in production.
4. **Content**: `media`; `pages` (title, path, `layout` with Hero, Rich text and Call to action, `seo`, drafts); the `site-settings` global (general: name, tagline, contact details; branding: logo, colours, font pairing, social links). Access: Users can do everything, and visitors read Published Pages, Media and Site Settings.
5. **Public Site**: `(site)/[[...path]]` renders the Published Page at that path, or 404. It also renders Blocks, and SEO metadata from the Page and Site Settings. The theme comes from Site Settings.
6. **Admin**: `(admin)/admin` with a sign-in screen (Microsoft, and Dev when on), a shell with a sidebar, lists and forms for Pages (with Blocks), Media (upload) and Site Settings, and Save draft / Publish.
7. **Wrap-up**: first migration, generated types and import map. Tests adapted from `parked-tests`: the sign-in flow against a mock issuer, dev sign-in guards, access, and Page paths. `.env.example`.

## Conventions

- Branch `site-foundation` off `development`. Commit per step, no push.
- apps/cms is reference only. Copy code from it, and never edit it.
- Read `node_modules/next/dist/docs/` before using a Next API (Next 16).

## Status

Built on `site-foundation`: steps 1 to 7. Checked in a browser with `DEV_SIGN_IN=1`: dev sign-in, a Page created with Blocks and published, a Draft edit that leaves the Site unchanged until published, a Media upload, Site Settings branding on the Site, `/p-admin` with the same session, and sign-out.

Not covered yet: Entra sign-in against the real tenant (needs the app registration), and the Workers build (`pnpm worker:build`).

## Done when

- typecheck, lint and test pass.
- With `DEV_SIGN_IN=1` in local dev: sign in at `/admin`, create and publish a Page, and see it on the public Site.
