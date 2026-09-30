import { cn } from "@workspace/ui/lib/utils"

import type { TrustStripBlock as TrustStripBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * Trust strip: text or stat items, or partner logos.
 *
 * A stub: its heading only, until its render slice builds the real one. The
 * heading is optional, so a strip without one is a region named "Trust strip".
 */
export function TrustStripBlock({
  block,
  context,
}: {
  block: TrustStripBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  const id = `block-${context.index}-heading`
  return (
    <BlockSection
      background={block.background}
      labelledBy={heading ? id : undefined}
      label="Trust strip"
    >
      {heading && (
        <EditableText
          as="h2"
          field="heading"
          context={context}
          id={id}
          className={cn(displayFont, "text-2xl text-balance sm:text-3xl")}
        >
          {heading}
        </EditableText>
      )}
    </BlockSection>
  )
}
