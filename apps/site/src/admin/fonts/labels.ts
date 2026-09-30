import type { FontKind, FontStyle } from "../../fonts/types"

/** One file of a Font, as the Fonts screen describes it. */
export type Face = { weight: number; style: FontStyle }

const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
}

/** CSS's usual name for a weight, or the number when it has none. */
export function weightName(weight: number): string {
  return WEIGHT_NAMES[weight] ?? String(weight)
}

/** "700 Bold", or "400 Regular italic". */
export function faceLabel({ weight, style }: Face): string {
  return `${weight} ${weightName(weight)}${style === "italic" ? " italic" : ""}`
}

/** By weight, normal before italic. Returns a new list. */
export function sortFaces<T extends Face>(faces: readonly T[]): T[] {
  return [...faces].sort(
    (a, b) =>
      a.weight - b.weight ||
      Number(a.style === "italic") - Number(b.style === "italic")
  )
}

/** "2 weights (400, 700), with italics". */
export function weightsSummary(faces: readonly Face[]): string {
  if (faces.length === 0) return "No files"
  const weights = [...new Set(faces.map((face) => face.weight))].sort(
    (a, b) => a - b
  )
  const count = `${weights.length} ${weights.length === 1 ? "weight" : "weights"}`
  const italics = faces.some((face) => face.style === "italic")
  return `${count} (${weights.join(", ")})${italics ? ", with italics" : ""}`
}

const KIND_LABELS: Record<FontKind, string> = {
  serif: "Serif",
  sans: "Sans serif",
  slab: "Slab serif",
}

export function kindLabel(kind: FontKind): string {
  return KIND_LABELS[kind]
}

export type FontSource = "google" | "uploaded"

export function sourceLabel(source: FontSource): string {
  return source === "google" ? "Google Fonts" : "Uploaded"
}
