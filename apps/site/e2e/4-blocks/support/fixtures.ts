/**
 * What the Rental Blocks must select, worked out independently of the Site:
 * the Rentals of `research/brands/*\/rentals.fixture.json` (branch
 * `research/brand-extraction`), which the spec says the Warren Beach and
 * Avada fixture modules come from. Only the facts a visitor can check are
 * kept: the name, bedrooms, how many it sleeps, where it is, and whether
 * pets are welcome (Avada's research gives that in the type, "Pet Friendly
 * Cabin"). Pure, so it is unit tested with `pnpm check`.
 */

export type ExpectedRental = {
  name: string
  beds: number
  sleeps: number
  /** The town, as a filter chip would name it; null when unknown. */
  location: string | null
  pets: boolean
}

export const AVADA_RENTALS: readonly ExpectedRental[] = [
  {
    name: "Just Fur Relaxin'",
    beds: 2,
    sleeps: 4,
    location: "Sevierville",
    pets: false,
  },
  {
    name: "A Family Tradition",
    beds: 8,
    sleeps: 16,
    location: "Gatlinburg",
    pets: true,
  },
  {
    name: "The Blessing Cabin",
    beds: 3,
    sleeps: 9,
    location: "Sevierville",
    pets: false,
  },
  {
    name: "Bearfoot Splash Hideaway",
    beds: 2,
    sleeps: 4,
    location: "Sevierville",
    pets: false,
  },
  {
    name: "Whispering Pines",
    beds: 4,
    sleeps: 12,
    location: "Sevierville",
    pets: false,
  },
  {
    name: "Friends in High Places 2",
    beds: 3,
    sleeps: 12,
    location: "Sevierville",
    pets: false,
  },
  {
    name: "Serenity Awaits",
    beds: 4,
    sleeps: 10,
    location: "Sevierville",
    pets: false,
  },
  {
    name: "Yeti Lodge",
    beds: 2,
    sleeps: 8,
    location: "Gatlinburg",
    pets: false,
  },
  {
    name: "Blue Mist Vista",
    beds: 2,
    sleeps: 6,
    location: "Gatlinburg",
    pets: false,
  },
  {
    name: "An Indian Dream",
    beds: 1,
    sleeps: 6,
    location: "Sevierville",
    pets: true,
  },
  {
    name: "Majestic Overlook",
    beds: 4,
    sleeps: 12,
    location: "Sevierville",
    pets: true,
  },
  {
    name: "The Ruby 301",
    beds: 2,
    sleeps: 6,
    location: "Pigeon Forge",
    pets: true,
  },
]

export const WARREN_BEACH_RENTALS: readonly ExpectedRental[] = [
  { name: "Aqua 2107", beds: 3, sleeps: 8, location: null, pets: false },
  { name: "122 Kelly St", beds: 6, sleeps: 16, location: null, pets: false },
  {
    name: "Crescent 217 Destin",
    beds: 4,
    sleeps: 12,
    location: null,
    pets: false,
  },
  { name: "Calypso 2308W", beds: 3, sleeps: 9, location: null, pets: false },
  {
    name: "214 Toledo Place",
    beds: 5,
    sleeps: 14,
    location: null,
    pets: false,
  },
  { name: "Seacrets", beds: 5, sleeps: 19, location: null, pets: false },
  { name: "Top Shelf", beds: 5, sleeps: 16, location: null, pets: false },
  { name: "Sea Lover", beds: 5, sleeps: 20, location: null, pets: false },
  { name: "Family Ties", beds: 5, sleeps: 14, location: null, pets: false },
  { name: "Bell & Tide", beds: 5, sleeps: 14, location: null, pets: false },
  { name: "Beach & Boat", beds: 5, sleeps: 16, location: null, pets: false },
  {
    name: "Villas at Laguna Beach 8",
    beds: 5,
    sleeps: 12,
    location: null,
    pets: false,
  },
]

const names = (rentals: readonly ExpectedRental[]) =>
  rentals.map((rental) => rental.name).sort()

/** Large-group rentals: every Rental that sleeps at least `min`. */
export function sleepingAtLeast(
  rentals: readonly ExpectedRental[],
  min: number
): string[] {
  return names(rentals.filter((rental) => rental.sleeps >= min))
}

/** The Rentals a Rental grid filter keeps. */
export function matching(
  rentals: readonly ExpectedRental[],
  filter: { pets?: boolean; location?: string; beds?: number; minBeds?: number }
): string[] {
  return names(
    rentals.filter(
      (rental) =>
        (filter.pets === undefined || rental.pets === filter.pets) &&
        (filter.location === undefined ||
          rental.location?.toLowerCase() === filter.location.toLowerCase()) &&
        (filter.beds === undefined || rental.beds === filter.beds) &&
        (filter.minBeds === undefined || rental.beds >= filter.minBeds)
    )
  )
}

/** The Rental of that name, or undefined when the fixtures have none. */
export function rentalNamed(
  rentals: readonly ExpectedRental[],
  name: string
): ExpectedRental | undefined {
  const wanted = normaliseName(name)
  return rentals.find((rental) => normaliseName(rental.name) === wanted)
}

/** Names compare without case, curly quotes or doubled spaces. */
export function normaliseName(name: string): string {
  return name.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase()
}

/** How many a card says the Rental sleeps: "Sleeps 12" or "12 guests". */
export function sleepsOnCard(text: string): number | null {
  const match =
    /sleeps\s*:?\s*(\d+)/i.exec(text) ?? /(\d+)\s*guests?/i.exec(text)
  return match ? Number(match[1]) : null
}

/** How many bedrooms a card shows: "4 bedrooms", "4 bed", "4 BR". */
export function bedsOnCard(text: string): number | null {
  const match = /(\d+)\s*(?:bedrooms?|beds?|br)\b/i.exec(text)
  return match ? Number(match[1]) : null
}

/** True when `values` never go down, or never go up, and are not all equal. */
export function isSorted(values: readonly number[]): boolean {
  if (values.length < 2 || new Set(values).size < 2) return false
  const up = values.every((value, i) => i === 0 || value >= values[i - 1]!)
  const down = values.every((value, i) => i === 0 || value <= values[i - 1]!)
  return up || down
}
