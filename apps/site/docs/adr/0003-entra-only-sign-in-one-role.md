# Staff Users sign in with Entra ID only, and everyone who signs in can do everything

Staff Users sign in with their Awayday Microsoft accounts through Entra ID. Entra decides who may sign in. Inside the Admin there is one role: a signed-in Staff User can manage Pages, Media, Site Settings and other Staff Users. There is no password login. We chose this because one Site and a small, trusted team don't need roles, and a password login is another credential to manage.

## Considered Options

- **Entra plus a break-glass password account, with Admin and Editor roles** (apps/cms ADR-0011 and 0016). Rejected. The roles and Site Assignment existed to separate Clients' Sites. The break-glass account is another secret, and password hashing is the open Payload issue on Workers (apps/cms ADR-0015).

## Consequences

- Access rules are "signed in or not". Visitors read only Published content.
- If Entra is unavailable, nobody can sign in to the Admin until it is back.
- There is no auth bypass in any environment. Local dev signs in against the real Entra tenant, so it needs the app registration's credentials.
- The sign-in flow (OIDC with PKCE on the server, ID token verified with `jose`, a Payload session through a custom strategy) is ported from apps/cms `auth/`, without the Super Admin flag and roles.
