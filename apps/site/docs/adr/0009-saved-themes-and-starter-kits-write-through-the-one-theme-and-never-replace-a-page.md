# Saved Themes and Starter Kits write through the one Theme, and a kit never replaces a Page

The Tools group lists Themes and Starter Kits. Neither changes what the Site is made of: there is still one Theme (ADR-0004), and a kit only fills in the records a User could fill in by hand.

## Themes

The Themes screen lists the built-in presets (`src/theme/presets.ts`) and the Saved Themes, a small collection (`saved-themes`) of a name and the Theme's inputs. Applying either one is an ordinary save of the Theme with those inputs: it is live at once, it is a new version, and the Theme's history can restore the one before. "Save current Theme" copies the live inputs into the list under a name.

A Theme exports as a JSON file with its fonts written as family names, because a stored Font's id means nothing on another Site. Importing adds a Saved Theme and applies nothing. A file with an unknown setting, a wrong value, or a font this Site doesn't have is refused, and the message names what to fix.

## Starter Kits

A Starter Kit is code (`src/starterKits`): the Theme it suggests, the Pages it adds with the Layout they pick, and the questions its text needs. The form asks, in steps, for the kit, the Brand details, the SEO defaults and a Theme, and then shows a review that the server computes from the Site as it is: what will be saved, what replaces something, and which Pages will not be added. Nothing is written before "Set up Site".

Applying saves the Brand and SEO through the same code as their screens, applies the Theme as the Themes screen does, and adds the kit's Layout and Pages. Pages are added as Drafts. A Page is added only where no Page has its path: a kit never replaces or changes a Page, and the review says beforehand which ones it skips. Placeholders in a kit's text (`[Our Brand]`, `[Company]`) are filled from the answers with the Replace Text engine (ADR-0008); one with no answer stays for a User to fill in.

## Considered Options

- **Several Themes with one marked active.** Rejected. It would change ADR-0004's one record with a history into a list with a pointer, for the Site, the editor, the Dashboard and the seeds, to save one copy of eighteen values.
- **Saved Themes as a flag on the Theme's versions.** Rejected. A version is a point in the history; renaming, deleting or importing one would rewrite history.
- **Export fonts as the stored keys.** Rejected. `font:12` is another Font, or none, on the next Site.
- **Kits that Users make in the Admin.** Rejected for now. A kit holds Blocks and a Layout, so an editor for kits is a second Page editor. Page Templates already cover "start a Page from this".
- **A kit that overwrites Pages.** Rejected. The cost of a wrong click is a Site's Home Page.
- **One click, no form.** Rejected by the brief: a kit needs the Site's name, logo and SEO to be worth applying.

## Consequences

- A Font can be deleted while a Saved Theme still names it. Applying that Saved Theme then uses the Classic font in its place and says so; exporting it is refused until it is saved again with a font.
- The Brand and SEO a kit saves have no history, so the review marks a changed Site name for checking.
- Applying a kit is not one transaction: each step is reported, and a failed step does not undo the ones before it.
- Adding a kit is a code change with a test.
