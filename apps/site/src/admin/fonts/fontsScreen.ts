import { NotFound, ValidationError, type Payload } from "payload"

import { GoogleFontError, type FetchLike } from "../../fonts/googleFonts"
import { getFontUsages } from "../../fonts/fontUsage"
import {
  importGoogleFont,
  type ImportGoogleFontOptions,
} from "../../fonts/importGoogleFont"
import { FONT_FILES_SLUG } from "../../storage"
import { earlierVersionsUsingFonts } from "../../theme/record"
import { formStateFromError, type FormState } from "../formState"
import type { Access } from "../settingsSave"
import {
  fontBytesProblem,
  parseGoogleFontForm,
  parseUploadFontForm,
} from "./forms"
import { buildFontRows, type FontRow, type StoredFontRecord } from "./rows"

/**
 * What the Fonts screen reads and does, through the Local API with the
 * caller's access (apps/site ADR-0002): the Server Actions pass the
 * User's `as`. Kept apart from the actions so it runs in tests without Next.
 */

const INVALID = "Some fields need attention."

/** What the person reads when Payload refuses a file's type or contents. */
export const NOT_A_FONT = "That file is not a WOFF2, WOFF, TTF or OTF font."

/**
 * The reason a stored font file failed, in words for the Fonts screen. Payload
 * refuses the wrong kind of file with "The following field is invalid: file"
 * and, inside, a technical detail ("Invalid MIME type: application/pdf."):
 * the person gets NOT_A_FONT and the detail goes to the log.
 */
function storeFailure(payload: Payload, fileName: string, error: unknown) {
  if (error instanceof ValidationError) {
    const onFile = error.data.errors.filter((e) => e.path === "file")
    if (onFile.length > 0) {
      payload.logger.warn(
        `Font file ${fileName} refused: ${onFile.map((e) => e.message).join("; ")}`
      )
      return NOT_A_FONT
    }
  }
  return formStateFromError(error).message ?? "Couldn't be stored."
}

/** Every stored Font as a list row, with what uses it. */
export async function loadFontRows(
  payload: Payload,
  access: Access
): Promise<FontRow[]> {
  const { docs } = await payload.find({
    collection: "fonts",
    depth: 1,
    pagination: false,
    sort: "family",
    ...access,
  })
  const fonts: StoredFontRecord[] = docs.map((font) => ({
    id: font.id,
    family: font.family,
    kind: font.kind,
    source: font.source === "google" ? "google" : "uploaded",
    files: (font.files ?? []).flatMap((row) =>
      typeof row.file === "object" && row.file.url
        ? [{ weight: row.weight, style: row.style, url: row.file.url }]
        : []
    ),
  }))
  const usages = new Map(
    await Promise.all(
      fonts.map(
        async (font) =>
          [font.id, await getFontUsages(font.id, { payload })] as const
      )
    )
  )
  const earlier = await earlierVersionsUsingFonts(payload, {
    user: access.user,
  })
  return buildFontRows(fonts, usages, earlier)
}

/**
 * Adds a Google Font from the Add Google Font form: the server downloads the
 * files and stores them, and the Site serves them itself.
 */
export async function addGoogleFontAs(
  payload: Payload,
  access: Access,
  data: FormData,
  options: { fetch?: FetchLike } = {}
): Promise<FormState> {
  const parsed = parseGoogleFontForm(data)
  if (!parsed.ok) {
    return { ok: false, message: INVALID, fieldErrors: parsed.fieldErrors }
  }
  const { family, kind, weights, styles } = parsed.values
  try {
    await importGoogleFont(
      payload,
      { family, kind, weights, styles },
      { fetch: options.fetch, as: access as ImportGoogleFontOptions["as"] }
    )
  } catch (error) {
    if (error instanceof GoogleFontError) {
      return {
        ok: false,
        message: error.message,
        ...fieldOf(error),
      }
    }
    return formStateFromError(error)
  }
  return { ok: true, message: `Added ${family}.` }
}

