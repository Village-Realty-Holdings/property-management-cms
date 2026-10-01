import type { Rental } from "../../fixtures/types"
import { RentalCard } from "./RentalCard"

/** Rental cards in a responsive grid: one, two, then three across. */
export function RentalCardGrid({ rentals }: { rentals: readonly Rental[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {rentals.map((rental) => (
        <li key={rental.id}>
          <RentalCard rental={rental} />
        </li>
      ))}
    </ul>
  )
}
