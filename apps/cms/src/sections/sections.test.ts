import { describe, expect, it } from "vitest"

import {
  hiddenCollections,
  sectionNames,
  withoutHiddenCollections,
  type Section,
  type SiteSections,
} from "."

const allCollections = [
  "pages",
  "guides",
  "curated-lists",
  "media",
  "submissions",
  "properties",
  "locations",
  "specials",
  "reviews",
  "amenities",
  "property-types",
  "sites",
  "users",
  "site-readers",
]

const expectedHidden: Record<Section, string[]> = {
  properties: [
    "properties",
    "locations",
    "specials",
    "reviews",
    "amenities",
    "property-types",
  ],
  inbox: ["submissions"],
  guides: ["guides"],
  curatedLists: ["curated-lists"],
}

/** Every on/off combination of the four Sections (16). */
const combinations: SiteSections[] = Array.from({ length: 16 }, (_, bits) =>
  Object.fromEntries(
    sectionNames.map((name, i) => [name, Boolean(bits & (1 << i))])
  )
)

describe("Sections", () => {
  it.each(combinations)("hide their collections: %o", (sections) => {
    const off = sectionNames.filter((name) => sections?.[name] === false)
    const expected = off.flatMap((name) => expectedHidden[name])
    expect(hiddenCollections(sections).sort()).toEqual(expected.sort())
    expect(withoutHiddenCollections(allCollections, sections)).toEqual(
      allCollections.filter((slug) => !expected.includes(slug))
    )
  })

  it("always keep Pages, Media and Settings", () => {
    const allOff = {
      properties: false,
      inbox: false,
      guides: false,
      curatedLists: false,
    }
    expect(withoutHiddenCollections(allCollections, allOff)).toEqual([
      "pages",
      "media",
      "sites",
      "users",
      "site-readers",
    ])
  })

  it("count as on when unset (Sites from before Sections)", () => {
    expect(hiddenCollections(undefined)).toEqual([])
    expect(hiddenCollections({ guides: null })).toEqual([])
  })
})
