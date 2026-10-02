import { cn } from "@workspace/ui/lib/utils"

import type { LargeGroupRentalsBlock as LargeGroupRentalsBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { RentalCardGrid } from "./rentals/RentalCardGrid"
import { RentalsEmpty } from "./rentals/RentalsEmpty"
import { largeGroup } from "./rentals/select"
import { type BlockContext, blockId } from "./types"

/**
 * Large-group rentals: the Site's Rentals that sleep at least a given
 * number of guests, as cards in a grid. With none to show it says so: that
 * the Site has no Rentals, or that none sleeps that many.
 */
export function LargeGroupRentalsBlock({
  block,
  context,
}: {
  block: LargeGroupRentalsBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  const id = blockId(context, "heading")
  const rentals = largeGroup(context.fixtures.rentals, block.minSleeps)
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={heading ? id : undefined}
      label="Large-group rentals"
      context={context}
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
      {rentals.length > 0 ? (
        <RentalCardGrid rentals={rentals} />
      ) : (
        <RentalsEmpty
          minSleeps={
            context.fixtures.rentals.length > 0 ? block.minSleeps : undefined
          }
        />
      )}
    </BlockSection>
  )
}
