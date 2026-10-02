import type { Block, Field } from "payload"

import { hasColumns } from "../../blocks/Container"

/**
 * Walks a document's data alongside the Payload config of its fields, however
 * deep a field sits (in a Block, an array row, a group, a tab, a Block inside
 * a Container), names each place, and lets the caller put another value
 * there. Nothing is changed in place: what comes back shares every part the
 * caller left alone, so an untouched document comes back as itself.
 */

export type LooseField = Field & {
  name?: string
  label?: unknown
  labels?: { singular?: unknown }
  fields?: Field[]
  tabs?: { name?: string; fields: Field[] }[]
  blocks?: (Block | string)[]
  blockReferences?: (Block | string)[]
  relationTo?: string | string[]
  hasMany?: boolean
  custom?: Record<string, unknown>
}

/** One field's value, and where it is. */
export type Leaf = {
  field: LooseField
  value: unknown
  /**
   * The Block holding it, when it is in one: its row id, and how to name it
   * with its place ("Block 3, Amenities"). A Block inside a Container is
   * named from the Page down: "Block 2, Container, Column 1, Image" in a
   * Container with columns, "Block 2, Container, Block 1, Image" in a stack.
   */
  block?: { id: string | null; label: string }
  /** Where in the Block, or in the document: "Image", "Amenity 2: Image". */
  where: string
}

/** The value to store for a field: the same value changes nothing. */
export type Visit = (leaf: Leaf) => unknown

type Options = {
  /**
   * Name a group outside a Block too ("SEO: SEO title"). Inside a Block a
   * group is always part of the name: two groups can each have an "image".
   */
  nameGroups?: boolean
}

type Values = Record<string, unknown>

type At = { trail: string[]; block?: Leaf["block"] }

const isRecord = (value: unknown): value is Values =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const startCase = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase())

const labelOf = (field: LooseField) =>
  typeof field.label === "string" && field.label
    ? field.label
    : startCase(field.name ?? "")

const singularOf = (field: LooseField) =>
  typeof field.labels?.singular === "string" && field.labels.singular
    ? field.labels.singular
    : startCase(field.name ?? "")

function blockLabel(block: Block): string {
  const singular = (block.labels as { singular?: unknown } | undefined)
    ?.singular
  return typeof singular === "string" && singular
    ? singular
    : startCase(block.slug)
}

export const blocksOf = (field: LooseField): Block[] =>
  [...(field.blocks ?? []), ...(field.blockReferences ?? [])].filter(
    (block): block is Block => typeof block === "object"
  )

/** Whether the field holds a Media image (or several). */
export const pointsAtMedia = (field: LooseField) =>
  field.type === "upload" || field.type === "relationship"
    ? [field.relationTo].flat().includes("media")
    : false

/**
 * `data` (a document, or part of one) with what `visit` returns in place of
 * each field's value. `fields` is the config of its fields.
 */
export function rewriteFields(
  fields: readonly Field[],
  data: unknown,
  visit: Visit,
  options: Options = {}
): unknown {
  return rewrite(fields as LooseField[], data, { trail: [] }, visit, options)
}

function rewrite(
  fields: LooseField[],
  data: unknown,
  at: At,
  visit: Visit,
  options: Options
): unknown {
  // A part the document doesn't have is still walked, so every field is
  // visited, but there is nothing to write into.
  const source: Values = isRecord(data) ? data : {}
  let out = source
  const set = (name: string, value: unknown) => {
    if (value === out[name]) return
    out = out === source ? { ...source } : out
    out[name] = value
  }
  const within = (inner: Field[], next: At = at) => {
    out = rewrite(inner as LooseField[], out, next, visit, options) as Values
  }
  const named = (field: LooseField): At =>
    at.block || options.nameGroups
      ? { ...at, trail: [...at.trail, labelOf(field)] }
      : at

  for (const field of fields) {
    switch (field.type) {
      case "row":
      case "collapsible":
        within(field.fields)
        break
      case "tabs":
        for (const tab of field.tabs ?? []) {
          if (tab.name) {
            set(
              tab.name,
              rewrite(
                tab.fields as LooseField[],
                out[tab.name],
                at,
                visit,
                options
              )
            )
          } else {
            within(tab.fields)
          }
        }
        break
      case "group":
        if (field.name) {
          set(
            field.name,
            rewrite(
              field.fields as LooseField[],
              out[field.name],
              named(field),
              visit,
              options
            )
          )
        } else {
          within(field.fields, named(field))
        }
        break
      case "array": {
        const rows = out[field.name]
        if (!Array.isArray(rows)) break
        const next = rows.map((row, index) =>
          rewrite(
            field.fields as LooseField[],
            row,
            {
              ...at,
              trail: [...at.trail, `${singularOf(field)} ${index + 1}`],
            },
            visit,
            options
          )
        )
        if (next.some((row, index) => row !== rows[index])) {
          set(field.name, next)
        }
        break
      }
      case "blocks": {
        const rows = out[field.name]
        if (!Array.isArray(rows)) break
        const columns = hasColumns(out)
        const next = rows.map((row, index) => {
          const slug = (row as { blockType?: string } | null)?.blockType
          const block = blocksOf(field).find((b) => b.slug === slug)
          if (!block) return row
          const id = (row as { id?: unknown }).id
          // A Block inside a Block is named by its place in the outer one:
          // "Block 2, Container, Column 1, Image".
          const place = at.block
            ? [
                at.block.label,
                ...at.trail,
                `${columns ? "Column" : singularOf(field)} ${index + 1}`,
              ].join(", ")
            : `${singularOf(field)} ${index + 1}`
          return rewrite(
            block.fields as LooseField[],
            row,
            {
              trail: [],
              block: {
                id: typeof id === "string" ? id : null,
                label: `${place}, ${blockLabel(block)}`,
              },
            },
            visit,
            options
          )
        })
        if (next.some((row, index) => row !== rows[index])) {
          set(field.name, next)
        }
        break
      }
      default:
        if ("fields" in field && field.fields && !pointsAtMedia(field)) {
          if (field.name) {
            set(
              field.name,
              rewrite(
                field.fields as LooseField[],
                out[field.name],
                at,
                visit,
                options
              )
            )
          } else {
            within(field.fields)
          }
        } else if (field.name) {
          set(
            field.name,
            visit({
              field,
              value: out[field.name],
              block: at.block,
              where: [...at.trail, labelOf(field)].join(": "),
            })
          )
        }
    }
  }
  return isRecord(data) ? out : data
}
