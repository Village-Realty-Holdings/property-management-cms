import type { Payload } from "payload"

import { BUILT_IN_FONTS } from "./builtIn"
import type { FontKind, FontStyle } from "./types"

/**
 * Every Font staff added, with the public URL of each file. Read as a
 * visitor, like every other Site read (apps/site ADR-0001): Fonts and their
 * files are public.
 */
export async function readStoredFonts(payload: Payload): Promise<StoredFont[]> {
  const { docs } = await payload.find({
    collection: "fonts",
    depth: 1,
    pagination: false,
    sort: "family",
    overrideAccess: false,
    user: null,
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

/**
 * The fonts to offer in a picker. A stored Font wins over a built-in quick
 * pick of the same family, because staff added it deliberately: the built-in
 * one is hidden while a stored Font with that family (and files to serve)
 * exists. A Theme that already names the built-in one keeps working: this
 * only shortens the list, `combineFonts` still resolves every key.
 */
export function pickerFonts(
  available: readonly AvailableFont[]
): AvailableFont[] {
  const family = (font: AvailableFont) => font.family.trim().toLowerCase()
  const storedFamilies = new Set(
    available
      .filter((font) => font.source === "stored" && font.files?.length)
      .map(family)
  )
  return available.filter(
    (font) => font.source === "stored" || !storedFamilies.has(family(font))
  )
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
