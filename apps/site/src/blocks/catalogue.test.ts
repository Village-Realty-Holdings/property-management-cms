import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  backgroundField,
  backgrounds,
  textColourField,
} from "../fields/background"
import { footerBlocks, headerBlocks } from "./region"
import {
  catalogue,
  catalogueEntries,
  blockGroups,
  entryBySlug,
  fitsNarrow,
} from "./catalogue"
import { pageBlocks } from "."

const publicDir = fileURLToPath(new URL("../../public", import.meta.url))

describe("the Block catalogue", () => {
  it("has an entry for every Block the Admin offers, labelled as the Admin labels it", () => {
    expect(catalogueEntries.map((e) => e.blockType)).toEqual(
      pageBlocks.map((block) => block.slug)
    )
    for (const block of pageBlocks) {
      const labels = block.labels as { singular: string }
      expect(catalogue[block.slug as keyof typeof catalogue].label).toBe(
        labels.singular
      )
    }
  })

  it("groups every entry under a known group, with a description", () => {
    for (const entry of catalogueEntries) {
      expect(blockGroups).toContain(entry.group)
      expect(entry.description.length).toBeGreaterThan(10)
    }
  })

  it("has unique slugs, and its thumbnail at /block-thumbnails/<slug>.svg in public", () => {
    const slugs = catalogueEntries.map((e) => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const entry of catalogueEntries) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(entry.thumbnail).toBe(`/block-thumbnails/${entry.slug}.svg`)
      expect(
        existsSync(`${publicDir}${entry.thumbnail}`),
        entry.thumbnail
      ).toBe(true)
    }
  })

  it("starts each new Block from defaults of its own type", () => {
    for (const entry of catalogueEntries) {
      expect(entry.defaults.blockType).toBe(entry.blockType)
    }
  })

  it("offers a background exactly on the Blocks that have the field", () => {
    for (const block of pageBlocks) {
      const hasField = block.fields.some(
        (field) => "name" in field && field.name === "background"
      )
      expect(
        catalogue[block.slug as keyof typeof catalogue].takesBackground
      ).toBe(hasField)
    }
  })

  it("says which Blocks fit a column narrower than the page", () => {
    expect(
      catalogueEntries
        .filter((entry) => entry.fitsNarrow)
        .map((entry) => entry.label)
    ).toEqual([
      "Rich text",
      "Call to action",
      "Steps",
      "Features",
      "Amenities",
      "Stats",
      "Image + text",
      "Newsletter",
      "FAQ",
      "Form",
      "Guest feedback survey",
      "Button",
      "Image",
      "Container",
    ])
    expect(fitsNarrow("richText")).toBe(true)
    expect(fitsNarrow("searchHero")).toBe(false)
    // A type the catalogue doesn't have is not this rule's to refuse.
    expect(fitsNarrow("gone")).toBe(true)
  })

  it("finds an entry by its slug", () => {
    expect(entryBySlug("rich-text")?.blockType).toBe("richText")
    expect(entryBySlug("nope")).toBeUndefined()
  })
})

describe("the background field", () => {
  it("offers the Theme's surfaces, on Default, as a style setting", () => {
    expect(backgroundField.label).toBe("Background")
    expect(backgroundField.defaultValue).toBe("default")
    expect(
      backgroundField.options.map((o) => (typeof o === "string" ? o : o.value))
    ).toEqual([...backgrounds])
    expect(
      backgroundField.options.map((o) => (typeof o === "string" ? o : o.label))
    ).toEqual([
      "Default",
      "Muted",
      "Primary",
      "Accent",
      "Third colour",
      "Dark surface",
    ])
    expect(backgroundField.custom).toEqual({ style: true })
  })

  it("comes with a text colour: Automatic, White or Dark", () => {
    expect(textColourField.name).toBe("textColour")
    expect(textColourField.defaultValue).toBe("auto")
    expect(
      textColourField.options.map((o) => (typeof o === "string" ? o : o.value))
    ).toEqual(["auto", "white", "dark"])
    expect(textColourField.custom).toEqual({ style: true })
    // Every Block with a background has it, and the three Footer and Header
    // Blocks that are bands.
    for (const block of [...pageBlocks, ...headerBlocks, ...footerBlocks]) {
      const names = block.fields.flatMap((f) => ("name" in f ? [f.name] : []))
      expect(names.includes("textColour"), block.slug).toBe(
        names.includes("background")
      )
    }
    for (const slug of ["utilityStrip", "legalBar", "footerColumns"]) {
      const block = [...headerBlocks, ...footerBlocks].find(
        (b) => b.slug === slug
      )!
      expect(
        block.fields.some((f) => "name" in f && f.name === "textColour"),
        slug
      ).toBe(true)
    }
  })
})
