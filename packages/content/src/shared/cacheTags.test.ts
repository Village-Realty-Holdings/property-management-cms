import { describe, expect, it } from "vitest"

import { cacheTags, isCacheTag, toPagePath, uniqueTags } from "./index"

describe("cacheTags", () => {
  it("builds per-document tags", () => {
    expect(cacheTags.property("lake-house")).toBe("property:lake-house")
    expect(cacheTags.location(42)).toBe("location:42")
    expect(cacheTags.location("42")).toBe("location:42")
    expect(cacheTags.curatedList("pet-friendly")).toBe(
      "curated-list:pet-friendly"
    )
    expect(cacheTags.page("/")).toBe("page:/")
    expect(cacheTags.page(toPagePath(["company", "team"]))).toBe(
      "page:/company/team"
    )
    expect(cacheTags.guide("ski-season")).toBe("guide:ski-season")
  })

  it("has fixed collection-wide tags", () => {
    expect({
      properties: cacheTags.properties,
      locations: cacheTags.locations,
      curatedLists: cacheTags.curatedLists,
      pages: cacheTags.pages,
      guides: cacheTags.guides,
      specials: cacheTags.specials,
      siteSettings: cacheTags.siteSettings,
    }).toEqual({
      properties: "properties",
      locations: "locations",
      curatedLists: "curated-lists",
      pages: "pages",
      guides: "guides",
      specials: "specials",
      siteSettings: "site-settings",
    })
  })

  it("is deterministic and never carries the Site", () => {
    expect(cacheTags.property("a")).toBe(cacheTags.property("a"))
    expect(cacheTags.property("a")).not.toBe(cacheTags.property("b"))
  })
})

describe("isCacheTag", () => {
  it("accepts every tag the vocabulary builds", () => {
    for (const tag of [
      cacheTags.property("x"),
      cacheTags.page("/"),
      cacheTags.siteSettings,
    ]) {
      expect(isCacheTag(tag)).toBe(true)
    }
  })

  it("rejects non-strings, empty, whitespace and over-long values", () => {
    expect(isCacheTag(undefined)).toBe(false)
    expect(isCacheTag(1)).toBe(false)
    expect(isCacheTag("")).toBe(false)
    expect(isCacheTag("a b")).toBe(false)
    expect(isCacheTag("x".repeat(257))).toBe(false)
    expect(isCacheTag("x".repeat(256))).toBe(true)
  })
})

describe("uniqueTags", () => {
  it("de-duplicates, keeping first-seen order", () => {
    const { properties, property, siteSettings } = cacheTags
    expect(
      uniqueTags([property("a"), properties, property("a"), siteSettings])
    ).toEqual(["property:a", "properties", "site-settings"])
  })
})
