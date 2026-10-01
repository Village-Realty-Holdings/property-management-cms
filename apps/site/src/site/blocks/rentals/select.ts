import type { Rental } from "../../fixtures/types"

/** How many Rentals Featured rentals shows when its count is not set. */
const defaultCount = 3

/**
 * Featured rentals: the Site's first `count` Rentals, in fixture order. A
 * count that is missing or not a number shows three; zero or less shows
 * none; more than the Site has shows them all.
 */
export function featured(
  rentals: readonly Rental[],
  count: number | null | undefined
): Rental[] {
  const wanted =
    typeof count === "number" && Number.isFinite(count)
      ? Math.max(0, Math.floor(count))
      : defaultCount
  return rentals.slice(0, wanted)
}

/**
 * Large-group rentals: the Site's Rentals that sleep at least `minSleeps`
 * guests, in fixture order. With no usable minimum it shows none rather
 * than every Rental, so a half-filled Block never passes for a selection.
 */
export function largeGroup(
  rentals: readonly Rental[],
  minSleeps: number | null | undefined
): Rental[] {
  if (typeof minSleeps !== "number" || !Number.isFinite(minSleeps)) return []
  return rentals.filter((rental) => rental.sleeps >= minSleeps)
}
