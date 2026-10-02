import type { Block, BlocksField } from "payload"

import { backgroundField } from "../fields/background"

/** How many Containers deep a Page goes (apps/site ADR-0007). */
export const CONTAINER_LEVELS = 3

export const containerColumns = ["1", "2", "3", "4"] as const
export const containerGaps = ["small", "medium", "large"] as const
export const containerAligns = ["top", "centre", "stretch"] as const
export const containerWidths = ["page", "reading"] as const

const CONTAINER = "container"

/** A Block's place in a list of Blocks, counting from 1: "Block 2". */
const placeOf = (index: number) => `Block ${index + 1}`

/**
 * Why the Block at `index` of `rows` can't be stored in a list that takes
 * `allowed`, or null when it can. Payload drops a Block type a list doesn't
 * take without saying so, so every list of Blocks refuses it by name instead.
 */
function refusal(
  row: unknown,
  index: number,
  allowed: readonly Block[],
  holder: string
): string | null {
  const blockType = (row as { blockType?: unknown } | null)?.blockType
  if (allowed.some((block) => block.slug === blockType)) return null
  return blockType === CONTAINER
    ? `${placeOf(index)} is a Container inside ${CONTAINER_LEVELS} Containers, and Containers go ${CONTAINER_LEVELS} levels deep. Move it up a level, or remove it.`
    : `${placeOf(index)} is a “${String(blockType)}” Block, which ${holder} can't hold. Remove it.`
}

/**
 * The first Block in `rows`, at any depth, that the list holding it doesn't
 * take: its place from the top ("Block 2, Block 1") and why. `allowed` are
 * the Blocks the list takes; a Container's own list is read from its config.
 */
export function refusedBlock(
  rows: unknown,
  allowed: readonly Block[],
  holder = "a Page"
): { place: string; message: string } | null {
  if (!Array.isArray(rows)) return null
  for (const [index, row] of rows.entries()) {
    const message = refusal(row, index, allowed, holder)
    if (message) return { place: placeOf(index), message }
    const block = allowed.find((b) => b.slug === row.blockType)
    for (const field of block?.fields ?? []) {
      if (field.type !== "blocks") continue
      const inner = refusedBlock(row[field.name], field.blocks, "a Container")
      if (inner) {
        return {
          place: `${placeOf(index)}, ${inner.place}`,
          message: `${placeOf(index)}, ${inner.message}`,
        }
      }
    }
  }
  return null
}

/**
 * A `blocks` field's rule: every Block in it is one the field takes. It
 * checks its own list only, since Payload runs the rule of each Container's
 * list in turn. Pure, so the Visual Editor runs it in the browser too.
 */
export const takesOnly =
  (allowed: readonly Block[], holder: string): BlocksField["validate"] =>
  (rows) => {
    if (!Array.isArray(rows)) return true
    for (const [index, row] of rows.entries()) {
      const message = refusal(row, index, allowed, holder)
      if (message) return message
    }
    return true
  }

/** The generated type of the Container at each level. */
const interfaceNames = [
  "ContainerBlock",
  "ContainerBlockLevel2",
  "ContainerBlockLevel3",
] as const

/**
 * A Block that holds other Blocks, as a stack or as columns side by side.
 *
 * It is written out once per level under the one `blockType`, and the last
 * level takes no Container: Payload's Postgres schema builder can't build a
 * Block that contains itself (ADR-0007). `blocks` are the Blocks a Container
 * holds besides Containers.
 *
 * Each level has its own table: `pages_blocks_container`, then `_2` and
 * `_3`. Payload numbers them as it meets the slug again on its way down, so
 * the names follow the nesting and not the Blocks a level holds. They can't
 * be pinned with `dbName`: Payload keeps one table name per slug for a
 * collection, and the three levels would read and write the last one's.
 * `container.test.ts` holds the names.
 */
export function containerOf(blocks: readonly Block[], level = 1): Block {
  const children =
    level < CONTAINER_LEVELS
      ? [...blocks, containerOf(blocks, level + 1)]
      : [...blocks]
  return {
    slug: CONTAINER,
    interfaceName: interfaceNames[level - 1],
    labels: { singular: "Container", plural: "Containers" },
    fields: [
      {
        name: "columns",
        label: "Columns",
        type: "select",
        required: true,
        defaultValue: "1",
        options: [
          { label: "1 (a stack)", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "4", value: "4" },
        ],
      },
      {
        name: "gap",
        label: "Gap",
        type: "select",
        required: true,
        defaultValue: "medium",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
        ],
      },
      {
        name: "align",
        label: "Vertical alignment",
        type: "select",
        required: true,
        defaultValue: "top",
        options: [
          { label: "Top", value: "top" },
          { label: "Centre", value: "centre" },
          { label: "Stretch", value: "stretch" },
        ],
      },
      {
        name: "width",
        label: "Width",
        type: "select",
        required: true,
        defaultValue: "page",
        options: [
          { label: "Page width", value: "page" },
          { label: "Reading width", value: "reading" },
        ],
      },
      backgroundField,
      {
        name: "children",
        label: "Blocks",
        type: "blocks",
        labels: { singular: "Block", plural: "Blocks" },
        blocks: children,
        validate: takesOnly(children, "a Container"),
      },
    ],
  }
}
