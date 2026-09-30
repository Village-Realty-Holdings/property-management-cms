import { cn } from "@workspace/ui/lib/utils"

import type { SearchHeroBlock as SearchHeroBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * Search Hero: a Hero with a visual-only booking search.
 *
 * A stub: its heading only, until its render slice builds the real one.
 */
export function SearchHeroBlock({
  block,
  context,
}: {
  block: SearchHeroBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const id = `block-${context.index}-heading`
  return (
    <BlockSection labelledBy={id}>
      <EditableText
        as={context.index === 0 ? "h1" : "h2"}
        field="heading"
        context={context}
        id={id}
        className={cn(displayFont, "text-4xl text-balance sm:text-5xl")}
      >
        {heading}
      </EditableText>
    </BlockSection>
  )
}
