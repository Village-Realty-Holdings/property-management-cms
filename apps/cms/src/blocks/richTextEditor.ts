import { LinkFeature, lexicalEditor } from "@payloadcms/richtext-lexical"
import type { FieldAffectingData, FieldHook } from "payload"

/** A URL that contains a Variable, such as `{client-url}` or `tel:{phone}`. */
const HAS_VARIABLE = /\{[a-z0-9-]+\}/

/**
 * The link URL field, keeping Variables as typed (ADR-0017). Lexical's own
 * hook URL-encodes anything that doesn't parse as a URL, which would turn
 * `{client-url}` into `%7Bclient-url%7D`.
 */
function keepVariablesInUrl(field: FieldAffectingData): FieldAffectingData {
  if (field.type !== "text" || field.name !== "url") return field
  const encode: FieldHook[] = field.hooks?.beforeChange ?? []
  const beforeChange: FieldHook[] = [
    (args) =>
      typeof args.value === "string" && HAS_VARIABLE.test(args.value)
        ? args.value
        : encode.reduce<unknown>(
            (value, hook) => hook({ ...args, value }),
            args.value
          ),
  ]
  return { ...field, hooks: { ...field.hooks, beforeChange } }
}

/**
 * The Site-safe rich text editor, and the config's default `editor`. The
 * default Upload, Relationship and internal-link features pick documents from
 * any collection with no Site filter (and their drawers don't know the
 * document's Site), so they're off: links are URLs or Site paths ("/about"),
 * images go in image fields.
 */
export const siteSafeRichTextEditor: ReturnType<typeof lexicalEditor> =
  lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter(
        ({ key }) => !["link", "relationship", "upload"].includes(key)
      ),
      LinkFeature({
        enabledCollections: [],
        fields: ({ defaultFields }) => defaultFields.map(keepVariablesInUrl),
      }),
    ],
  })

/** Editor for rich text inside Blocks (the Site-safe editor). */
export const blockRichTextEditor: ReturnType<typeof lexicalEditor> =
  siteSafeRichTextEditor
