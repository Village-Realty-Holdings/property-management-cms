import { createElement } from "react"

import { renderBlock } from "../blocks/registry"
import type { PageBlock } from "../blocks/types"
import { regionTakes } from "./catalogue"
import { FooterColumns } from "./FooterColumns"
import { HeaderActions } from "./HeaderActions"
import { LegalBar } from "./LegalBar"
import { Logo } from "./Logo"
import { Navigation } from "./Navigation"
import { RegionContainer } from "./RegionContainer"
import type {
  OwnRegionBlockType,
  Region,
  RegionBlock,
  RegionBlockOf,
  RegionComponent,
  RegionContext,
} from "./types"
import { UtilityStrip } from "./UtilityStrip"

/**
 * The render function of every Block that belongs to one region, by the
 * `blockType` a Layout stores it under. The mapped type makes the compiler
 * ask for a component whenever such a Block is added to the Payload config.
 * Newsletter and Call to action, which the Footer also takes, are page
 * Blocks and render from the page Block registry.
 */
export const regionRegistry: {
  [T in OwnRegionBlockType]: RegionComponent<RegionBlockOf<T>>
} = {
  logo: Logo,
  navigation: Navigation,
  headerActions: HeaderActions,
  utilityStrip: UtilityStrip,
  footerColumns: FooterColumns,
  legalBar: LegalBar,
  container: RegionContainer,
}

/**
 * Renders a Block of a Layout's `region`: its component from the region
 * registry, or from the page Block registry for a shared Block. Nothing
 * when `region` does not take the Block (a Header Block saved in a Footer,
 * say) or the stored `blockType` is not one the Site has any more.
 */
export function renderRegionBlock(
  region: Region,
  block: RegionBlock,
  context: RegionContext
) {
  // Inside a Container the Block has a surface: the Container's.
  const inContainer = context.surface !== undefined
  if (!regionTakes(region, block.blockType, inContainer)) return null
  if (Object.hasOwn(regionRegistry, block.blockType)) {
    const Component = regionRegistry[
      block.blockType as OwnRegionBlockType
    ] as RegionComponent
    return createElement(Component, { block, context })
  }
  return renderBlock(block as PageBlock, context)
}
