import { describe, expect, it } from "vitest"

import { moveInGrid } from "./pickerGrid"

// Two groups of 5 and 2 entries, in a grid of 3 columns:
//   group 0:  a b c      group 1:  f g
//             d e
const sizes = [5, 2]

describe("moveInGrid", () => {
  it("moves right and left one entry, across the end of a row and of a group", () => {
    expect(moveInGrid(sizes, 3, { group: 0, index: 0 }, "ArrowRight")).toEqual({
      group: 0,
      index: 1,
    })
    expect(moveInGrid(sizes, 3, { group: 0, index: 2 }, "ArrowRight")).toEqual({
      group: 0,
      index: 3,
    })
    expect(moveInGrid(sizes, 3, { group: 0, index: 4 }, "ArrowRight")).toEqual({
      group: 1,
      index: 0,
    })
    expect(moveInGrid(sizes, 3, { group: 1, index: 0 }, "ArrowLeft")).toEqual({
      group: 0,
      index: 4,
    })
  })

  it("stays put at the very first and last entry", () => {
    expect(moveInGrid(sizes, 3, { group: 0, index: 0 }, "ArrowLeft")).toEqual({
      group: 0,
      index: 0,
    })
    expect(moveInGrid(sizes, 3, { group: 1, index: 1 }, "ArrowRight")).toEqual({
      group: 1,
      index: 1,
    })
    expect(moveInGrid(sizes, 3, { group: 1, index: 1 }, "ArrowDown")).toEqual({
      group: 1,
      index: 1,
    })
  })

  it("moves down a row in the same column", () => {
    expect(moveInGrid(sizes, 3, { group: 0, index: 1 }, "ArrowDown")).toEqual({
      group: 0,
      index: 4,
    })
    expect(moveInGrid(sizes, 3, { group: 0, index: 4 }, "ArrowUp")).toEqual({
      group: 0,
      index: 1,
    })
  })

  it("moves down into the next group, keeping the column where it can", () => {
    expect(moveInGrid(sizes, 3, { group: 0, index: 3 }, "ArrowDown")).toEqual({
      group: 1,
      index: 0,
    })
    expect(moveInGrid(sizes, 3, { group: 0, index: 4 }, "ArrowDown")).toEqual({
      group: 1,
      index: 1,
    })
  })

  it("steps down to a short last row's last entry when its column is missing", () => {
    expect(moveInGrid(sizes, 3, { group: 0, index: 2 }, "ArrowDown")).toEqual({
      group: 0,
      index: 4,
    })
  })

  it("moves up into the previous group's last row", () => {
    expect(moveInGrid(sizes, 3, { group: 1, index: 1 }, "ArrowUp")).toEqual({
      group: 0,
      index: 4,
    })
    expect(moveInGrid(sizes, 3, { group: 1, index: 0 }, "ArrowUp")).toEqual({
      group: 0,
      index: 3,
    })
  })

  it("is a plain list when there is one column", () => {
    expect(moveInGrid([2, 2], 1, { group: 0, index: 1 }, "ArrowDown")).toEqual({
      group: 1,
      index: 0,
    })
    expect(moveInGrid([2, 2], 1, { group: 1, index: 0 }, "ArrowUp")).toEqual({
      group: 0,
      index: 1,
    })
  })
})
