/**
 * Colour maths for the Theme: hex parsing, mixing, WCAG contrast and the
 * nudges that keep text-bearing colours at AA. Pure and safe on the server and
 * in the browser. All colours are `#rrggbb` (lower-case) once normalised.
 */

export const WHITE = "#ffffff"
export const BLACK = "#000000"

/** WCAG AA: normal text. */
export const AA_TEXT = 4.5
/** WCAG AA: borders, focus rings and other UI components. */
export const AA_UI = 3

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

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ]
}

function toHex(values: readonly number[]): string {
  return `#${values
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
}

/** `a` moved `amount` (0 to 1) of the way towards `b`, in sRGB. */
export function mix(a: string, b: string, amount: number): string {
  const ca = channels(a)
  const cb = channels(b)
  return toHex(ca.map((v, i) => v + (cb[i]! - v) * amount))
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Text colour for a fill: white if it reaches AA, else the ink, else black.
 * Black reaches at least 4.58 on any colour white does not, so the result
 * always passes.
 */
export function readableOn(fill: string, ink: string): string {
  if (contrastRatio(fill, WHITE) >= AA_TEXT) return WHITE
  if (contrastRatio(fill, ink) >= AA_TEXT) return ink
  return BLACK
}

/**
 * `hex` moved towards black or white (whichever separates it from `on`
 * more) in 1% steps, by the least amount that reaches `ratio` against `on`.
 * Unchanged when it already passes.
 */
export function nudgeToContrast(
  hex: string,
  on: string,
  ratio: number
): string {
  if (contrastRatio(hex, on) >= ratio) return hex
  const towards =
    contrastRatio(BLACK, on) >= contrastRatio(WHITE, on) ? BLACK : WHITE
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(hex, towards, step / 100)
    if (contrastRatio(candidate, on) >= ratio) return candidate
  }
  return towards
}
