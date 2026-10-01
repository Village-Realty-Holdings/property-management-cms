/** One tile of the Amenities mosaic. */
export type MosaicTile = {
  /** Grid classes (written out in full so Tailwind can see them). */
  className: string
  /** The cells it covers in the phone's 2-column grid. */
  phone: number
  /** The cells it covers in the tablet's 4-column grid. */
  tablet: number
}

const cell = (className = "", phone = 1, tablet = 1): MosaicTile => ({
  className,
  phone,
  tablet,
})

/** The first of five: a full row on a phone, two rows by two columns from the tablet. */
const large = () => cell("col-span-2 md:row-span-2", 2, 4)

/**
 * The tiles of a mosaic of `count` items: the first of every five is large,
 * the rest are regular, and the last few (fewer than five) stretch across
 * the row they share, so the mosaic has no hole in it at any count.
 */
export function mosaicTiles(count: number): MosaicTile[] {
  const tiles: MosaicTile[] = []
  for (let group = 0; group < Math.floor(count / 5); group++) {
    tiles.push(large(), cell(), cell(), cell(), cell())
  }
  switch (count % 5) {
    case 1:
      tiles.push(cell("col-span-2 md:col-span-4", 2, 4))
      break
    case 2:
      tiles.push(cell("md:col-span-2", 1, 2), cell("md:col-span-2", 1, 2))
      break
    case 3:
      tiles.push(cell("col-span-2", 2, 2), cell(), cell())
      break
    case 4:
      tiles.push(cell(), cell(), cell(), cell())
      break
  }
  return tiles
}

/**
 * The Features grid's columns: two features, or four, sit two to a row from
 * the tablet up; the rest go three to a row from the desktop up.
 */
export function featureColumns(count: number): string {
  return count === 2 || count === 4
    ? "sm:grid-cols-2"
    : "sm:grid-cols-2 lg:grid-cols-3"
}
