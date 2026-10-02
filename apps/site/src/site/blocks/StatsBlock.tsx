import { cn } from "@workspace/ui/lib/utils"

import type { StatsBlock as StatsBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { type BlockContext, blockId } from "./types"

/** Columns at `lg`, by the number of figures shown. (Class names are written out so Tailwind can see them.) */
const columns: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
}

/**
 * Stats: three or four figures, each with a label. A figure needs both its
 * value and its label to be shown; each keeps its place in the stored list
 * for in-place editing. The figure is in the text colour, with an accent
 * rule above it: the accent only decorates, it never carries text.
 */
export function StatsBlock({
  block,
  context,
}: {
  block: StatsBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const stats = (block.stats ?? []).flatMap((stat, position) => {
    const value = stat.value?.trim()
    const label = stat.label?.trim()
    return value && label ? [{ position, value, label, id: stat.id }] : []
  })
  const id = blockId(context, "heading")
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
      className="flex flex-col gap-10"
    >
      <EditableText
        as="h2"
        field="heading"
        context={context}
        id={id}
        className={cn(
          displayFont,
          "max-w-2xl text-3xl text-balance sm:text-4xl"
        )}
      >
        {heading}
      </EditableText>
      {stats.length > 0 && (
        <ul
          className={cn(
            "grid list-none gap-x-8 gap-y-8 sm:grid-cols-2",
            columns[stats.length] ?? "lg:grid-cols-4"
          )}
        >
          {stats.map((stat) => (
            <li
              key={stat.id ?? stat.position}
              className="flex flex-col gap-2 border-t-4 border-accent pt-4"
            >
              <EditableText
                as="strong"
                field={`stats.${stat.position}.value`}
                context={context}
                className={cn(displayFont, "text-5xl leading-none sm:text-6xl")}
              >
                {stat.value}
              </EditableText>
              <EditableText
                as="span"
                field={`stats.${stat.position}.label`}
                context={context}
                className="text-base text-pretty sm:text-lg"
              >
                {stat.label}
              </EditableText>
            </li>
          ))}
        </ul>
      )}
    </BlockSection>
  )
}
