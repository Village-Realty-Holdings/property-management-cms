# The Theme is its own record and goes live on save, while Pages have Drafts

The Theme is stored as its own record, separate from Site Settings, with its own version history. The Admin edits it only in the Visual Editor's Theme mode, opened from Settings › Theme (it was first placed as a section of Site Settings; Site Settings is now the Brand and SEO). Saving the Theme applies it to the public Site at once, and a Staff User can restore any earlier version with one click. Pages keep Drafts. We chose this because a Staff User previews an unsaved Theme across real Pages in the Visual Editor before saving, so a Draft adds a step and a state to explain without adding safety, while the history covers a bad save.

## Considered Options

- **A Draft and Published Theme, like Pages.** Rejected. The Visual Editor preview already answers "how will the Site look?" before anything is saved.
- **The Theme as a field group inside the Site Settings global.** Rejected. A Theme restore would also roll back the name, contact details and logo, and the Theme would share one history with them.
- **Live on save with no history.** Rejected. One save restyles every Page, so there must be a quick way back.

## Consequences

- Site Settings (now the Brand) no longer holds colours or fonts. The old `branding.primaryColor`, `accentColor` and `fontPairing` fields are dropped without migration, and the Theme starts from a preset.
- An unsaved Theme exists only in the Staff User's editing session. While it is being previewed, Block editing in the Visual Editor is off, so a Page save and a Theme save are never confused.
- Adding Drafts to the Theme later is a schema change.
- Layouts follow the same model (ADR-0006).
