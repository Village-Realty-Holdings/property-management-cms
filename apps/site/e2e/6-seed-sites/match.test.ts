import { describe, expect, it } from "vitest"

import {
  digitsOf,
  lineNamesBlock,
  missingBlocks,
  missingInOrder,
  normalizeText,
  pageGroupLines,
  parseWorktreeList,
  snapshotChanges,
} from "./match"

describe("normalizeText", () => {
  it("lowercases, drops apostrophes and folds punctuation into spaces", () => {
    expect(normalizeText("We’re here to help!  Send us")).toBe(
      "were here to help send us"
    )
    expect(normalizeText("Property & Guests")).toBe("property guests")
    expect(normalizeText("FIND YOUR\nSMOKY MOUNTAIN STAY")).toBe(
      "find your smoky mountain stay"
    )
  })
})

describe("missingInOrder", () => {
  const page =
    "Book Your Emerald Coast Vacation Rental. Featured Emerald Coast Rentals — Guest Favorite Rental Amenities"

  it("finds copy in the order given, whatever its case or punctuation", () => {
    expect(
      missingInOrder(page, [
        "Book your Emerald Coast vacation rental",
        "Featured Emerald Coast Rentals",
        "GUEST FAVORITE RENTAL AMENITIES",
      ])
    ).toEqual([])
  })

  it("reports copy that comes out of order or is absent", () => {
    expect(
      missingInOrder(page, [
        "Featured Emerald Coast Rentals",
        "Book Your Emerald Coast Vacation Rental",
        "Subscribe to our emails",
      ])
    ).toEqual([
      "Book Your Emerald Coast Vacation Rental",
      "Subscribe to our emails",
    ])
  })

  it("matches whole words only", () => {
    expect(missingInOrder("Rentals near the coast", ["Rental"])).toEqual([
      "Rental",
    ])
  })
})

describe("the Outline", () => {
  const outline = [
    "Header",
    "Logo",
    "Navigation",
    "Page",
    "Search Hero",
    "Featured rentals · Stay by the sea",
    "Add a Block",
    "Amenities",
    "Footer",
    "Newsletter",
  ].join("\n")

  it("reads the Page group only", () => {
    expect(pageGroupLines(outline)).toEqual([
      "Search Hero",
      "Featured rentals · Stay by the sea",
      "Add a Block",
      "Amenities",
    ])
  })

  it("falls back to every line without group labels", () => {
    expect(pageGroupLines("Hero\nSteps")).toEqual(["Hero", "Steps"])
  })

  it("names a Block by its whole name", () => {
    expect(lineNamesBlock("Search Hero", "Search Hero")).toBe(true)
    expect(lineNamesBlock("Search Hero", "Hero")).toBe(false)
    expect(lineNamesBlock("Hero · Earn more", "Hero")).toBe(true)
  })

  it("reports Blocks missing or out of order", () => {
    const lines = pageGroupLines(outline)
    expect(
      missingBlocks(lines, ["Search Hero", "Featured rentals", "Amenities"])
    ).toEqual([])
    expect(
      missingBlocks(lines, ["Amenities", "Search Hero", "Newsletter"])
    ).toEqual(["Search Hero", "Newsletter"])
  })
})

describe("parseWorktreeList", () => {
  it("reads paths, heads and branches, detached or not", () => {
    const porcelain = [
      "worktree /repo",
      "HEAD aaa",
      "branch refs/heads/milestone/site-builder",
      "",
      "worktree /pm-avada",
      "HEAD bbb",
      "detached",
      "",
    ].join("\n")
    expect(parseWorktreeList(porcelain)).toEqual([
      { path: "/repo", head: "aaa", branch: "milestone/site-builder" },
      { path: "/pm-avada", head: "bbb", branch: null },
    ])
  })
})

describe("snapshotChanges", () => {
  it("lists what changed, appeared or went away", () => {
    expect(
      snapshotChanges(
        { "pages rows": "4", "media rows": "9", "fonts rows": "3" },
        { "pages rows": "8", "media rows": "9", "layouts rows": "2" }
      )
    ).toEqual([
      { key: "fonts rows", before: "3", after: undefined },
      { key: "layouts rows", before: undefined, after: "2" },
      { key: "pages rows", before: "4", after: "8" },
    ])
  })
})

describe("digitsOf", () => {
  it("keeps only the digits of a phone number", () => {
    expect(digitsOf("(850) 231-0835")).toBe("8502310835")
    expect(digitsOf("850.231.0835")).toBe("8502310835")
  })
})
