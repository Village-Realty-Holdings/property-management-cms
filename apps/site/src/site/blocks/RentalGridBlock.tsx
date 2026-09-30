import { cn } from "@workspace/ui/lib/utils"

import type { RentalGridBlock as RentalGridBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * Rental grid: every Rental with filter chips, a sort and simple pagination.
 *
 * A stub: its heading only, until its render slice builds the real one.
 */
export function RentalGridBlock({
  block,
  context,
}: {
  block: RentalGridBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const id = `block-${context.index}-heading`
  return (
    <BlockSection background={block.background} labelledBy={id}>
      <EditableText
        as="h2"
        field="heading"
        context={context}
        id={id}
        className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
      >
        {heading}
      </EditableText>
    </BlockSection>
  )
}
