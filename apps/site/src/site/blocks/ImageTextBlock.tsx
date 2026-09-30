import { cn } from "@workspace/ui/lib/utils"

import type { ImageTextBlock as ImageTextBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * Image + text: an image on the left or right beside text, with an optional
 * icon list and caption.
 *
 * A stub: its heading only, until its render slice builds the real one.
 */
export function ImageTextBlock({
  block,
  context,
}: {
  block: ImageTextBlockData
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
