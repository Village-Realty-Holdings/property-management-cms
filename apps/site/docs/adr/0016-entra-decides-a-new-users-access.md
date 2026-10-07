# Entra decides a new User's access, once

When a Microsoft account signs in and no Registry User exists for it yet, the new User gets Site Access to the Site they signed in on, and is made a Super Admin if Entra gives them the app role in `AUTH_ADMIN_ROLE`. That happens only when the User is created. After that, the Users screen is the only thing that changes their access: a later change to their Entra roles grants or takes away nothing, apart from the required role (`AUTH_REQUIRED_ROLE`), which is still checked at every sign-in. This amends ADR-0015, where a new Entra User had no Site Access until a Super Admin granted it, and roles never came from Entra.

## Considered Options

- **Sync roles from Entra at every sign-in.** Rejected. A Super Admin's change in the Users screen would be undone at the User's next sign-in, so there would be two places that claim to decide.
- **Only Super Admin from Entra, Site Access by hand.** Rejected. Everyone with the required role would still be turned away until someone granted them a Site, which is the step this removes.

## Consequences

- Assigning the required role in Entra is enough for a new person to use the Site they first open. Access to other Sites is still granted in the Users screen.
- With `AUTH_ADMIN_ROLE` unset, nobody is made a Super Admin from Entra. The first-Super-Admin rule (ADR-0015) still applies.
- A User a Super Admin added by email already exists, so linking their Entra account changes none of their access.
- Taking away someone's Entra admin role doesn't make them stop being a Super Admin. Do that in the Users screen.
