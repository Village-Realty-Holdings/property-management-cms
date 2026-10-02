# A site-wide replace walks the field config, and asks whether Pages are saved as Drafts or published

Replace Text and Replace Image (the Admin's Tools) change one text, or one Media image, everywhere the Site shows it. Both read each document alongside the Payload config of its fields, the same walk that finds where an image is used (`src/admin/replace/walk.ts`), so a new Block or field is covered with no change to the Tools. Both show a preview first, and applying reads the Site again instead of trusting the preview. At the confirmation the Staff User chooses how Pages are saved: as Drafts, which leaves the Site as it is until each Page is published, or published now.

## What is searched

- **Replace Text** reads `text` and `textarea` fields and the text of rich text, in Pages (the title, the Blocks, the SEO fields) and in the Header and Footer of Layouts. A text field that holds a value instead of words (a path, a link's URL, an icon's name) is marked `custom: NOT_PROSE` in the config and is left alone. The URLs of rich text links are left alone too. The Brand and SEO settings are not searched: they are a handful of fields on two screens.
- **Replace Image** reads every `upload` field that points at Media, in Pages, Layouts, the Brand and SEO. The image that was replaced stays in Media.
- **Page Templates are left alone unless the Staff User switches on "Include Page Templates"**, which is off each time the screen opens. What new Pages start from then changes only on purpose. A Page already made from a Page Template is its own copy, so it is always searched like any Page.
- Rich text is matched one run at a time. A match that starts in plain text and ends in bold is not found, and the screen says so.

## Drafts or publish

| Page                                                  | Save as Drafts       | Publish now                                                                                                                                                    |
| ----------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published, nothing waiting                            | A new Draft          | Updated and published                                                                                                                                          |
| Published, with changes waiting in a Draft            | The Draft is updated | The Published copy is replaced and published by itself, then the Draft is saved again on top with its own replacement, so the waiting changes stay unpublished |
| Never published, or a Page Template that was included | The Draft is updated | The Draft is updated; it stays unpublished                                                                                                                     |

Layouts (ADR-0006), the Brand and SEO have no Drafts, so they change on the Site in either mode. The confirmation names them. A Layout's history records the replace as that save's summary.

Each document is saved by itself. One that can't be saved (a required title left empty, say) is reported with the reason, and the rest still go through.

## Considered Options

- **Always save Pages as Drafts.** Rejected. Fixing a typo across forty Published Pages would then need forty publishes.
- **Always publish.** Rejected. A replace would push every Page's waiting changes live, or need the rule above anyway.
- **Publish the latest Draft when publishing now.** Rejected. A replace must not publish changes a Staff User has not chosen to publish.
- **One transaction for the whole replace.** Rejected. One Page with an unrelated problem would block every other Page, and the per-document report is more useful than all-or-nothing.
- **Decide what is prose by whether a field has its own `validate`.** Rejected. Payload gives every field a validator when it starts, so the rule can't tell them apart; a mark in the config can.

## Consequences

- A new text field that holds a value (a URL, an id) must be marked `NOT_PROSE`, or Replace Text will change it.
- There is no undo button. A Page or Layout is put back from its history; the Brand and SEO, which keep no history, are put back by running the replace the other way.
- Searching the Brand and SEO for text later is a one-line change (`settings: true`).
