import { AA_UI, contrastRatio } from "../../src/theme"

/**
 * Reading a focus ring from the box-shadow the browser computed, and judging
 * it against the panel it sits on (WCAG 2.4.7 Focus Visible, 1.4.11 Non-text
 * Contrast). Tailwind draws a ring as box-shadow layers: an optional gap in
 * the offset colour, then the ring, then the element's own shadow.
 */

export type ShadowLayer = {
  /** Hex, from the computed rgb()/rgba(). */
  colour: string
  alpha: number
  /** Px the layer grows beyond the element. */
  spread: number
  blur: number
}

/** The layers of a computed box-shadow, in order. */
export function parseBoxShadow(value: string): ShadowLayer[] {
  if (value.trim() === "none") return []
  return splitTopLevel(value).map(parseLayer)
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (c === "(") depth++
    else if (c === ")") depth--
    else if (c === "," && depth === 0) {
      parts.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts
}

function parseLayer(layer: string): ShadowLayer {
  const match = /rgba?\(([^)]*)\)/.exec(layer)
  if (!match) throw new Error(`Unreadable shadow colour in "${layer}"`)
  const [r, g, b, a = "1"] = match[1]!.split(/[\s,/]+/).filter(Boolean)
  const hex = [r, g, b]
    .map((v) => Number(v).toString(16).padStart(2, "0"))
    .join("")
  // The lengths: x, y, blur, spread (in px in a computed style).
  const [, , blur = 0, spread = 0] = layer
    .replace(match[0], "")
    .trim()
    .split(/\s+/)
    .map((v) => Number.parseFloat(v))
  return { colour: `#${hex}`, alpha: Number(a), spread, blur }
}

const sameLayer = (a: ShadowLayer, b: ShadowLayer) =>
  a.colour === b.colour &&
  a.alpha === b.alpha &&
  a.spread === b.spread &&
  a.blur === b.blur

/**
 * Why the focused element's ring would not be seen on `panel` (an rgb()
 * colour): empty when it would. The ring is what focus adds to the resting
 * box-shadow. It has to be opaque, reach 3:1 against the panel, and be set
 * off from the element by a gap in the panel's colour, so it is not lost
 * against a fill that is close to the panel.
 */
export function focusRingProblems({
  resting,
  focused,
  panel,
}: {
  resting: string
  focused: string
  panel: string
}): string[] {
  const before = parseBoxShadow(resting)
  const added = parseBoxShadow(focused).filter(
    (layer) => !before.some((old) => sameLayer(old, layer))
  )
  if (added.length === 0) return ["no focus ring: focus adds no box-shadow"]

  const ring = added.reduce((a, b) => (b.spread > a.spread ? b : a))
  const panelHex = parseLayer(`${panel} 0 0 0 0`).colour
  const problems: string[] = []
  if (ring.alpha < 1)
    problems.push(`the ring is not opaque (alpha ${ring.alpha})`)
  const ratio = contrastRatio(ring.colour, panelHex)
  if (ratio < AA_UI)
    problems.push(
      `ring ${ring.colour} has contrast ${ratio.toFixed(2)}:1 against the panel ${panelHex}, needs ${AA_UI}:1`
    )
  const gap = added.some(
    (layer) => layer !== ring && layer.spread > 0 && layer.colour === panelHex
  )
  if (!gap) problems.push(`the ring has no gap in the panel colour ${panelHex}`)
  return problems
}
