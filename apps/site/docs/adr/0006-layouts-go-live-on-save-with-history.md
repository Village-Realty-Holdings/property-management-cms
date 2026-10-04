# Layouts go live on save with a history, like the Theme, while Pages keep Drafts

A Layout is the Header and Footer around Pages. Saving a Layout applies it at once to every Page that uses it. Each save is kept as a version, and any earlier version can be restored with one click. Layouts have no Drafts. The Visual Editor shows how far a save reaches ("Used by 12 Pages") and lets a User preview the Layout on any of those Pages before saving. We chose this for the same reason as the Theme (ADR-0004): the preview answers "how will it look" before saving, and the history covers a bad save. Drafts would add a state to explain, and they raise a hard question with no good answer: when a Page is published, should its Layout's Draft be published with it?

## Considered Options

- **Drafts like Pages.** Rejected. A Page published while its Layout has an unpublished Draft is confusing whichever way it resolves.
- **Publish a Layout's Draft together with a Page.** Rejected. Publishing one Page would silently change every other Page that uses the same Layout.

## Consequences

- A Page can start a new Layout from its current one ("Make a new Layout from this one"). This is the safe way to change the Header or Footer for only some Pages.
- A Layout that Pages pick explicitly, and the default Layout, can't be deleted.
- Adding Drafts to Layouts later is a schema change.
