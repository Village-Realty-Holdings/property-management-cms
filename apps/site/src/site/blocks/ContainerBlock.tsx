import { cn } from "@workspace/ui/lib/utils"

import type { ContainerBlock as ContainerBlockData } from "../../payload-types"
import { frameAttributes } from "../editing/BlockFrame"
import { backgroundOf, surfaces } from "./BlockSection"
import { renderBlock } from "./registry"
import { CONTAINER_MARK, container, sectionY, type BlockContext } from "./types"

/**
 * The columns at full width. They are counted against the Container's own
 * width, not the viewport's: one column below the `sm` container width, and
 * three or four go through two on the way. (Class names are written out so
 * Tailwind can see them.)
 */
export const columns: Record<ContainerBlockData["columns"], string> = {
  "1": "",
  "2": "@sm:grid-cols-2",
  "3": "@sm:grid-cols-2 @3xl:grid-cols-3",
  "4": "@sm:grid-cols-2 @5xl:grid-cols-4",
}

/** The gap between cells, in steps of the Theme's --section-y. */
export const gaps: Record<ContainerBlockData["gap"], string> = {
  small: "gap-[calc(var(--section-y)*0.4)]",
  medium: "gap-[calc(var(--section-y)*0.8)]",
  large: "gap-[calc(var(--section-y)*1.2)]",
}

export const aligns: Record<ContainerBlockData["align"], string> = {
  top: "items-start",
  centre: "items-center",
  stretch: "items-stretch",
}

/**
 * Where a Block sits in its cell, across. At the start a cell's Block fills
 * the cell, as it always did. In the centre or at the end the Block is as
 * wide as what it holds and sits there: a logo, a button, an image.
 */
export const justifies: Record<
  NonNullable<ContainerBlockData["justify"]>,
  string
> = {
  start: "",
  centre: "justify-items-center",
  end: "justify-items-end",
}

/** A Container that paints inside another one is a card on it. */
const card = "rounded-(--card-radius) p-6 sm:p-8"

/**
 * Container: the Blocks it holds, as a stack or as columns side by side.
 *
 * On the Page it is a band like any Block's section: its background, the
 * Theme's vertical padding, its content at page width. Inside another
 * Container it has no band: it paints only a background other than Default,
 * as a card, and otherwise sits on the surface it was given.
 *
 * Each Block it holds is the same component as on the Page, in a cell of the
 * grid. The wrapper marks them (`data-container`), which takes their own
 * band away (see `embeddedBand`), and they are drawn for the Container's
 * surface (`context.surface`). In the Visual Editor each cell is its Block's
 * frame (see `frameAttributes`), naming this Container as the list it is in,
 * so the overlay finds and selects a Block at any depth, and its text is
 * edited in place as on the Page.
 *
 * The Container on the Page is no landmark of its own: the Blocks in it that
 * a heading names are the regions. One inside a Container, a card in a row
 * of them, is a group, so assistive technology tells where a card begins and
 * ends.
 *
 * With no Blocks it renders nothing on the Site, and a placeholder in the
 * Visual Editor.
 */
export function ContainerBlock({
  block,
  context,
}: {
  block: ContainerBlockData
  context: BlockContext
}) {
  const children = block.children ?? []
  if (children.length === 0 && !context.editing) return null
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
        nested ? paints && card : sectionY
      )}
    >
      <div className={cn(!nested && container)}>
        <div
          {...mark}
          className={cn("@container", block.width === "reading" && "max-w-3xl")}
        >
          {children.length === 0 ? (
            <p
              // The canvas's overlay puts its "Add a Block" here.
              data-container-empty=""
              className="rounded-(--card-radius) border border-dashed border-current/40 px-4 pt-8 pb-20 text-center text-sm"
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
                        region: "page",
                        index,
                        parentId: block.id,
                      })
                    : {})}
                  // A cell is the width a Block inside it can measure itself
                  // against. One whose Block renders nothing takes no room.
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
                  {renderBlock(child, {
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
