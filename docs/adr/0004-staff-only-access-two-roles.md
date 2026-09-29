---
status: superseded by ADR-0011
---

# Only Staff Users log in, with two roles and no per-Property scoping

The CMS has two roles. An Admin manages Staff Users, Site Settings and Locations. An Editor edits and publishes any content. Owners and Guests never log in, and Editors aren't scoped to the Properties they manage. Access rules are simple role checks, not row-level filters.

## Considered Options

- **Owner logins with row-level access.** Rejected for v1. It's a security surface with little payoff while the feed owns the facts.
- **Per-Property manager scoping, or a Contributor/Editor review workflow.** Rejected. The team is small and trusted. Either could be added later as a third role without reshaping the collections.
