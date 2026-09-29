# Staff sign in with Awayday's Microsoft Entra ID; Entra decides who gets in, the CMS decides what they can do

Staff Users sign in with their Awayday Microsoft work accounts, the same identity provider as awayday-workflow-platform. The CMS has its own Entra app registration: a confidential client with its own redirect URI and app roles. apps/cms runs the OIDC authorization-code flow with PKCE on the server. The callback verifies the ID token with `jose` against Entra's signing keys (issuer, audience, tenant), finds or creates the `Users` record by the Entra `oid`, and issues a Payload session through a custom auth strategy. From there, Payload's normal access control (ADR-0011) applies to every request.

Entra app roles decide who may sign in at all (`cms_user`) and who is a Super Admin (`cms_super_admin`), and they're re-read on every sign-in. Admin or Editor and Site Assignment are CMS data, managed by Admins, because Sites exist only in the CMS. A first-time user arrives with no Site Assignment and sees nothing until an Admin assigns them.

## Considered Options

- **Copy awayday-workflow-platform's approach** (MSAL in the browser, tokens in `sessionStorage`, no server session). Rejected. It leaves the API unprotected, which that project's README itself calls not production-ready, and it has a dev bypass that treats every request as an admin.
- **Everything in Entra** (Site Assignment through one Entra group per Site). Rejected. Every new Site would need an IT change, and access to Client content would live outside the system that owns it.
- **Payload email and password.** Rejected for staff. It's another credential to manage, and it hits the open PBKDF2 issue on Workers (ADR-0015).

## Consequences

- Payload's local (password) strategy stays enabled for a single break-glass Super Admin account only, for when Entra is unavailable. Staff accounts have no password.
- Removing someone's `cms_user` role in Entra blocks their next sign-in. Existing Payload sessions last until they expire, so the session lifetime is kept short.
- There's no auth bypass in any environment. Local dev uses a test sign-in against the real tenant, or the seeded break-glass account.
