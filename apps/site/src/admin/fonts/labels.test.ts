import { describe, expect, it } from "vitest"

import {
  faceLabel,
  kindLabel,
  sortFaces,
  sourceLabel,
  weightName,
  weightsSummary,
} from "./labels"

describe("weightName", () => {
  it.each([
    [100, "Thin"],
    [200, "Extra Light"],
    [300, "Light"],
    [400, "Regular"],
    [500, "Medium"],
    [600, "Semi Bold"],
    [700, "Bold"],
    [800, "Extra Bold"],
    [900, "Black"],
  ])("names %i %s", (weight, name) => {
    expect(weightName(weight)).toBe(name)
  })

  it("falls back to the number for a weight CSS has no name for", () => {
    expect(weightName(450)).toBe("450")
  })
})

describe("faceLabel", () => {
  it("shows the number and the name", () => {
    expect(faceLabel({ weight: 700, style: "normal" })).toBe("700 Bold")
  })

  it("marks italics", () => {
    expect(faceLabel({ weight: 400, style: "italic" })).toBe(
      "400 Regular italic"
    )
  })
})

describe("sortFaces", () => {
  it("orders by weight, normal before italic", () => {
    const faces = [
      { weight: 700, style: "normal" as const },
      { weight: 400, style: "italic" as const },
      { weight: 400, style: "normal" as const },
    ]
    expect(sortFaces(faces).map(faceLabel)).toEqual([
      "400 Regular",
      "400 Regular italic",
      "700 Bold",
    ])
  })

  it("does not change the list it is given", () => {
    const faces = [
      { weight: 700, style: "normal" as const },
      { weight: 400, style: "normal" as const },
    ]
    sortFaces(faces)
    expect(faces[0]!.weight).toBe(700)
  })
})

describe("weightsSummary", () => {
  it("counts the weights, once each, and lists them", () => {
    expect(
      weightsSummary([
        { weight: 400, style: "normal" },
        { weight: 400, style: "italic" },
        { weight: 700, style: "normal" },
      ])
    ).toBe("2 weights (400, 700), with italics")
  })

  it("uses the singular for one weight", () => {
    expect(weightsSummary([{ weight: 400, style: "normal" }])).toBe(
      "1 weight (400)"
    )
  })

  it("is empty for a Font with no files", () => {
    expect(weightsSummary([])).toBe("No files")
  })
})

describe("kindLabel and sourceLabel", () => {
  it("use the words the Fonts collection shows", () => {
    expect(kindLabel("serif")).toBe("Serif")
    expect(kindLabel("sans")).toBe("Sans serif")
    expect(kindLabel("slab")).toBe("Slab serif")
    expect(sourceLabel("google")).toBe("Google Fonts")
    expect(sourceLabel("uploaded")).toBe("Uploaded")
  })
})
