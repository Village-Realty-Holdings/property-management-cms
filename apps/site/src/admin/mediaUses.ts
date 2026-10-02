import type { Block, Field } from "payload"

import { hasColumns } from "../blocks/Container"

/**
 * Finds every Media image a document shows, by walking its data alongside the
 * Payload config of its fields: any `upload` (or `relationship`) field that
 * points at Media counts, however deep it sits (in a Block, an array row, a
 * group, a tab) and in whichever Block. A Block that gains an image field is
 * found with no change here.
 */

/** One place an image is used. */
export type MediaUse = {
  mediaId: number
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

type LooseField = Field & {
  name?: string
  label?: unknown
  labels?: { singular?: unknown }
  fields?: Field[]
  tabs?: { name?: string; fields: Field[] }[]
  blocks?: (Block | string)[]
  blockReferences?: (Block | string)[]
  relationTo?: string | string[]
  hasMany?: boolean
}

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

const blocksOf = (field: LooseField): Block[] =>
  [...(field.blocks ?? []), ...(field.blockReferences ?? [])].filter(
    (block): block is Block => typeof block === "object"
  )

const pointsAtMedia = (field: LooseField) =>
  field.type === "upload" || field.type === "relationship"
    ? [field.relationTo].flat().includes("media")
    : false

/** The Media ids a stored upload value holds: an id, a doc, a list of either. */
function mediaIds(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(mediaIds)
  if (typeof value === "number") return [value]
  if (value && typeof value === "object") {
    // A polymorphic relationship stores { relationTo, value }.
    const poly = value as { relationTo?: string; value?: unknown; id?: unknown }
    if ("relationTo" in poly) {
      return poly.relationTo === "media" ? mediaIds(poly.value) : []
    }
    return typeof poly.id === "number" ? [poly.id] : []
  }
  return []
}

/** Whether any field in the config (at any depth) holds a Media image. */
export function hasMediaField(fields: readonly Field[]): boolean {
  return (fields as LooseField[]).some((field) => {
    if (pointsAtMedia(field)) return true
    if (field.type === "tabs") {
      return (field.tabs ?? []).some((tab) => hasMediaField(tab.fields))
    }
    if (field.type === "blocks") {
      return blocksOf(field).some((block) => hasMediaField(block.fields))
    }
    return "fields" in field && field.fields
      ? hasMediaField(field.fields)
      : false
  })
}

type Walk = {
  /** What names the place so far inside the current Block. */
  trail: string[]
  block?: MediaUse["block"]
}

/**
 * Every Media image `data` (a document, or part of one, stored at depth 0 or
 * more) shows, with where. `fields` is the config of its fields.
 */
export function mediaUses(fields: readonly Field[], data: unknown): MediaUse[] {
  const found: MediaUse[] = []
  walkFields(fields as LooseField[], data, { trail: [] }, found)
  return found
}

function walkFields(
  fields: LooseField[],
  data: unknown,
  at: Walk,
  found: MediaUse[]
) {
  const record = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >

  for (const field of fields) {
    const value = field.name ? record[field.name] : undefined
    switch (field.type) {
      case "row":
      case "collapsible":
        walkFields(field.fields as LooseField[], data, at, found)
        break
      case "tabs":
        for (const tab of field.tabs ?? []) {
          walkFields(
            tab.fields as LooseField[],
            tab.name ? record[tab.name] : data,
            at,
            found
          )
        }
        break
      case "group":
        walkFields(
          field.fields as LooseField[],
          value,
          // A group inside a Block is part of the name: two groups can each
          // have an "image".
          at.block ? { ...at, trail: [...at.trail, labelOf(field)] } : at,
          found
        )
        break
      case "array":
        ;(Array.isArray(value) ? value : []).forEach((row, index) =>
          walkFields(
            field.fields as LooseField[],
            row,
            {
              ...at,
              trail: [...at.trail, `${singularOf(field)} ${index + 1}`],
            },
            found
          )
        )
        break
      case "blocks":
        ;(Array.isArray(value) ? value : []).forEach((row, index) => {
          const slug = (row as { blockType?: string } | null)?.blockType
          const block = blocksOf(field).find((b) => b.slug === slug)
          if (!block) return
          const id = (row as { id?: unknown }).id
          // A Block inside a Block is named by its place in the outer one:
          // "Block 2, Container, Column 1, Image".
          const place = at.block
            ? [
                at.block.label,
                ...at.trail,
                `${hasColumns(record) ? "Column" : singularOf(field)} ${index + 1}`,
              ].join(", ")
            : `${singularOf(field)} ${index + 1}`
          walkFields(
            block.fields as LooseField[],
            row,
            {
              trail: [],
              block: {
                id: typeof id === "string" ? id : null,
                label: `${place}, ${blockLabel(block)}`,
              },
            },
            found
          )
        })
        break
      default:
        if (pointsAtMedia(field)) {
          for (const mediaId of mediaIds(value)) {
            found.push({
              mediaId,
              block: at.block,
              where: [...at.trail, labelOf(field)].join(": "),
            })
          }
        } else if ("fields" in field && field.fields) {
          walkFields(field.fields as LooseField[], value, at, found)
        }
    }
  }
}
