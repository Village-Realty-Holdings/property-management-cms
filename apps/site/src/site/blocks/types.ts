import type { ReactNode } from "react"

import type { Page } from "../../payload-types"
import type { SiteFixtures } from "../fixtures/types"

/** A Block as stored on a Page. */
export type PageBlock = NonNullable<Page["blocks"]>[number]

/** The name a Block is stored under: "hero", "richText", … */
export type BlockType = PageBlock["blockType"]

/** The stored shape of the Block named `T`. */
export type BlockOf<T extends BlockType> = Extract<PageBlock, { blockType: T }>

/**
 * What a Block is rendered in: where it sits (its position sets heading
 * levels and preloading), the Site's fixtures (Rentals and blog posts), and
 * whether the Visual Editor is showing it (see `EditableText`).
 */
export type BlockContext = {
  index: number
  fixtures: SiteFixtures
  editing: boolean
}

/**
 * A Block's render function. It is pure and isomorphic: the same
 * `(block, context)` gives the same markup on the server and in the Visual
 * Editor's canvas, so it never fetches data; whatever it shows comes in
 * through `block` and `context`.
 */
export type BlockComponent<B extends PageBlock = PageBlock> = (props: {
  block: B
  context: BlockContext
}) => ReactNode

/** Page width and side padding shared by every Block section. */
export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"

/**
 * Vertical padding of a Block section: the Theme's --section-y, one and a
 * half times taller from the `sm` breakpoint up.
 */
export const sectionY = "py-(--section-y) sm:py-[calc(var(--section-y)*1.4)]"
