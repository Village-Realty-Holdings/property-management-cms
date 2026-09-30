/** How a Font looks, for grouping in pickers: serif, sans or slab serif. */
export const FONT_KINDS = ["serif", "sans", "slab"] as const
export type FontKind = (typeof FONT_KINDS)[number]

export const FONT_STYLES = ["normal", "italic"] as const
export type FontStyle = (typeof FONT_STYLES)[number]

/** The CSS weights a Font file can have. */
export const FONT_WEIGHTS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900,
] as const
export type FontWeight = (typeof FONT_WEIGHTS)[number]
