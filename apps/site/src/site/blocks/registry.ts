import { createElement } from "react"

import { AmenitiesBlock } from "./AmenitiesBlock"
import { CallToActionBlock } from "./CallToActionBlock"
import { FeaturesBlock } from "./FeaturesBlock"
import { HeroBlock } from "./HeroBlock"
import { ImageTextBlock } from "./ImageTextBlock"
import { RichTextBlock } from "./RichTextBlock"
import { SearchHeroBlock } from "./SearchHeroBlock"
import { StatsBlock } from "./StatsBlock"
import { StepsBlock } from "./StepsBlock"
import { TrustStripBlock } from "./TrustStripBlock"
import type {
  BlockComponent,
  BlockContext,
  BlockOf,
  BlockType,
  PageBlock,
} from "./types"

/**
 * Every Block's render function, by the `blockType` a Page stores it under.
 * The mapped type makes the compiler ask for a component whenever a Block
 * is added to the Payload config. Used by `Block`, so the public Site, the
 * Visual Editor's canvas and the catalogue all draw a Block the same way.
 */
export const blockRegistry: { [T in BlockType]: BlockComponent<BlockOf<T>> } = {
  hero: HeroBlock,
  searchHero: SearchHeroBlock,
  richText: RichTextBlock,
  callToAction: CallToActionBlock,
  steps: StepsBlock,
  features: FeaturesBlock,
  amenities: AmenitiesBlock,
  stats: StatsBlock,
  imageText: ImageTextBlock,
  trustStrip: TrustStripBlock,
}

/**
 * Renders a Block from the registry: its component with `(block, context)`,
 * or nothing when the stored `blockType` is not one the Site has (a Block
 * removed since the Page was saved).
 */
export function renderBlock(block: PageBlock, context: BlockContext) {
  if (!Object.hasOwn(blockRegistry, block.blockType)) return null
  const Component = blockRegistry[block.blockType] as BlockComponent
  return createElement(Component, { block, context })
}
