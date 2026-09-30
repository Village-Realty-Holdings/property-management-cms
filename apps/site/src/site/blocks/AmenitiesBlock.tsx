import { cn } from "@workspace/ui/lib/utils"

import type { AmenitiesBlock as AmenitiesBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * Amenities: a photo-tile mosaic or an icon list.
 *
 * A stub: its heading only, until its render slice builds the real one.
 */
export function AmenitiesBlock({
  block,
  context,
}: {
  block: AmenitiesBlockData
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
