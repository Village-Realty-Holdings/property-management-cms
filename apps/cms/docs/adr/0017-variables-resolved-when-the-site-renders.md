# Variables are resolved when the Site renders, not when content is saved

Pages and Guides store Variables such as `{phone}` and `{client}` as typed, in copy, SEO fields and links. apps/site replaces them when it reads content, using a pure resolver in `@workspace/content/shared` (like Amenity Presentation), with the Site's built-in values from Site Settings plus its Custom Variables. We chose this so that changing a value in Site Settings, such as a new phone number, updates every Page and Guide that uses it without re-saving anything, and so editors keep seeing `{phone}` rather than a number they might overwrite by hand.

## Considered Options

- **Replace on save** (a `beforeChange` hook writes the values into the document). Rejected. Stored copy goes stale as soon as a value changes, and the editor loses the Variable.
- **Replace in the CMS API** (an `afterRead` hook for non-admin reads). Rejected. The same document would read differently depending on who asks, which confuses Preview and makes the REST output hard to reason about. The Site already owns presentation choices like this (ADR-0007).

## Consequences

- A Site Settings change that touches a Variable's value must also revalidate that Site's `pages` and `guides` tags, not just `site-settings` (ADR-0009). The Variable-backed fields are a small, known set, so the hook can skip changes that don't affect them.
- The CMS validates Variables on save: an unknown name blocks publishing, and a known Variable with an empty value is a warning. The list of built-in Variable names lives in `@workspace/content/shared`, so both apps agree on it.
- A Variable must sit inside one text run. `{ph` in plain text followed by `one}` in bold is not recognised, and the validator reports it as literal braces.
- Copy can't contain a literal `{name}` that matches a Variable. No escape syntax until someone needs one.
