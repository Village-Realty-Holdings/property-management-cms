# One sign-in for every Site, through a shared Registry of Users and Sites

Users sign in to every Site with the same account, by Microsoft (Entra ID) or by email and password, and a Super Admin decides which Sites each User may use. Who a User is, how they sign in and which Sites they may use live in the Registry: tables in a `registry` schema of the database every Site already shares (ADR-0005). Every deployment reads it through its own Payload connection pool with plain SQL. A User may use a Site when they are enabled and either a Super Admin or have Site Access to it. This is checked at every sign-in and on every signed-in request, so disabling a User or taking away Site Access signs them out of that Site at once. Each Site still keeps its own `users` record of a User who has signed in there, linked by `registryUserId`, because Pages and Layouts point at it as "updated by". The Admin's sidebar lists the other Sites a User may use. Choosing one hands them over with a single-use token that is stored hashed in the Registry, lasts 60 seconds and works only on the chosen Site, so they don't sign in twice. This supersedes ADR-0003.

## Considered Options

- **Keep each Site's Users separate.** Rejected. The same person would need an account, and a password, per Site.
- **A separate sign-in service (SSO) in front of every Site.** Rejected for now. It's another deployment, and the shared database already gives every Site one place to check.
- **The Registry in `public`.** Rejected. A Site with no `DATABASE_SCHEMA` (tests, plain `pnpm dev`) keeps Payload's own `users` table there.
- **Payload's own password login.** Rejected. Payload's password hashing doesn't work on Workers (apps/cms ADR-0015, at tag `archive/mvp-2026-09`), and it would keep passwords per Site. The Registry hashes with PBKDF2-SHA256 through WebCrypto at 100,000 iterations, the most Workers allows.
- **Roles per Site (Admin, Editor).** Not now. Site Access is all or nothing, and Super Admin is the only role. A `role` column on Site Access can add roles later.

## Consequences

- The Entra app role `bds_campaign_user`, the same one the Awayday Workflows platform requires, decides whether a Microsoft account can sign in at all. The role must be defined on the Site's app registration and assigned to the User there: Entra puts only that registration's roles in its tokens. Which Sites it may use is the Registry's to say. A new Entra User is remembered with no Site Access until a Super Admin grants it. A User a Super Admin added by email is linked to their Entra account the first time they sign in with it.
- Removing someone's Entra role doesn't stop a password they also have. To lock someone out everywhere, disable them in Users.
- A wrong email, a wrong password and a disabled User get the same answer and take the same time. There is no rate limit in the app: that belongs at the edge.
- The Registry's tables are created by each Site's migration with idempotent SQL (`src/registry/schema.ts`), so whichever Site migrates first creates them. A later change to them is appended there and run from a new migration. A migration's `down()` never drops the Registry, because other Sites use it.
- Migrating an existing Site moves its Users onto Registry Users, keeping their Entra link, and gives each Site Access to that Site, so nobody who could sign in before is locked out. Nobody is made a Super Admin by the migration. The first Super Admin is the dev User locally. Elsewhere, set `is_super_admin` on a Registry User in SQL.
- A Site appears in the Registry when it migrates, with its `SITE_URL`, and its name and URL are refreshed at every sign-in. The Site switcher only offers Sites with a URL.
- The seed's own User is no one in the Registry (`registryUserId` 0), so nobody can sign in as it.
- The dev sign-in (ADR-0003) stays, outside production only, and signs in a dev User who is a Super Admin.
