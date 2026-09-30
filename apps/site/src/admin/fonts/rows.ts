import type { StoredFont } from "../../fonts/available"
import { BUILT_IN_FONTS } from "../../fonts/builtIn"
import { fontFaceCss } from "../../fonts/fontFace"
import type { FontKind, FontStyle } from "../../fonts/types"
import {
  faceLabel,
  kindLabel,
  sortFaces,
  sourceLabel,
  weightsSummary,
  type FontSource,
} from "./labels"

/**
 * What the Fonts screen shows, worked out from the stored Fonts and what uses
 * them. Pure: the page loads the data (fontsScreen.ts), this shapes it.
 */

/** The sample line every Font is shown with. */
export const SAMPLE_TEXT = "Sunny mornings, quiet evenings by the sea."

/** A stored Font with the files' public URLs, as the screen needs it. */
export type StoredFontRecord = StoredFont & { source: FontSource }

export type FaceView = {
  weight: number
  style: FontStyle
  label: string
}

export type StoredFaceView = FaceView & { url: string }

export type FontRow = {
  id: number
  family: string
  kind: FontKind
  kindLabel: string
  sourceLabel: string
  summary: string
  faces: StoredFaceView[]
  /** The CSS font-family that shows this Font's own files (see sampleCss). */
  sampleFamily: string
  /** What uses the Font, from the Font usage registry. */
  usages: string[]
  locked: boolean
  /** Why Delete is unavailable, or null when the Font can be deleted. */
  deleteBlockedReason: string | null
}

export type BuiltInRow = {
  family: string
  kindLabel: string
  summary: string
  faces: FaceView[]
  /** A CSS font-family value: the variable next/font defines for the font. */
  sampleFontFamily: string
}

/**
 * Each stored Font is sampled under a family of its own, not its name, so a
 * Font named like a built-in one (or like an installed one) can't be shown in
 * the wrong face.
 */
function sampleFamilyOf(id: number): string {
  return `admin-font-sample-${id}`
}

export function buildFontRows(
  fonts: readonly StoredFontRecord[],
  usagesById: ReadonlyMap<number, readonly string[]>
): FontRow[] {
  return fonts.map((font) => {
    const usages = [...(usagesById.get(font.id) ?? [])]
    const locked = usages.length > 0
    const faces = sortFaces(font.files)
    return {
      id: font.id,
      family: font.family,
      kind: font.kind,
      kindLabel: kindLabel(font.kind),
      sourceLabel: sourceLabel(font.source),
      summary: weightsSummary(faces),
      faces: faces.map((face) => ({
        weight: face.weight,
        style: face.style,
        label: faceLabel(face),
        url: face.url,
      })),
      sampleFamily: sampleFamilyOf(font.id),
      usages,
      locked,
      deleteBlockedReason: locked
        ? `${font.family} is in use, so it can't be deleted. Change what uses it first.`
        : null,
    }
  })
}

/**
 * `@font-face` rules that load each Font's files under its sample family. The
 * files are the Site's own (fontFaceCss drops any origin), so the Admin makes
 * no call to Google either.
 */
export function sampleCss(rows: readonly FontRow[]): string {
  return fontFaceCss(
    rows.map((row) => ({
      id: row.id,
      family: row.sampleFamily,
      kind: row.kind,
      files: row.faces,
    }))
  )
}

export function builtInRows(): BuiltInRow[] {
  return BUILT_IN_FONTS.map((font) => {
    const faces = font.weights.map((weight) => ({
      weight,
      style: "normal" as const,
    }))
    return {
      family: font.family,
      kindLabel: kindLabel(font.kind),
      summary: weightsSummary(faces),
      faces: faces.map((face) => ({ ...face, label: faceLabel(face) })),
      sampleFontFamily: `var(${font.cssVariable})`,
    }
  })
}
