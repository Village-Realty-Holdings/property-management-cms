import type { BlockOf, BlockType } from "../types"
import { amenitiesSample } from "./amenities"
import { callToActionSample } from "./callToAction"
import { featuresSample } from "./features"
import { heroSample } from "./hero"
import { imageTextSample } from "./imageText"
import { richTextSample } from "./richText"
import { searchHeroSample } from "./searchHero"
import { statsSample } from "./stats"
import { stepsSample } from "./steps"
import { trustStripSample } from "./trustStrip"

/**
 * Sample data for every Block: every field and option filled, so the
 * catalogue page (/dev/blocks), the tests and the screenshots show the
 * Block at its fullest. The compiler asks for one whenever a Block is added.
 */
export const samples: { [T in BlockType]: BlockOf<T> } = {
  hero: heroSample,
  searchHero: searchHeroSample,
  richText: richTextSample,
  callToAction: callToActionSample,
  steps: stepsSample,
  features: featuresSample,
  amenities: amenitiesSample,
  stats: statsSample,
  imageText: imageTextSample,
  trustStrip: trustStripSample,
}

/** The sample for a Block type. */
export function sampleFor<T extends BlockType>(blockType: T): BlockOf<T> {
  return samples[blockType]
}