/** The field a Google Fonts failure belongs beside, if it has one. */
function fieldOf(error: GoogleFontError): Pick<FormState, "fieldErrors"> {
  switch (error.code) {
    case "invalid-input":
    case "unknown-family":
    case "already-added":
      return { fieldErrors: { family: error.message } }
    case "weight-unavailable":
      return { fieldErrors: { weights: error.message } }
    default:
      return {}
  }
}

const MIME_TYPES: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
}

/** Creates a Font from the files chosen in the Upload files form. */
export async function uploadFontAs(
  payload: Payload,
  access: Access,
  data: FormData
): Promise<FormState> {
  const parsed = parseUploadFontForm(data)
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message ?? INVALID,
      fieldErrors: parsed.fieldErrors,
    }
  }
  const { family, kind, files } = parsed.values

  try {
    const existing = await payload.find({
      collection: "fonts",
      where: { family: { equals: family } },
      limit: 1,
      depth: 0,
      pagination: false,
      ...access,
    })
    if (existing.docs.length > 0) {
      const message = `${family} is already in Fonts.`
      return { ok: false, message, fieldErrors: { family: message } }
    }
  } catch (error) {
    return formStateFromError(error)
  }

  // Read every file and check its bytes before storing any.
  const buffers: Buffer[] = []
  for (const [index, { file }] of files.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const problem = fontBytesProblem(file.name, buffer)
    if (problem) {
      return {
        ok: false,
        message: `${file.name}: ${problem}`,
        fieldErrors: { [`files.${index}.file`]: problem },
      }
    }
    buffers.push(buffer)
  }

  const slug = family.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")
  const stored: number[] = []
  let refused: FormState | undefined
  try {
    const rows: { weight: number; style: "normal" | "italic"; file: number }[] =
      []
    for (const [index, { weight, style, file }] of files.entries()) {
      const extension = file.name.split(".").pop()!.toLowerCase()
      const buffer = buffers[index]!
      try {
        const doc = await payload.create({
          collection: FONT_FILES_SLUG,
          data: {},
          file: {
            data: buffer,
            mimetype: MIME_TYPES[extension]!,
            name: `${slug}-${weight}-${style}.${extension}`,
            size: buffer.length,
          },
          ...access,
        })
        stored.push(doc.id)
        rows.push({ weight, style, file: doc.id })
      } catch (error) {
        const reason = storeFailure(payload, file.name, error)
        refused = {
          ok: false,
          message: `${file.name}: ${reason}`,
          fieldErrors: { [`files.${index}.file`]: reason },
        }
        break
      }
    }
    if (!refused) {
      await payload.create({
        collection: "fonts",
        data: { family, kind, source: "uploaded", files: rows },
        ...access,
      })
    }
  } catch (error) {
    await removeFiles(payload, access, stored)
    return formStateFromError(error)
  }
  // A Font is all of its files or nothing: take back those already stored.
  if (refused) {
    await removeFiles(payload, access, stored)
    return refused
  }
  return { ok: true, message: `Added ${family}.` }
}

async function removeFiles(
  payload: Payload,
  access: Access,
  ids: readonly number[]
) {
  for (const id of ids) {
    await payload
      .delete({ collection: FONT_FILES_SLUG, id, ...access })
      .catch(() => undefined)
  }
}

/**
 * Deletes a Font. The Fonts collection refuses when something uses it, with
 * an error naming what; that error is the result's message.
 */
export async function deleteFontAs(
  payload: Payload,
  access: Access,
  id: number
): Promise<FormState> {
  try {
    const font = await payload.findByID({
      collection: "fonts",
      id,
      depth: 0,
      ...access,
    })
    await payload.delete({ collection: "fonts", id, ...access })
    return { ok: true, message: `Deleted ${font.family}.` }
  } catch (error) {
    if (error instanceof NotFound) {
      return { ok: false, message: "That Font no longer exists." }
    }
    return formStateFromError(error)
  }
}
