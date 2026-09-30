import type { ReactNode } from "react"

/** Where a Block is: its list in the document being edited. */
export type BlockRegion = "page" | "header" | "footer"

/** What the overlay looks for: every Block in editing mode carries this. */
export const BLOCK_SELECTOR = "[data-block-id]"

/**
 * What a Block is wrapped in while the Visual Editor draws it, so the overlay
 * can tell which Block the pointer is over and what a click means:
 *
 *  - `data-block-id`: the Block's id, which the Admin's requests name it by.
 *    A Block with no id is not wrapped with one, so it cannot be selected.
 *  - `data-block-type`: what the Block is (`blockType`), which names it in the
 *    overlay's label.
 *  - `data-block-region`: "page", "header" or "footer".
 *  - `data-block-index`: its place in that region, counting from 0. (The
 *    `data-block-index` on a Block's plain text is the Block's page-wide
 *    `index`, which for a region Block is offset: see `regionIndexBase`.)
 *
 * The wrapper has no box of its own (`display: contents`), so the Block lays
 * out exactly as it does on the Site.
 */
export function BlockFrame({
  id,
  blockType,
  region,
  index,
  children,
}: {
  id: string | null | undefined
  blockType: string
  region: BlockRegion
  index: number
  children: ReactNode
}) {
  return (
    <div
      data-block-id={id ?? undefined}
      data-block-type={blockType}
      data-block-region={region}
      data-block-index={index}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  )
}
