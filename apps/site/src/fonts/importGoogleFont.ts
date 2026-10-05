import type { Payload } from "payload"

import type { Font } from "../payload-types"
import { FONT_FILES_SLUG } from "../storage"
import {
  downloadGoogleFont,
  GoogleFontError,
  validateFamily,
  type DownloadOptions,
  type GoogleFontRequest,
} from "./googleFonts"
import { FONT_KINDS, type FontKind } from "./types"

export type ImportGoogleFontInput = GoogleFontRequest & {
  /** Serif, sans or slab: Google's data doesn't say, so users choose. */
  kind: FontKind
}

export type ImportGoogleFontOptions = Pick<
  DownloadOptions,
  "fetch" | "maxFileBytes"
> & {
  /**
   * Local API options that apply a User's access rules, as `requireUser()`
   * returns in `as`. Leave out for server code that has already checked.
   */
  as?: { overrideAccess: false; user: NonNullable<unknown> }
}

/**
 * Adds a Google Font: downloads its WOFF2 files for the chosen weights and
 * styles, stores them as font files, and creates the Font. The Site then
 * serves the files itself from its own origin, so no visitor's browser ever
 * asks Google for them.
 *
 * All or nothing. Everything is downloaded before anything is stored, and if
 * storing fails partway the files already stored are removed. Throws a
 * `GoogleFontError` (with a message a User can read) for bad input, an
 * unknown family, a weight the family doesn't have, a family that is already
 * a Font, or a failed download.
 *
 * The Fonts screen calls this from a Server Action. Only the family name is
 * user input that reaches a URL, and it is checked to be letters, digits and
 * spaces before anything is requested.
 */
export async function importGoogleFont(
  payload: Payload,
  input: ImportGoogleFontInput,
  options: ImportGoogleFontOptions = {}
): Promise<Font> {
  const family = validateFamily(input.family)
  if (!FONT_KINDS.includes(input.kind)) {
    throw new GoogleFontError(
      "invalid-input",
      "Choose whether the font is serif, sans serif or slab serif."
    )
  }
  const access = options.as ?? {}

  const existing = await payload.find({
    collection: "fonts",
    where: { family: { equals: family } },
    limit: 1,
    depth: 0,
    pagination: false,
    ...access,
  })
  if (existing.docs.length > 0) {
    throw new GoogleFontError("already-added", `${family} is already in Fonts.`)
  }

  const downloaded = await downloadGoogleFont(
    { family, weights: input.weights, styles: input.styles },
    { fetch: options.fetch, maxFileBytes: options.maxFileBytes }
  )

  const slug = family.toLowerCase().replaceAll(" ", "-")
  const stored: number[] = []
  // A variable font's weights can share one download: store it once.
  const idOfData = new Map<Buffer, number>()
  try {
    const rows: { weight: number; style: "normal" | "italic"; file: number }[] =
      []
    for (const file of downloaded.files) {
      let id = idOfData.get(file.data)
      if (id === undefined) {
        const name = `${slug}-${file.weight}-${file.style}.woff2`
        const doc = await payload.create({
          collection: FONT_FILES_SLUG,
          data: {},
          file: {
            data: file.data,
            mimetype: "font/woff2",
            name,
            size: file.data.length,
          },
          ...access,
        })
        id = doc.id
        stored.push(id)
        idOfData.set(file.data, id)
      }
      rows.push({ weight: file.weight, style: file.style, file: id })
    }
    return await payload.create({
      collection: "fonts",
      data: { family, kind: input.kind, source: "google", files: rows },
      ...access,
    })
  } catch (error) {
    for (const id of stored) {
      await payload
        .delete({ collection: FONT_FILES_SLUG, id, ...access })
        .catch(() => undefined)
    }
    throw error
  }
}
