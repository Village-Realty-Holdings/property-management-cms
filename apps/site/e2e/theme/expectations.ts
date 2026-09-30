import { deriveTheme, type TokenMap } from "../../src/theme"
import { themeFontFaces } from "../../src/site/fontStacks"
import type { SiteTheme } from "../../src/site/themeStyle"

/**
 * What the Theme acceptance tests expect the Site to show for a Theme. The
 * expectation is computed from the Theme module (src/theme), the same code
 * the Visual Editor's preview will use, and never from the Site's own CSS
 * output, so "renders exactly as previewed" compares two independent paths.
 *
 * Element expectations map a CSS property to the token value that should end
 * up on it. The browser resolves units and colours (see `resolvedStyles` in
 * ./browser.ts), so these stay in the tokens' own notation.
 */

export type StyleExpectation = Record<string, string>

function derived(theme: SiteTheme) {
  const { inputs, fonts } = theme
  const { headingStack, bodyStack } = themeFontFaces(
    inputs.headingFont,
    inputs.bodyFont,
    fonts
  )
  return deriveTheme(inputs, { heading: headingStack, body: bodyStack })
}

/** The variables the Site should declare at `:root` for this Theme. */
export function expectedRootTokens(theme: SiteTheme): TokenMap {
  return derived(theme).schemes.light
}

/** The variables that change under `prefers-reduced-motion: reduce`. */
export function expectedReducedMotionTokens(theme: SiteTheme): TokenMap {
  return derived(theme).reducedMotion
}

/** A default-variant `Button`: fill, text, edge, corners, size, type. */
export function buttonExpectation(tokens: TokenMap): StyleExpectation {
  return {
    "background-color": tokens["--btn-bg"]!,
    color: tokens["--btn-fg"]!,
    "border-top-width": tokens["--btn-border-width"]!,
    "border-top-color": tokens["--btn-border-color"]!,
    "border-radius": tokens["--btn-radius"]!,
    height: tokens["--btn-height"]!,
    "padding-left": tokens["--btn-px"]!,
    "font-weight": tokens["--btn-weight"]!,
    "text-transform": tokens["--btn-transform"]!,
    "letter-spacing": tokens["--btn-tracking"]!,
  }
}

/** A `Card`: surface, text and corners (its shadow is checked apart). */
export function cardExpectation(tokens: TokenMap): StyleExpectation {
  return {
    "background-color": tokens["--card"]!,
    color: tokens["--card-foreground"]!,
    "border-radius": tokens["--card-radius"]!,
  }
}

/** A heading in the Theme's display face. */
export function headingExpectation(tokens: TokenMap): StyleExpectation {
  return {
    "font-weight": tokens["--display-weight"]!,
    "text-transform": tokens["--display-transform"]!,
    "letter-spacing": tokens["--display-tracking"]!,
  }
}

/** An `Input`: size, corners and padding. */
export function inputExpectation(tokens: TokenMap): StyleExpectation {
  return {
    height: tokens["--input-height"]!,
    "border-radius": tokens["--input-radius"]!,
    "padding-left": tokens["--input-px"]!,
  }
}

/** A dialog's panel: a popover surface with the card corners. */
export function dialogExpectation(tokens: TokenMap): StyleExpectation {
  return {
    "background-color": tokens["--popover"]!,
    color: tokens["--popover-foreground"]!,
    "border-radius": tokens["--card-radius"]!,
  }
}

export type TokenMismatch = { token: string; expected: string; actual: string }

/** The expected tokens the page does not declare with the same value. */
export function tokenMismatches(
  expected: TokenMap,
  actual: Record<string, string>
): TokenMismatch[] {
  return Object.entries(expected)
    .filter(([token, value]) => (actual[token] ?? "") !== value)
    .map(([token, value]) => ({
      token,
      expected: value,
      actual: actual[token] ?? "",
    }))
}
