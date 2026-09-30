import type { BlockOf, BlockType } from "../types"
import { callToActionSample } from "./callToAction"
import { heroSample } from "./hero"
import { richTextSample } from "./richText"

/**
 * Sample data for every Block: every field and option filled, so the
 * catalogue page (/dev/blocks), the tests and the screenshots show the
 * Block at its fullest. The compiler asks for one whenever a Block is added.
 */
export const samples: { [T in BlockType]: BlockOf<T> } = {
  hero: heroSample,
  richText: richTextSample,
  callToAction: callToActionSample,
}

/** The sample for a Block type. */
export function sampleFor<T extends BlockType>(blockType: T): BlockOf<T> {
  return samples[blockType]
}
