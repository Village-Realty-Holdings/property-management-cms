import type { DerivedTheme, TokenMap } from "./derive"

/**
 * A derived Theme as CSS custom properties, for a `<style>` element. Values
 * are colours, lengths and font stacks the derivation built, but font stacks
 * come from Font records, so every value is stripped of anything that could
 * end the declaration, the rule or the style element.
 */

const CUSTOM_PROPERTY = /^--[a-z0-9-]+$/
/** A plain selector: classes, ids, tags, descendants and `:root`. */
const SAFE_SELECTOR = /^[a-zA-Z0-9_.#:\-\s>]+$/

const cleanValue = (value: string) =>
  [...value.replace(/\/\*|\*\//g, "").replace(/[<>{};\\]/g, "")]
    .filter((char) => char.charCodeAt(0) >= 32)
    .join("")
    .trim()

function declarations(tokens: TokenMap): string {
  return Object.entries(tokens)
    .filter(([name]) => CUSTOM_PROPERTY.test(name))
    .map(([name, value]) => `${name}:${cleanValue(value)};`)
    .join("")
}

/**
 * The light tokens at `selector` (`:root` by default, so portalled content
 * such as dialogs and sheets is themed too), then the reduced-motion override.
 * A `selector` that is not a plain selector is ignored.
 */
export function themeCss(
  theme: DerivedTheme,
  options: { selector?: string } = {}
): string {
  const selector =
    options.selector && SAFE_SELECTOR.test(options.selector)
      ? options.selector.trim()
      : ":root"
  const base = `${selector}{${declarations(theme.schemes.light)}}`
  const reduced = declarations(theme.reducedMotion)
  return reduced
    ? `${base}@media (prefers-reduced-motion:reduce){${selector}{${reduced}}}`
    : base
}
