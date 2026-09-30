import { describe, expect, it } from "vitest"

import { featureColumns, mosaicTiles } from "./mosaic"

/**
 * The mosaic is a 2-column grid on a phone and a 4-column grid from the
 * tablet up. `cells` adds up the cells the tiles cover in each of the two.
 */
function cells(count: number) {
  const tiles = mosaicTiles(count)
  const phone = tiles.reduce((sum, tile) => sum + tile.phone, 0)
  const tablet = tiles.reduce((sum, tile) => sum + tile.tablet, 0)
  return { phone, tablet }
}

describe("mosaicTiles", () => {
  it("gives every item a tile", () => {
    for (const count of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(mosaicTiles(count)).toHaveLength(count)
    }
  })

  it("makes the first of every five large, so five items fill two rows", () => {
    const tiles = mosaicTiles(5)
    expect(tiles[0]?.className).toContain("md:row-span-2")
    expect(tiles[0]?.className).toContain("col-span-2")
    expect(tiles.slice(1).every((t) => t.className === "")).toBe(true)
  })

  it("fills every row, to the last tile, whatever the number of items", () => {
    for (let count = 1; count <= 23; count++) {
      const { phone, tablet } = cells(count)
      expect(phone % 2, `phone, ${count} items`).toBe(0)
      expect(tablet % 4, `tablet, ${count} items`).toBe(0)
    }
  })

  it("stretches the last tiles across the row when they would stand alone", () => {
    const one = mosaicTiles(1)[0]
    expect(one?.className).toContain("col-span-2")
    expect(one?.className).toContain("md:col-span-4")
    const two = mosaicTiles(2)
    expect(two.every((t) => t.className.includes("md:col-span-2"))).toBe(true)
  })
})

describe("featureColumns", () => {
  it("lays two or four features out in two columns, so no row stands alone", () => {
    expect(featureColumns(2)).toBe("sm:grid-cols-2")
    expect(featureColumns(4)).toBe("sm:grid-cols-2")
  })

  it("lays the others out in three from the desktop up", () => {
    for (const count of [1, 3, 5, 6, 9]) {
      expect(featureColumns(count)).toBe("sm:grid-cols-2 lg:grid-cols-3")
    }
  })
})
