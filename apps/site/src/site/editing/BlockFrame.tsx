import type { ReactNode } from "react"

/** Where a Block is: its list in the document being edited. */
export type BlockRegion = "page" | "header" | "footer"

/** What the overlay looks for: every Block in editing mode carries this. */
export const BLOCK_SELECTOR = "[data-block-id]"

/** What a framed Block is, and where. */
export type FramePlace = {
  id: string | null | undefined
  blockType: string
  region: BlockRegion
  index: number
  /** The Container it is in, by id; unset for a Block of the region itself. */
  parentId?: string | null
}

/**
 * The attributes that frame a Block while the Visual Editor draws it, so the
 * overlay can tell which Block the pointer is over and what a click means:
 *
 *  - `data-block-id`: the Block's id, which the Admin's requests name it by.
 *    A Block with no id is not framed with one, so it cannot be selected.
 *  - `data-block-type`: what the Block is (`blockType`), which names it in the
 *    overlay's label.
 *  - `data-block-region`: "page", "header" or "footer".
 *  - `data-block-parent`: the id of the Container it is in, when it is in one.
 *  - `data-block-index`: its place in its list (the region's, or its
 *    Container's), counting from 0. (The `data-block-index` on a Block's
 *    plain text is the Block's `context.index`, which for a region Block is
 *    offset: see `regionIndexBase`.)
 *
 * Frames nest as Blocks do: the innermost frame around an element is the
 * Block it belongs to.
 */
export function frameAttributes({
  id,
  blockType,
  region,
  index,
  parentId,
}: FramePlace): Record<`data-${string}`, string | number | undefined> {
  return {
    "data-block-id": id ?? undefined,
    "data-block-type": blockType,
    "data-block-region": region,
    "data-block-parent": parentId ?? undefined,
    "data-block-index": index,
  }
}

/**
 * What a Block is wrapped in while the Visual Editor draws it (see
 * `frameAttributes`). The wrapper has no box of its own (`display:
 * contents`), so the Block lays out exactly as it does on the Site. A
 * Container frames the Blocks it holds on their cells instead, which are
 * boxes on the Site too.
 */
export function BlockFrame({
  children,
  ...place
}: FramePlace & { children: ReactNode }) {
  return (
    <div {...frameAttributes(place)} style={{ display: "contents" }}>
      {children}
    </div>
  )
}
