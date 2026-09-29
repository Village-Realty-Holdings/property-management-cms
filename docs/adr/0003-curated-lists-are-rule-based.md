# Curated Lists are defined by rules, not hand-picked

A Curated List belongs to one Site and stores a rule over Property Facts and Location (for example, "Amenity = hot tub AND Location within Park City AND sleeps ≥ 6"), not a list of Property references. Its members are resolved at read time. This keeps lists correct as the Sync adds and withdraws Properties, with no Editor maintenance.

## Consequences

- The rule language is a closed set of structured fields (Locations, Amenities, minimum sleeps and similar), not free-form queries. It's compiled into a database query by one module that both apps share.
- Any Property change can change any Curated List's membership, so revalidation invalidates all Curated Lists whenever Properties change (see ADR-0009).
- Manual pins and exclusions aren't supported. They can be added later as optional fields without changing this decision.
