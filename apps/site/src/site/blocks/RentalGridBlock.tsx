import { cn } from "@workspace/ui/lib/utils"

import type { RentalGridBlock as RentalGridBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { RentalGridBrowser } from "./rentals/RentalGridBrowser"
import type { BlockContext } from "./types"

/**
 * Rental grid: every Rental of the Site as cards, with filter chips
 * (bedrooms, pets, location), a sort and simple pagination. The heading is
 * server-safe; the browsing part is a client island
 * (`rentals/RentalGridBrowser`). A Site with no Rentals gets its heading and
 * a friendly message.
 */
export function RentalGridBlock({
  block,
  context,
}: {
  block: RentalGridBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  const id = `block-${context.index}-heading`
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={heading ? id : undefined}
      label="Rental grid"
    >
      {heading && (
        <EditableText
          as="h2"
          field="heading"
          context={context}
          id={id}
          className={cn(
            displayFont,
            "mb-8 text-3xl text-balance sm:mb-10 sm:text-4xl"
          )}
        >
          {heading}
        </EditableText>
      )}
      <RentalGridBrowser
        rentals={context.fixtures.rentals}
        pageSize={block.pageSize}
        index={context.index}
        label={heading || "Rental grid"}
      />
    </BlockSection>
  )
}
