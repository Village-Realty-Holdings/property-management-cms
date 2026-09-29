import { describe, expect, it } from "vitest"

import { computeRating } from "./recomputeRating"

describe("computeRating", () => {
  it("is null with no Reviews", () => {
    expect(computeRating([])).toEqual({ rating: null, reviewCount: 0 })
  })

  it("averages and rounds to 2 decimals", () => {
    expect(computeRating([5, 4, 4])).toEqual({ rating: 4.33, reviewCount: 3 })
    expect(computeRating([4.5, 3])).toEqual({ rating: 3.75, reviewCount: 2 })
    expect(computeRating([5, 5, 4, 4, 4, 4])).toEqual({
      rating: 4.33,
      reviewCount: 6,
    })
  })

  it("counts unrated Reviews but leaves them out of the average", () => {
    expect(computeRating([null, 4, undefined])).toEqual({
      rating: 4,
      reviewCount: 3,
    })
    expect(computeRating([null])).toEqual({ rating: null, reviewCount: 1 })
  })
})
