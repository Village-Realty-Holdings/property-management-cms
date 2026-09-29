/**
 * Lets the Site Settings tab bar wrap onto a second line on narrow screens
 * instead of scrolling a tab out of sight. Rendered by a `ui` field (no data)
 * next to the tabs; the style is scoped to the Sites edit view.
 */
const css = `
.collection-edit--sites .tabs-field__tabs {
  display: flex;
  flex-wrap: wrap;
  row-gap: calc(var(--base) / 2);
  padding-inline: var(--gutter-h);
}
.collection-edit--sites .tabs-field__tabs::before,
.collection-edit--sites .tabs-field__tabs::after {
  display: none;
}
`

export function WrapTabs() {
  return <style>{css}</style>
}
