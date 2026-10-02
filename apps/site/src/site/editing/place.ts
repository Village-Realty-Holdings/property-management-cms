import { BLOCK_SELECTOR } from "./BlockFrame"

/**
 * The id of the Block that holds `el`: its innermost frame's (see
 * BlockFrame), so a text in a Block inside a Container names that Block, not
 * the Container. Null when `el` is in no framed Block with an id, which the
 * Admin could not find either.
 */
export function blockIdOf(el: Element): string | null {
  return el.closest<HTMLElement>(BLOCK_SELECTOR)?.dataset.blockId || null
}
