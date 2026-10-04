import { APIError, type CollectionConfig } from "payload"

import { anyone, signedIn } from "../access"
import { FONT_KINDS, FONT_STYLES, FONT_WEIGHTS } from "../fonts/types"
import { getFontUsages } from "../fonts/fontUsage"
import { FONT_FILES_SLUG } from "../storage"

/** A family name safe to put in a CSS string and show in a picker. */
const FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u
const MAX_FAMILY_LENGTH = 60

type FileRow = { weight?: number | null; style?: string | null }

/** A Font can't have two files of the same weight and style. */
export function duplicateFile(rows: readonly FileRow[]): string | null {
  const seen = new Set<string>()
  for (const { weight, style } of rows) {
    const key = `${weight} ${style ?? "normal"}`
    if (seen.has(key)) {
      return `Two files have the same weight and style (${
        style === "italic" ? "italic " : ""
      }${weight}). Keep one.`
    }
    seen.add(key)
  }
  return null
}

/**
 * A Font: a family Users added for the Theme to use, as files of different
 * weights and styles, uploaded or downloaded from Google Fonts (see
 * src/fonts/importGoogleFont.ts). Not Media: its files live in their own
 * collection (`font-files`) and are served by the Site itself. The built-in
 * fonts (src/fonts/builtIn.ts) are not stored here.
 */
export const Fonts: CollectionConfig = {
  slug: "fonts",
  labels: { singular: "Font", plural: "Fonts" },
  admin: {
    useAsTitle: "family",
    defaultColumns: ["family", "kind", "source", "updatedAt"],
    listSearchableFields: ["family"],
    group: "Assets",
  },
  access: {
    create: signedIn,
    read: anyone,
    update: signedIn,
    delete: signedIn,
  },
  hooks: {
    // The Theme (and anything else that registers a finder in
    // src/fonts/fontUsage.ts) can hold on to a Font. Deleting it then would
    // leave text with no font, so it is refused, naming what uses it.
    beforeDelete: [
      async ({ id, req }) => {
        const fontId = Number(id)
        const usages = await getFontUsages(fontId, {
          payload: req.payload,
          req,
        })
        if (usages.length === 0) return
        const font = await req.payload.findByID({
          collection: "fonts",
          id: fontId,
          depth: 0,
          req,
        })
        throw new APIError(
          `${font.family} can't be deleted. ${usages.join("; ")}.`,
          409,
          { usages },
          true
        )
      },
    ],
    // The files belong to the Font alone, so they go with it. A variable
    // font can be one file behind several weights: each is deleted once.
    afterDelete: [
      async ({ doc, req }) => {
        const ids = new Set<number>(
          (doc.files ?? []).map((row: { file: number | { id: number } }) =>
            typeof row.file === "object" ? row.file.id : row.file
          )
        )
        for (const id of ids) {
          try {
            await req.payload.delete({
              collection: FONT_FILES_SLUG,
              id,
              req,
            })
          } catch (error) {
            req.payload.logger.warn(
              { err: error },
              `Couldn't delete font file ${id} of ${doc.family}`
            )
          }
        }
      },
    ],
  },
  fields: [
    {
      name: "family",
      type: "text",
      required: true,
      unique: true,
      validate: (value: string | null | undefined) => {
        const name = value?.trim() ?? ""
        if (!name) return "Enter the font family's name."
        if (name.length > MAX_FAMILY_LENGTH || !FAMILY.test(name)) {
          return "Use up to 60 letters, numbers, spaces and . _ ' - characters."
        }
        return true
      },
      admin: {
        description:
          "The name the Theme shows, and the CSS font-family. For a Google Font, its name on Google Fonts.",
      },
    },
    {
      name: "kind",
      type: "select",
      required: true,
      options: [
        { label: "Serif", value: "serif" },
        { label: "Sans serif", value: "sans" },
        { label: "Slab serif", value: "slab" },
      ] satisfies { label: string; value: (typeof FONT_KINDS)[number] }[],
    },
    {
      name: "source",
      type: "select",
      defaultValue: "uploaded",
      options: [
        { label: "Uploaded", value: "uploaded" },
        { label: "Google Fonts", value: "google" },
      ],
      admin: { description: "Where the files came from.", readOnly: true },
    },
    {
      name: "files",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "File", plural: "Files" },
      validate: (rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) {
          return "Add at least one font file."
        }
        return duplicateFile(rows as FileRow[]) ?? true
      },
      fields: [
        {
          name: "weight",
          type: "number",
          required: true,
          defaultValue: 400,
          min: FONT_WEIGHTS[0],
          max: FONT_WEIGHTS[FONT_WEIGHTS.length - 1],
          validate: (value: number | null | undefined) =>
            (FONT_WEIGHTS as readonly number[]).includes(value as number) ||
            "Use 100, 200, 300, 400, 500, 600, 700, 800 or 900.",
        },
        {
          name: "style",
          type: "select",
          required: true,
          defaultValue: "normal",
          options: FONT_STYLES.map((value) => ({
            label: value === "normal" ? "Normal" : "Italic",
            value,
          })),
        },
        {
          name: "file",
          type: "upload",
          relationTo: FONT_FILES_SLUG,
          required: true,
        },
      ],
    },
  ],
}
