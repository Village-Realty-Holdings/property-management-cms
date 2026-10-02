import type { ReactNode } from "react"

import type { Background } from "../../fields/background"
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
 * levels and preloading), the Site's fixtures (Rentals and blog posts),
 * whether the Visual Editor is showing it (see `EditableText`), and, inside a
 * Container, the surface the Container puts it on.
 */
export type BlockContext = {
  index: number
  fixtures: SiteFixtures
  editing: boolean
  /**
   * The background of the Container the Block is in. The Block draws its
   * text, links and buttons for this surface, not for its own background,
   * which it does not paint there. Unset for a Block on the Page itself.
   */
  surface?: Background
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

/**
 * What a Container marks the Blocks it holds with (`data-container` on its
 * wrapper). The shared section wrappers answer to it with the two class lists
 * below, so no Block has a second way of rendering (ADR-0007).
 */
export const CONTAINER_MARK = "data-container"

/**
 * Inside a Container a Block's section has no band of its own: no background
 * and no vertical padding, which are the Container's. (Important, because
 * the padding it drops is also set from the `sm` breakpoint up.)
 */
export const embeddedBand =
  "in-data-container:bg-transparent! in-data-container:py-0!"

/**
 * Inside a Container a Block's content has no side padding: the Container
 * holds the page-width box. Its width is its cell's.
 */
export const embeddedBox = "in-data-container:px-0!"
