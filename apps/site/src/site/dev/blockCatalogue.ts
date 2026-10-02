import type { CatalogueEntry } from "../../blocks/catalogue"
import { backgroundOf } from "../blocks/BlockSection"
import type { BlockOf, PageBlock } from "../blocks/types"
import { sampleFor } from "../blocks/samples"

export type Query = Record<string, string | string[] | undefined>

/** Never set from a query: what makes the Block what it is. */
const FIXED = new Set(["blockType", "id", "blockName"])

/**
 * A Block's sample as a catalogue page shows it: the sample with its
 * fields overridden by the page's query (`?background=dark`,
 * `?count=3`). Only plain values the sample already has can be set, and a
 * number field takes a number. `?variant=` sets the Block's own variant
 * field (`entry.variantField`). `?fixtures=` and `?container=` are for the
 * page, not the Block.
 */
export function sampleWithQuery(
  entry: CatalogueEntry,
  query: Query,
  sample: PageBlock = sampleFor(entry.blockType)
): PageBlock {
  const block: Record<string, unknown> = { ...sample }
  for (const [key, raw] of Object.entries(query)) {
    const value = Array.isArray(raw) ? raw[0] : raw
    const field = key === "variant" ? entry.variantField : key
    if (value === undefined || !field || FIXED.has(field)) continue
    // A sample says nothing of its text colour: every Block with a
    // background has one, Automatic unless the query sets it.
    if (field === "textColour" && Object.hasOwn(block, "background")) {
      block[field] = value
      continue
    }
    if (!Object.hasOwn(block, field)) continue
    const current = block[field]
    if (typeof current === "string") {
      block[field] = value
    } else if (typeof current === "number") {
      const number = Number(value)
      if (value.trim() !== "" && Number.isFinite(number)) block[field] = number
    }
  }
  return block as unknown as PageBlock
}

type Columns = BlockOf<"container">["columns"]

const COLUMNS: readonly Columns[] = ["1", "2", "3", "4"]

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/**
 * `block` as a catalogue page shows it inside a Container: with
 * `?container=<background>`, in a Container on that background (Default
 * when it is not one), one column, or `?columns=2` to `4` with the Block in
 * each. Without the parameter, `block` itself.
 */
export function sampleInContainer(block: PageBlock, query: Query): PageBlock {
  const raw = first(query.container)
  if (raw === undefined) return block
  const asked = first(query.columns)
  const columns = COLUMNS.find((n) => n === asked) ?? "1"
  const container: BlockOf<"container"> = {
    blockType: "container",
    columns,
    gap: "medium",
    align: "top",
    width: "page",
    background: backgroundOf(raw),
    // A sample is at most a Container of plain Blocks, so it fits a level down.
    children: Array.from(
      { length: Number(columns) },
      () => block
    ) as BlockOf<"container">["children"],
  }
  return container
}
