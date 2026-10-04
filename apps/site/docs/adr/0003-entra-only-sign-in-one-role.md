# Users sign in with Entra ID only, and everyone who signs in can do everything

Users sign in with their Awayday Microsoft accounts through Entra ID. Entra decides who may sign in. Inside the Admin there is one role: a signed-in User can manage Pages, Layouts, Media, the Brand, SEO, the Theme and other Users. There is no password login. We chose this because one Site and a small, trusted team don't need roles, and a password login is another credential to manage.

## Considered Options

- **Entra plus a break-glass password account, with Admin and Editor roles** (apps/cms ADR-0011 and 0016). Rejected. The roles and Site Assignment existed to separate Clients' Sites. The break-glass account is another secret, and password hashing is the open Payload issue on Workers (apps/cms ADR-0015).

## Consequences

- Access rules are "signed in or not". Visitors read only Published content.
- If Entra is unavailable, nobody can sign in to the Admin until it is back.
- Local dev can use a dev sign-in until the Entra app registration's credentials are available. `GET /auth/dev` signs in a fixed dev User through the same session code as Entra. It works only when `NODE_ENV` isn't `production` and `DEV_SIGN_IN=1`, and the app refuses to start in production with `DEV_SIGN_IN` set. There is no auth bypass in production. Remove the dev sign-in once Entra works locally.
- Users have no password (Payload's local strategy is disabled). A User record is created on first sign-in, keyed by Entra `oid`, and can't be created in the Admin. Removing the Entra app role blocks the next sign-in, and a short session lifetime ends the current one.
- The sign-in flow (OIDC with PKCE on the server, ID token verified with `jose`, a Payload session through a custom strategy) is ported from apps/cms `auth/`, without the Super Admin flag and roles.
