import { Fragment, type ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { container } from "../blocks/types"
import { BlockFrame } from "../editing/BlockFrame"
import { regionTakes } from "./catalogue"
import { renderRegionBlock } from "./registry"
import type {
  FooterBlock,
  HeaderBlock,
  Region,
  RegionBlock,
  RegionContext,
} from "./types"

/**
 * Where each region's Blocks start counting. A Block's `index` names it in
 * the page (heading ids, `data-block-index`), and a Footer Call to action
 * would otherwise share "block-0-heading" with the Page's first Block. The
 * Visual Editor takes a region's position back out with `regionPosition`.
 */
export const regionIndexBase: Record<Region, number> = {
  header: 1000,
  footer: 2000,
}

/** A Block's place in its region, from the `index` it was rendered with. */
export function regionPosition(region: Region, index: number): number {
  return index - regionIndexBase[region]
}

type Props =
  | {
      region: "header"
      blocks: readonly HeaderBlock[] | null | undefined
      context: Omit<RegionContext, "index"> & { index?: number }
    }
  | {
      region: "footer"
      blocks: readonly FooterBlock[] | null | undefined
      context: Omit<RegionContext, "index"> & { index?: number }
    }

/**
 * A Layout's Header or Footer: its Blocks in a `<header>` or `<footer>`
 * landmark. The Site and the Visual Editor's canvas both render regions with
 * this, so the Admin and the Site agree.
 *
 * - **Header:** Utility strips stack above; the Logo, Navigation and Header
 *   actions follow in one row that wraps on a small screen.
 * - **Footer:** the Blocks stack in order, each a band on the Footer's
 *   surface (Footer columns, the Legal bar, and any Newsletter or Call to
 *   action, which keep their own background).
 *
 * A Block the region does not take is left out, and a region with nothing to
 * show renders nothing at all. In the Visual Editor each Block is wrapped
 * (see `BlockFrame`), with its place in the region's list.
 */
export function RegionBlocks({ region, blocks, context }: Props) {
  // In the Visual Editor each Block is wrapped so the overlay can find it.
  const framed = (
    node: ReactNode,
    block: RegionBlock,
    position: number
  ): ReactNode =>
    context.editing && node !== null ? (
      <BlockFrame
        id={block.id}
        blockType={block.blockType}
        region={region}
        index={position}
      >
        {node}
      </BlockFrame>
    ) : (
      node
    )

  const items = ((blocks ?? []) as readonly RegionBlock[])
    .map((block, position) => ({
      block,
      key: block.id ?? String(position),
      node: framed(
        regionTakes(region, block.blockType)
          ? renderRegionBlock(region, block, {
              ...context,
              index: regionIndexBase[region] + position,
            })
          : null,
        block,
        position
      ),
    }))
    .filter((item) => item.node !== null)
  if (items.length === 0) return null

  if (region === "footer") {
    return (
      <footer className="border-t border-border bg-secondary text-secondary-foreground">
        {items.map((item) => (
          <Fragment key={item.key}>{item.node}</Fragment>
        ))}
      </footer>
    )
  }

  const strips = items.filter((item) => item.block.blockType === "utilityStrip")
  const row = items.filter((item) => item.block.blockType !== "utilityStrip")
  return (
    <header className="border-b border-border bg-background text-foreground">
      {strips.map((item) => (
        <Fragment key={item.key}>{item.node}</Fragment>
      ))}
      {row.length > 0 && (
        <div
          className={cn(
            container,
            "flex flex-wrap items-center gap-x-6 gap-y-3 py-4"
          )}
        >
          {row.map((item) => (
            <Fragment key={item.key}>{item.node}</Fragment>
          ))}
        </div>
      )}
    </header>
  )
}
