import { cn } from "@workspace/ui/lib/utils"

import type { RegionContainerBlock } from "../../payload-types"
import { backgroundOf, surfaces } from "../blocks/BlockSection"
import { aligns, columns, gaps, justifies } from "../blocks/ContainerBlock"
import { CONTAINER_MARK, container } from "../blocks/types"
import { frameAttributes } from "../editing/BlockFrame"
import { renderRegionBlock } from "./registry"
import type { RegionBlock, RegionContext } from "./types"

/** A Container that paints inside another one is a card on it. */
const card = "rounded-(--card-radius) p-6"

/**
 * A Container in a Header or a Footer (apps/site ADR-0011): the region's
 * Blocks, as a stack or as columns side by side, on a band of their own. It
 * is the Page's Container with the region's Blocks in it: the same columns,
 * gap and alignment, drawn by the same classes.
 *
 * On the region it is a band across the page: its background, and the
 * Blocks at page width with a little room above and below. Inside another
 * Container it paints only a background other than Default, as a card. The
 * Blocks in it are drawn for its surface (`context.surface`), so a Logo on a
 * Primary band is the Brand's light logo and a Legal bar's words take the
 * band's colour.
 *
 * A band can ask for a line below it ("Line below"), to set it apart from
 * what follows; a Header that ends in a Container has no other.
 *
 * With no Blocks it renders nothing on the Site, and a placeholder in the
 * Visual Editor.
 */
export function RegionContainer({
  block,
  context,
}: {
  block: RegionContainerBlock
  context: RegionContext
}) {
  const children = (block.children ?? []) as RegionBlock[]
  if (children.length === 0 && !context.editing) return null
  const region = context.region ?? "header"
  const nested = context.surface !== undefined
  const background = backgroundOf(block.background)
  const paints = !nested || background !== "default"
  const surface = paints ? background : context.surface
  const within = [...(context.within ?? []), context.index]
  const mark = { [CONTAINER_MARK]: "" }
  return (
    <div
      role={nested ? "group" : undefined}
      className={cn(
        paints && surfaces[background],
        nested ? paints && card : "py-6",
        !nested && block.rule && "border-b border-border"
      )}
    >
      <div className={cn(!nested && container)}>
        <div
          {...mark}
          className={cn(
            "@container",
            block.width === "reading" && "mx-auto max-w-3xl"
          )}
        >
          {children.length === 0 ? (
            <p
              // The canvas's overlay puts its "Add a Block" here.
              data-container-empty=""
              className="rounded-(--card-radius) border border-dashed border-current/40 px-4 pt-6 pb-16 text-center text-sm"
            >
              This Container is empty. Add a Block to it.
            </p>
          ) : (
            <div
              className={cn(
                "grid grid-cols-1",
                columns[block.columns],
                gaps[block.gap],
                aligns[block.align],
                justifies[block.justify ?? "start"]
              )}
            >
              {children.map((child, index) => (
                <div
                  key={child.id ?? index}
                  {...(context.editing
                    ? frameAttributes({
                        id: child.id,
                        blockType: child.blockType,
                        region,
                        index,
                        parentId: block.id,
                      })
                    : {})}
                  className={cn(
                    "min-w-0 empty:hidden",
                    // A Block's style wrapper with nothing in it is empty too.
                    "has-[>[data-block-style]:only-child:empty]:hidden",
                    // A cell is the width its Block measures itself against,
                    // unless the Block is as wide as what it holds: a size
                    // container has no width of its own to shrink to.
                    (block.justify ?? "start") === "start"
                      ? "@container"
                      : "max-w-full",
                    block.align === "stretch" && "*:h-full"
                  )}
                >
                  {renderRegionBlock(region, child, {
                    ...context,
                    index,
                    within,
                    surface,
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
