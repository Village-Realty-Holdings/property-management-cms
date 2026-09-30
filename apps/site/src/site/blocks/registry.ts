import { createElement } from "react"

import { CallToActionBlock } from "./CallToActionBlock"
import { HeroBlock } from "./HeroBlock"
import { RichTextBlock } from "./RichTextBlock"
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
  richText: RichTextBlock,
  callToAction: CallToActionBlock,
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
