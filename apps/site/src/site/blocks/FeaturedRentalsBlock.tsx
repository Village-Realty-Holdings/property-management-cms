import { cn } from "@workspace/ui/lib/utils"

import type { FeaturedRentalsBlock as FeaturedRentalsBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import { RentalCardGrid } from "./rentals/RentalCardGrid"
import { RentalCarousel } from "./rentals/RentalCarousel"
import { RentalsEmpty } from "./rentals/RentalsEmpty"
import { featured } from "./rentals/select"
import type { BlockContext } from "./types"

/**
 * Featured rentals: the Site's first few Rentals as cards, in a carousel or
 * a grid. A Site with no Rentals gets its heading and a friendly message.
 */
export function FeaturedRentalsBlock({
  block,
  context,
}: {
  block: FeaturedRentalsBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  const id = `block-${context.index}-heading`
  const rentals = featured(context.fixtures.rentals, block.count)
  return (
    <BlockSection
      background={block.background}
      labelledBy={heading ? id : undefined}
      label="Featured rentals"
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
      {rentals.length === 0 ? (
        <RentalsEmpty />
      ) : block.variant === "carousel" ? (
        <RentalCarousel
          rentals={rentals}
          label={`${heading || "Featured rentals"} carousel`}
        />
      ) : (
        <RentalCardGrid rentals={rentals} />
      )}
    </BlockSection>
  )
}
