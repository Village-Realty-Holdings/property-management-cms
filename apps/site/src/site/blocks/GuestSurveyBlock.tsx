import type { GuestSurveyBlock as GuestSurveyBlockData } from "../../payload-types"
import { BlockSection, surfaceOf } from "./BlockSection"
import { GuestSurveyFlow } from "./GuestSurveyFlow"
import { type BlockContext, blockId, isFirstOnPage } from "./types"

/**
 * Guest survey: a rating out of five stars, then a request for a review or a
 * feedback form for guest care. The section is server-safe; the flow inside
 * it is a client island. It lays itself out by the room it has (`fit-*`), so
 * it fits a Container's column.
 */
export function GuestSurveyBlock({
  block,
  context,
}: {
  block: GuestSurveyBlockData
  context: BlockContext
}) {
  if (!block.heading?.trim()) return null
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={blockId(context, "survey-heading")}
      context={context}
    >
      <GuestSurveyFlow
        block={block}
        first={isFirstOnPage(context)}
        context={{
          index: context.index,
          within: context.within,
          editing: context.editing,
        }}
      />
    </BlockSection>
  )
}
