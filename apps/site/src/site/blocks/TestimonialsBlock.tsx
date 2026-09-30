import { cn } from "@workspace/ui/lib/utils"

import type { TestimonialsBlock as TestimonialsBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * Testimonials: guest quotes with a name, a role line and a star rating, in a carousel or a grid.
 *
 * A stub: its heading only, until its render slice builds the real one.
 */
export function TestimonialsBlock({
  block,
  context,
}: {
  block: TestimonialsBlockData
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
