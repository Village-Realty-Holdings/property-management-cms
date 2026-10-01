import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel"

import type { Rental } from "../../fixtures/types"
import { RentalCard } from "./RentalCard"

/**
 * Rental cards in a carousel: one, two, then three slides in view. Its
 * Previous and Next buttons sit under the slides, where they cannot push
 * the page sideways; the arrow keys page it too (the carousel's own
 * handler), and every button and link is a normal tab stop.
 */
export function RentalCarousel({
  rentals,
  label,
}: {
  rentals: readonly Rental[]
  /** The carousel's accessible name. */
  label: string
}) {
  return (
    <Carousel opts={{ align: "start" }} aria-label={label}>
      <CarouselContent>
        {rentals.map((rental) => (
          <CarouselItem key={rental.id} className="sm:basis-1/2 lg:basis-1/3">
            <RentalCard rental={rental} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-6 flex justify-end gap-2">
        <CarouselPrevious className="static inset-auto m-0 translate-none" />
        <CarouselNext className="static inset-auto m-0 translate-none" />
      </div>
    </Carousel>
  )
}
