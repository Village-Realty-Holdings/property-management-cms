import type { ReactNode } from "react"

import type { Layout } from "../../payload-types"
import type { Brand } from "../brand"
import type { BlockContext } from "../blocks/types"

/** The two regions of a Layout. */
export type Region = "header" | "footer"

/** A Block as stored in a Layout's Header. */
export type HeaderBlock = NonNullable<Layout["header"]>[number]

/** A Block as stored in a Layout's Footer. */
export type FooterBlock = NonNullable<Layout["footer"]>[number]

/** A Block as stored in either region. */
export type RegionBlock = HeaderBlock | FooterBlock

/** The name a region Block is stored under. */
export type RegionBlockType = RegionBlock["blockType"]

/** The stored shape of the region Block named `T`. */
export type RegionBlockOf<T extends RegionBlockType> = Extract<
  RegionBlock,
  { blockType: T }
>

/**
 * The Blocks that belong to one region and have a component of their own:
 * the Header's four and the Footer's columns and Legal bar. (Newsletter and
 * Call to action, also allowed in the Footer, render through the page Block
 * registry.)
 */
export type OwnRegionBlockType = Exclude<
  RegionBlockType,
  "newsletter" | "callToAction"
>

/**
 * What a region Block is rendered in: the page Block context (the fixtures,
 * whether the Visual Editor is showing it, and `index`, the Block's place in
 * its region) plus the Site's Brand, which the Logo, the phone number, the
 * address and the social links read.
 */
export type RegionContext = BlockContext & { brand: Brand }

/**
 * A region Block's render function. Like a page Block's it is pure and
 * isomorphic: the same `(block, context)` gives the same markup on the Site
 * and in the Visual Editor's canvas, and it never fetches data.
 */
export type RegionComponent<B extends RegionBlock = RegionBlock> = (props: {
  block: B
  context: RegionContext
}) => ReactNode
