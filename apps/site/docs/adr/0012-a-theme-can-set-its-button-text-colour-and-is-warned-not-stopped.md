# A Theme can set its button text colour, and is warned, not stopped

The Theme derived the colour of a filled button's label from the button's fill, so it always passed WCAG AA: white where white reaches 4.5:1, otherwise the Site's text colour, otherwise black. Brands don't always follow that. All Seasons Resort Lodging sets white on a blue where white reaches 3.2:1, and its landing page could not be matched: the Theme gave it dark labels.

The Theme now has a **Button text** control: Automatic (the derivation, and the default), White, or Dark (the Site's text colour). White and Dark are used as they are on every filled button, at rest and on hover: the primary button, the accent button, and the primary button on an accent panel. An outline button's label stays the link colour until its hover fills it.

When the colour the Theme sets falls below AA on a button fill, the Theme editor shows a contrast warning with the ratio and a one-click fix back to Automatic. It does not block the save, as no contrast warning does.

Only buttons change. Text on a Primary band, an accent panel or the Utility strip is still derived to pass AA.

## Considered Options

- **Keep deriving, and darken the brand's blue until white passes.** Rejected as the only answer. It is right for a Site that wants AA above all, and it is still what Automatic does, but a brand's button colour is not ours to change.
- **Use WCAG's 3:1 threshold for large text on buttons.** Rejected. Button labels are not large text.
- **A free colour picker for button text.** Rejected. White or the text colour covers what brands do, and a third colour would need its own hover and focus rules.
- **Block the save when the contrast is low.** Rejected, as for every other contrast warning: Staff are told, and decide.

## Consequences

- A Site can now ship buttons that fail AA. The Theme editor says so each time the Theme is opened.
- The accent button's label has its own token, `--btn-accent-fg`, so setting it does not change the text of accent panels.
- A Theme exported before this control existed has no Button text. It imports as Automatic.
