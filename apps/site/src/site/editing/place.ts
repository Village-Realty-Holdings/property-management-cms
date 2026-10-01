import type { Region } from "../../admin/editor/state"

const REGIONS: readonly Region[] = ["page", "header", "footer"]

/**
 * Where the Block that holds `el` is: its region, and its place in that
 * region's list. Read from the Block's frame (see BlockFrame), because a
 * region Block's `context.index` is offset to keep its heading ids apart from
 * the Page's. With no frame (a Block drawn on its own), it is the Page's Block
 * at `fallbackIndex`.
 */
export function placeOf(
  el: Element,
  fallbackIndex: number
): { region: Region; index: number } {
  const frame = el.closest<HTMLElement>("[data-block-region]")
  const region = frame?.dataset.blockRegion as Region | undefined
  const index = Number(frame?.dataset.blockIndex)
  return frame && region && REGIONS.includes(region) && Number.isInteger(index)
    ? { region, index }
    : { region: "page", index: fallbackIndex }
}
