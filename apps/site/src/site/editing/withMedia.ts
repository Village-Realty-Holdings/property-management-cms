import type { Block, Field } from "payload"

import type { Media } from "../../payload-types"
import type { PageBlock } from "../blocks/types"

/**
 * The Visual Editor holds a Page as it is stored, at depth 0: an image field
 * holds a Media id, and the Blocks draw an image only from the Media itself
 * (see `imageOf`). The canvas puts each Media from the Site's library in place
 * of its id before drawing, so an image shows there as it does on the Site,
 * the moment it is chosen and after a reload.
 *
 * The data is walked alongside the Blocks' config, so only an `upload` field
 * that points at Media is filled in, at any depth: in a group, an array row,
 * a tab, or a Block inside a Container. An id the library doesn't have stays
 * an id, and a value already populated stays as it is.
 */
export function withMedia(
  blocks: readonly Block[],
  data: readonly PageBlock[],
  library: ReadonlyMap<number, Media>
): PageBlock[] {
  return blockRows(blocks, data, library) as PageBlock[]
}

type LooseField = Field & {
  name?: string
  fields?: Field[]
  tabs?: { name?: string; fields: Field[] }[]
  blocks?: (Block | string)[]
  blockReferences?: (Block | string)[]
  relationTo?: string | string[]
}

type Values = Record<string, unknown>

const isRecord = (value: unknown): value is Values =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const pointsAtMedia = (field: LooseField) =>
  (field.type === "upload" || field.type === "relationship") &&
  [field.relationTo].flat().includes("media")

function blockRows(
  blocks: readonly (Block | string)[],
  rows: unknown,
  library: ReadonlyMap<number, Media>
): unknown {
  if (!Array.isArray(rows)) return rows
  return rows.map((row) => {
    if (!isRecord(row)) return row
    const block = blocks.find(
      (b): b is Block => typeof b === "object" && b.slug === row.blockType
    )
    return block ? fill(block.fields as LooseField[], row, library) : row
  })
}

/** `data` with the Media of every image field in `fields` in place of its id. */
function fill(
  fields: readonly LooseField[],
  data: unknown,
  library: ReadonlyMap<number, Media>
): unknown {
  if (!isRecord(data)) return data
  let out: Values = data
  const set = (name: string, value: unknown) => {
    if (value === out[name]) return
    out = out === data ? { ...data } : out
    out[name] = value
  }
  for (const field of fields) {
    switch (field.type) {
      case "row":
      case "collapsible":
        out = fill(field.fields as LooseField[], out, library) as Values
        break
      case "tabs":
        for (const tab of field.tabs ?? []) {
          if (tab.name) {
            set(
              tab.name,
              fill(tab.fields as LooseField[], out[tab.name], library)
            )
          } else {
            out = fill(tab.fields as LooseField[], out, library) as Values
          }
        }
        break
      case "group":
        if (field.name) {
          set(
            field.name,
            fill(field.fields as LooseField[], out[field.name], library)
          )
        } else {
          out = fill(field.fields as LooseField[], out, library) as Values
        }
        break
      case "array": {
        const rows = out[field.name!]
        if (Array.isArray(rows)) {
          set(
            field.name!,
            rows.map((row) => fill(field.fields as LooseField[], row, library))
          )
        }
        break
      }
      case "blocks":
        set(
          field.name!,
          blockRows(
            [...(field.blocks ?? []), ...(field.blockReferences ?? [])],
            out[field.name!],
            library
          )
        )
        break
      default:
        if (field.name && pointsAtMedia(field)) {
          set(field.name, populated(out[field.name], library))
        }
    }
  }
  return out
}

/** An id, or a list of them, as the library's Media where it has them. */
function populated(
  value: unknown,
  library: ReadonlyMap<number, Media>
): unknown {
  if (Array.isArray(value)) {
    const next = value.map((item) => populated(item, library))
    return next.every((item, index) => item === value[index]) ? value : next
  }
  return typeof value === "number" ? (library.get(value) ?? value) : value
}
