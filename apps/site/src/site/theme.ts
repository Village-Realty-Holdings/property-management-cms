/**
 * The Site's colours as CSS variables. The Theme (a later phase) will supply
 * the palette; until it exists the Site uses one fixed default.
 */

export type Palette = { primary: string; accent: string }

/** The palette every Site uses until the Theme exists. */
export const DEFAULT_PALETTE: Palette = {
  primary: "#283d6b",
  accent: "#f2a65a",
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** A valid `#rgb`/`#rrggbb` as lower-case `#rrggbb`, else null. */
export function normalizeHex(value: string | null | undefined): string | null {
  const hex = value?.trim()
  if (!hex || !HEX.test(hex)) return null
  const digits = hex.slice(1).toLowerCase()
  return `#${
    digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits
  }`
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

const LIGHT_TEXT = "#ffffff"
const DARK_TEXT = "#1b1c1e"

/** White or near-black, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  const l = luminance(hex)
  return contrast(l, luminance(LIGHT_TEXT)) >= contrast(l, luminance(DARK_TEXT))
    ? LIGHT_TEXT
    : DARK_TEXT
}

/** CSS custom properties for a palette. */
export function themeColorVars(
  palette: Palette = DEFAULT_PALETTE
): Record<string, string> {
  const primaryText = readableOn(palette.primary)
  return {
    "--brand-primary": palette.primary,
    "--brand-primary-foreground": primaryText,
    "--brand-accent": palette.accent,
    "--brand-accent-foreground": readableOn(palette.accent),
    // shadcn tokens, tinted by the palette so the Site has its own paper.
    "--primary": palette.primary,
    "--primary-foreground": primaryText,
    "--ring": palette.primary,
    "--background": `color-mix(in oklab, ${palette.primary} 3%, white)`,
    "--foreground": `color-mix(in oklab, ${palette.primary} 22%, #151515)`,
    "--card": "#ffffff",
    "--card-foreground": `color-mix(in oklab, ${palette.primary} 22%, #151515)`,
    "--muted": `color-mix(in oklab, ${palette.primary} 7%, white)`,
    "--muted-foreground": `color-mix(in oklab, ${palette.primary} 35%, #5b5b5b)`,
    "--secondary": `color-mix(in oklab, ${palette.primary} 9%, white)`,
    "--secondary-foreground": palette.primary,
    "--border": `color-mix(in oklab, ${palette.primary} 15%, white)`,
    "--input": `color-mix(in oklab, ${palette.primary} 18%, white)`,
  }
}

/** `tel:` href from a displayed phone number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`
}
