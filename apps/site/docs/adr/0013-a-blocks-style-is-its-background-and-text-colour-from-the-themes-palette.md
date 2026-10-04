# A Block's style is its background and its text colour, from the Theme's palette

A Block could sit on four backgrounds (Default, Muted, Primary, Dark), its text was always worked out from the background, and the Header's and Footer's own Blocks had no background at all: the Utility strip was the primary colour and nothing else. A brand's page needed a strip in another of its colours with white text, and the Theme already had two more colours no Block could use.

Every Block that has a background now has a **Style**: two settings, both picked from the Theme and nothing outside it.

- **Background:** Default, Muted, Primary, Accent, Third colour, Dark surface. Accent and Third are new. A Theme with no third colour paints Third with its secondary colour.
- **Text colour:** Automatic (worked out to read on the background, as before), White, or Dark (the Theme's text colour). White and Dark are used as they are.

They are on the Page Blocks that had a background, on Containers (Pages' and Layouts'), and on three Header and Footer Blocks that are bands: the Utility strip, the Legal bar and Footer columns. For those three, Default means the look they always had (the strip on the primary colour, the others on the Footer's surface), so no existing Layout changes. In the Visual Editor's Block tab the two settings are under **Style**, beside **Content**; a field is a style field when its config says so (`custom: STYLE`).

## How it is drawn

A Block draws itself for Default, Muted, Primary and Dark, as it did. For Accent, Third and a set text colour, no Block has a new case. The Block is wrapped in an element that takes no room (`display: contents`) and carries the choice (`data-surface`, `data-text`), and the stylesheet gives the Theme's colour variables other values inside it: the text colour, the muted text, links, focus rings and rules all become the surface's text colour or the colour that was set. A card inside (anything that paints the card, page or popover colour) gets the page's values back, so its text stays readable. An accent button on the Accent background would vanish, so there it is drawn as the primary button.

Inside a Container a Block has no background of its own (ADR-0007), so only its text colour counts there.

## Considered Options

- **A case per Block for each new background.** Rejected. Twenty-odd Blocks times two backgrounds times three text colours, each a place to forget a link or a rule. The variables are what every Block already reads.
- **A free colour picker.** Rejected. The Theme is the Site's palette; a Block that leaves it stops following a Theme change.
- **A text colour override only where it was asked for** (the Utility strip). Rejected: the next band would need it too, and one shared pair of fields is less to explain than a special case.
- **Check the contrast of a set text colour and warn in the editor**, as the Theme does for Button text (ADR-0012). Not done yet. The Theme's warning sees every colour involved; a Block's would have to know the surface it ends up on (a Container's, a region's). White text on the Default background is possible, and unreadable.

## Consequences

- Staff can make text that is hard to read by setting White or Dark. Automatic never does.
- A Block that hard-codes a colour instead of reading the Theme's variables will not follow these settings. The Block tests that forbid raw colours guard this.
- One migration adds the two background values to every Block's background and the text colour column to every Block that has a background, on Pages and Layouts and their versions.
- New Blocks get the settings by spreading `surfaceFields` into their config.
