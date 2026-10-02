/** One tile of the Amenities mosaic. */
export type MosaicTile = {
  /** Grid classes (written out in full so Tailwind can see them). */
  className: string
  /** The cells it covers in the 2-column grid of a phone or a narrow column. */
  phone: number
  /** The cells it covers in the 4-column grid from a tablet's width (`fit-md`) up. */
  tablet: number
}

const cell = (className = "", phone = 1, tablet = 1): MosaicTile => ({
  className,
  phone,
  tablet,
})

/** The first of five: a full row on a phone, two rows by two columns from a tablet's width. */
const large = () => cell("col-span-2 fit-md:row-span-2", 2, 4)

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
      tiles.push(cell("col-span-2 fit-md:col-span-4", 2, 4))
      break
    case 2:
      tiles.push(
        cell("fit-md:col-span-2", 1, 2),
        cell("fit-md:col-span-2", 1, 2)
      )
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
 * a tablet's width up; the rest go three to a row from a desktop's. The
 * width is the room the Block has (`fit-*`): the viewport's on the Page, its
 * cell's in a Container.
 */
export function featureColumns(count: number): string {
  return count === 2 || count === 4
    ? "fit-sm:grid-cols-2"
    : "fit-sm:grid-cols-2 fit-lg:grid-cols-3"
}
