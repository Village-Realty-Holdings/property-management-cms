import { createElement, type ReactNode } from "react"

import type { BlockContext } from "./types"

/**
 * A Block's style settings, as the page reads them (apps/site ADR-0013).
 *
 * A Block draws itself for the Default, Muted, Primary and Dark backgrounds.
 * For the Accent and Third backgrounds, and for a text colour that is set
 * (White or Dark), nothing in the Block changes: the Block is wrapped in an
 * element that takes no room (`display: contents`) and carries the choice as
 * `data-surface` and `data-text`. The stylesheet (packages/ui globals.css,
 * "Block style") gives the Theme's colour variables other values inside it,
 * so the Block's own text, links, rules and focus rings follow. A wrapper
 * around a Block that draws nothing has nothing in it and shows nothing.
 */

type Styled = {
  blockType?: string
  background?: string | null
  textColour?: string | null
}

/** What `data-block-style` marks: an element that is there only for the style. */
export const STYLE_MARK = "data-block-style"

/**
 * `node` with the Block's style around it, or `node` itself when the Block
 * has none. Inside a Container a Block has no background of its own (the
 * Container paints), so only its text colour counts there; a Container paints
 * at any depth.
 */
export function withBlockStyle(
  node: ReactNode,
  block: Styled,
  context: Pick<BlockContext, "surface">
): ReactNode {
  const paints =
    context.surface === undefined || block.blockType === "container"
  const surface =
    paints && (block.background === "accent" || block.background === "third")
      ? block.background
      : undefined
  const text =
    block.textColour === "white" || block.textColour === "dark"
      ? block.textColour
      : undefined
  if (!surface && !text) return node
  return createElement(
    "div",
    {
      [STYLE_MARK]: "",
      "data-surface": surface,
      "data-text": text,
      className: "contents",
    },
    node
  )
}
