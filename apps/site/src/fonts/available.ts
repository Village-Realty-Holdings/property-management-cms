import type { Payload } from "payload"

import { BUILT_IN_FONTS } from "./builtIn"
import type { FontKind, FontStyle } from "./types"

/** Every Font staff added, with the public URL of each file. */
export async function readStoredFonts(payload: Payload): Promise<StoredFont[]> {
  const { docs } = await payload.find({
    collection: "fonts",
    depth: 1,
    pagination: false,
    sort: "family",
  })
  return docs.map((font) => ({
    id: font.id,
    family: font.family,
    kind: font.kind,
    files: font.files.flatMap((row) =>
      typeof row.file === "object" && row.file.url
        ? [{ weight: row.weight, style: row.style, url: row.file.url }]
        : []
    ),
  }))
}

/** The built-in quick picks and the stored Fonts, for the Theme's pickers. */
export async function getAvailableFonts(
  payload: Payload
): Promise<AvailableFont[]> {
  return combineFonts(await readStoredFonts(payload))
}

/** A Font staff added, with its files' public URLs. */
export type StoredFont = {
  id: number
  family: string
  kind: FontKind
  files: { weight: number; style: FontStyle; url: string }[]
}

/**
 * A font the Theme can pick: one of the built-in quick picks or a stored
 * Font. `key` is unique across both and stable, so a Theme can store it.
 */
export type AvailableFont = {
  key: string
  source: "built-in" | "stored"
  family: string
  kind: FontKind
  weights: number[]
  /** The Font record's id, for stored Fonts only. */
  id?: number
  /** The files to serve, for stored Fonts only. */
  files?: StoredFont["files"]
}

/** The built-in quick picks, then the stored Fonts. */
export function combineFonts(stored: readonly StoredFont[]): AvailableFont[] {
  return [
    ...BUILT_IN_FONTS.map(
      (font): AvailableFont => ({
        key: `built-in:${font.family}`,
        source: "built-in",
        family: font.family,
        kind: font.kind,
        weights: [...font.weights],
      })
    ),
    ...stored.map(
      (font): AvailableFont => ({
        key: `font:${font.id}`,
        source: "stored",
        id: font.id,
        family: font.family,
        kind: font.kind,
        files: font.files.map((file) => ({ ...file })),
        weights: [...new Set(font.files.map((file) => file.weight))].sort(
          (a, b) => a - b
        ),
      })
    ),
  ]
}
