import { describe, expect, it } from "vitest"

import { catalogue, type CatalogueEntry } from "../../blocks/catalogue"
import type { PageBlock } from "../blocks/types"
import { sampleWithQuery, type Query } from "./blockCatalogue"

describe("sampleWithQuery", () => {
  it("is the Block's sample when nothing is asked for", () => {
    expect(sampleWithQuery(catalogue.callToAction, {})).toMatchObject({
      blockType: "callToAction",
      heading: "Ready to book your stay?",
      background: "default",
    })
  })

  it("sets a field of the sample by its name", () => {
    expect(
      sampleWithQuery(catalogue.callToAction, {
        background: "dark",
        heading: "Hello",
      })
    ).toMatchObject({ background: "dark", heading: "Hello" })
  })

  describe("a sample field that is a number", () => {
    // None of the three Blocks has one yet: Featured rentals' count will.
    const sample = {
      ...catalogue.callToAction.defaults,
      count: 6,
    } as unknown as PageBlock
    const countOf = (query: Query) =>
      (
        sampleWithQuery(catalogue.callToAction, query, sample) as unknown as {
          count: number
        }
      ).count

    it("takes a number from the query", () => {
      expect(countOf({ count: "3" })).toBe(3)
    })

    it("keeps its own value when the query is not a number", () => {
      expect(countOf({ count: "many" })).toBe(6)
      expect(countOf({ count: "" })).toBe(6)
    })
  })

  it("only sets fields the sample has, and never the Block's type or id", () => {
    const block = sampleWithQuery(catalogue.callToAction, {
      nonsense: "x",
      blockType: "hero",
      id: "x",
    })
    expect(block).not.toHaveProperty("nonsense")
    expect(block.blockType).toBe("callToAction")
    expect(block).not.toHaveProperty("id")
  })

  it("leaves fields that are not plain values alone", () => {
    const block = sampleWithQuery(catalogue.callToAction, { button: "x" })
    expect(block).toMatchObject({ button: { label: "Get in touch" } })
  })

  it("sets the Block's own variant field from ?variant=", () => {
    const entry = { ...catalogue.callToAction, variantField: "style" }
    expect(
      sampleWithQuery(entry as CatalogueEntry, { variant: "inverted" })
    ).toMatchObject({ style: "inverted" })
    // A Block with no variant field has nothing to set.
    expect(
      sampleWithQuery(catalogue.callToAction, { variant: "inverted" })
    ).toMatchObject({ style: "primary" })
  })

  it("takes the first of a repeated parameter and skips the fixtures switch", () => {
    expect(
      sampleWithQuery(catalogue.callToAction, {
        heading: ["One", "Two"],
        fixtures: "avada",
      })
    ).toMatchObject({ heading: "One" })
  })
})
