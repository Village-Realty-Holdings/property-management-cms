# Microsoft sign-in happens in the browser, as in the Workflows platform

The sign-in page signs in with Entra in the browser, through MSAL's popup, the way the Awayday Workflows platform does. The Site's app registration is a single-page application, a public client with no client secret. The page asks Entra for the Site's API scope (`AUTH_REQUIRED_SCOPE`, e.g. `payload.access`) and posts the access token it gets to `/auth/entra/finish` as a Bearer token. If no scope is set, it sends the ID token instead. The Site verifies the token with `jose` against the tenant's published keys: issuer, audience (`AUTH_AUDIENCE`), tenant and scope. Then it checks the app role and the Registry (ADR-0015, ADR-0016) and starts the same session as before. This replaces the server-side code exchange with a client secret described in ADR-0003.

## Considered Options

- **Keep the code exchange on the server, with a client secret.** Rejected. The secret expires (24 months at most) and has to be rotated on every Site. The Workflows platform already signs in without one, and one app registration can serve both.
- **Our own browser code (PKCE) instead of MSAL.** Rejected. MSAL is what the Workflows platform uses and Microsoft maintains, and it deals with the popup and Entra's quirks.
- **MSAL's redirect instead of its popup.** Not now. The popup is what the Workflows platform uses. A browser that blocks popups shows the error message, and the redirect can be added if that turns out to matter.

## Consequences

- Each Site's origin has `<origin>/auth/entra/callback` registered as a **single-page application** redirect URI. That page is blank: MSAL reads Entra's answer from the popup's address.
- `ENTRA_CLIENT_SECRET` is gone. The settings take the Workflows platform's names (`AUTH_TENANT_ID`, `AUTH_CLIENT_ID`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_REQUIRED_SCOPE` and the role settings), so one set of values serves both. Only the tenant and client id are needed to turn sign-in with Microsoft on.
- MSAL keeps its tokens in the browser's sessionStorage, on the sign-in page only. The Site never uses them after sign-in: the Admin runs on its own HttpOnly session cookie, as before.
- There is no nonce or state shared between the Site and the popup any more. `/auth/entra/finish` takes only posts from the Site's own origin, and a token is short-lived and only for this app. Someone holding a stolen token could start a session with it until it expires, which is the same exposure the Workflows platform's API has.
- v1 access tokens (the default for a custom API scope) come from `https://sts.windows.net/<tenant>/` with the audience `api://<client id>`, so both issuers and both audiences are accepted by default.
- The tests sign tokens with a mock issuer's key and post them, as the page would. The MSAL popup itself is only exercised by hand against Entra.
