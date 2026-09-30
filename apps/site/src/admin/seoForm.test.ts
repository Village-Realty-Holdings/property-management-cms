import { describe, expect, it } from "vitest"

import {
  describeDescriptionLength,
  emptySeo,
  parseSeoValues,
  seoToValues,
  seoValuesToData,
  titleExample,
} from "./seoForm"

const valid = {
  titlePattern: "%s | {name}",
  description: "Beachfront cabins on the coast.",
  image: 3,
  favicon: 5,
  allowIndexing: true,
}

describe("parseSeoValues", () => {
  it("accepts complete defaults and trims text", () => {
    const result = parseSeoValues({
      ...valid,
      titlePattern: " %s | {name} ",
      description: "  Beachfront cabins on the coast. ",
    })
    expect(result).toEqual({ ok: true, values: valid })
  })

  it("accepts empty defaults", () => {
    expect(parseSeoValues(emptySeo)).toEqual({ ok: true, values: emptySeo })
  })

  it("needs %s in the title pattern, so the Page title is not lost", () => {
    const result = parseSeoValues({ ...valid, titlePattern: "{name} only" })
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        titlePattern:
          "Include %s where the Page title goes, for example %s · {name}.",
      },
    })
  })

  it("only allows indexing to be switched by a real boolean", () => {
    const result = parseSeoValues({ ...valid, allowIndexing: "false" })
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { allowIndexing: expect.any(String) },
    })
  })

  it("treats a malformed submission as an error, not a crash", () => {
    expect(parseSeoValues(undefined)).toMatchObject({ ok: false })
    expect(parseSeoValues([1])).toMatchObject({ ok: false })
  })
})

describe("seo values and stored data", () => {
  it("round-trips through the stored shape", () => {
    const data = seoValuesToData(valid)
    expect(data).toEqual({
      titlePattern: "%s | {name}",
      description: "Beachfront cabins on the coast.",
      image: 3,
      favicon: 5,
      allowIndexing: true,
    })
    expect(seoToValues({ id: 1, ...data })).toEqual(valid)
  })

  it("stores empty text as null and reads a fresh SEO as indexing on", () => {
    expect(seoValuesToData(emptySeo)).toMatchObject({
      titlePattern: null,
      description: null,
      image: null,
      favicon: null,
      allowIndexing: true,
    })
    expect(seoToValues({ id: 1 })).toEqual(emptySeo)
  })

  it("keeps indexing off when it was saved off", () => {
    expect(seoToValues({ id: 1, allowIndexing: false }).allowIndexing).toBe(
      false
    )
  })
})

describe("titleExample", () => {
  it("shows how a Page title reads with the pattern and the Site name", () => {
    expect(titleExample("%s · {name}", "Warren Beach")).toBe(
      "About us · Warren Beach"
    )
  })

  it("falls back to the default pattern when empty and a placeholder name", () => {
    expect(titleExample("", "")).toBe("About us · Your Site")
  })
})

describe("describeDescriptionLength", () => {
  it("says nothing is set when empty", () => {
    expect(describeDescriptionLength("")).toEqual({
      count: 0,
      tone: "neutral",
      text: "Search engines show about 50 to 160 characters.",
    })
  })

  it("flags short, good and long descriptions", () => {
    expect(describeDescriptionLength("x".repeat(20))).toMatchObject({
      count: 20,
      tone: "warn",
      text: "20 characters. A little short: aim for 50 to 160.",
    })
    expect(describeDescriptionLength("x".repeat(100))).toMatchObject({
      tone: "good",
      text: "100 characters.",
    })
    expect(describeDescriptionLength("x".repeat(170))).toMatchObject({
      tone: "warn",
      text: "170 characters. Search engines may cut it off after 160.",
    })
  })
})
