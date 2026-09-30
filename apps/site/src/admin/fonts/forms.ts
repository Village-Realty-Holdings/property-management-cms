import { GoogleFontError, validateFamily } from "../../fonts/googleFonts"
import {
  FONT_KINDS,
  FONT_STYLES,
  FONT_WEIGHTS,
  type FontKind,
  type FontStyle,
} from "../../fonts/types"
import { faceLabel } from "./labels"

/**
 * Reading the Fonts screen's two forms (Add Google Font, Upload files) into
 * values. Pure: the Server Actions run it on what the browser sent, so it
 * checks everything again. Field errors are keyed like Payload's
 * (`family`, `files.0.weight`) so a form shows them beside the field.
 */

export type ParseResult<V> =
  | { ok: true; values: V }
  | { ok: false; fieldErrors: Record<string, string>; message?: string }

export type GoogleFontValues = {
  family: string
  kind: FontKind
  weights: number[]
  styles: FontStyle[]
}

export type UploadFontValues = {
  family: string
  kind: FontKind
  files: { weight: number; style: FontStyle; file: File }[]
}

/**
 * Largest upload the screen accepts, in total. Next's Server Action body
 * limit is 10 MB (next.config.ts) and covers the form fields too.
 */
export const MAX_UPLOAD_BYTES = 9 * 1024 * 1024

const KIND_ERROR = "Choose serif, sans serif or slab serif."
const WEIGHT_ERROR = "Choose at least one weight."

/** A family name safe to put in a CSS string (the Fonts collection's rule). */
const UPLOAD_FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u
const MAX_FAMILY_LENGTH = 60
const FONT_EXTENSIONS = ["woff2", "woff", "ttf", "otf"]

function text(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === "string" ? value : ""
}

function kindOf(value: string): FontKind | undefined {
  return FONT_KINDS.find((kind) => kind === value)
}

function weightOf(value: unknown): number | undefined {
  const weight = Number(value)
  return FONT_WEIGHTS.find((w) => w === weight)
}

function styleOf(value: unknown): FontStyle | undefined {
  return FONT_STYLES.find((style) => style === value)
}

export function parseGoogleFontForm(
  data: FormData
): ParseResult<GoogleFontValues> {
  const fieldErrors: Record<string, string> = {}

  let family = ""
  try {
    family = validateFamily(text(data, "family"))
  } catch (error) {
    if (!(error instanceof GoogleFontError)) throw error
    fieldErrors.family = error.message
  }

  const kind = kindOf(text(data, "kind"))
  if (!kind) fieldErrors.kind = KIND_ERROR

  const weights = [
    ...new Set(
      data
        .getAll("weight")
        .map(weightOf)
        .filter((w): w is number => w !== undefined)
    ),
  ].sort((a, b) => a - b)
  if (weights.length === 0) fieldErrors.weights = WEIGHT_ERROR

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  const italic = data.get("italic") !== null
  return {
    ok: true,
    values: {
      family,
      kind: kind!,
      weights,
      styles: italic ? ["normal", "italic"] : ["normal"],
    },
  }
}

export function parseUploadFontForm(
  data: FormData
): ParseResult<UploadFontValues> {
  const fieldErrors: Record<string, string> = {}

  const family = text(data, "family").trim()
  if (!family) {
    fieldErrors.family = "Enter the font family's name."
  } else if (family.length > MAX_FAMILY_LENGTH || !UPLOAD_FAMILY.test(family)) {
    fieldErrors.family =
      "Use up to 60 letters, numbers, spaces and . _ ' - characters."
  }

  const kind = kindOf(text(data, "kind"))
  if (!kind) fieldErrors.kind = KIND_ERROR

  const files = data.getAll("file")
  const weights = data.getAll("weight")
  const styles = data.getAll("style")
  if (files.length === 0) {
    return {
      ok: false,
      fieldErrors,
      message: "Add at least one font file.",
    }
  }

  const rows: UploadFontValues["files"] = []
  const seen = new Set<string>()
  let total = 0
  files.forEach((file, index) => {
    const key = (field: string) => `files.${index}.${field}`
    if (!(file instanceof File) || file.size === 0 || !file.name) {
      fieldErrors[key("file")] = "Choose a font file."
    } else if (
      !FONT_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? "")
    ) {
      fieldErrors[key("file")] =
        "Font files must be .woff2, .woff, .ttf or .otf."
    } else {
      total += file.size
    }

    const weight = weightOf(weights[index])
    if (weight === undefined) {
      fieldErrors[key("weight")] =
        "Use 100, 200, 300, 400, 500, 600, 700, 800 or 900."
    }
    const style = styleOf(styles[index])
    if (!style) fieldErrors[key("style")] = "Choose normal or italic."

    if (weight !== undefined && style) {
      const face = `${weight} ${style}`
      if (seen.has(face)) {
        fieldErrors[key("weight")] =
          `Another file is already ${faceLabel({ weight, style })}. Change the weight or style.`
      }
      seen.add(face)
      if (file instanceof File) rows.push({ weight, style, file })
    }
  })

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  if (total > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      fieldErrors: {},
      message: `These files are too large to upload together (${MAX_UPLOAD_BYTES / 1024 / 1024} MB at most). Use fewer weights, or WOFF2 files, which are smaller.`,
    }
  }
  return { ok: true, values: { family, kind: kind!, files: rows } }
}

const MAGIC_HEADERS: Record<string, readonly (readonly number[])[]> = {
  woff2: [[0x77, 0x4f, 0x46, 0x32]], // "wOF2"
  woff: [[0x77, 0x4f, 0x46, 0x46]], // "wOFF"
  ttf: [
    [0x00, 0x01, 0x00, 0x00],
    [0x74, 0x72, 0x75, 0x65], // "true"
  ],
  otf: [[0x4f, 0x54, 0x54, 0x4f]], // "OTTO"
}

/**
 * Whether a file's first bytes are those of the format its extension names.
 * A browser types a file by its name alone, so a page renamed `x.woff2` would
 * otherwise be stored as a font. Returns a message, or null when it fits.
 */
export function fontBytesProblem(
  filename: string,
  bytes: Uint8Array
): string | null {
  const extension = filename.split(".").pop()?.toLowerCase() ?? ""
  const matches = MAGIC_HEADERS[extension]?.some((header) =>
    header.every((byte, i) => bytes[i] === byte)
  )
  return matches ? null : `This file's contents aren't a .${extension} font.`
}
