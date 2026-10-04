import type { Block, Field } from "payload"
import { describe, expect, it } from "vitest"

import { navLink } from "../../fields/navLink"
import { footerBlocks, headerBlocks, regionHolds } from "./index"
import { Navigation } from "./Navigation"

const slugs = (blocks: Block[]) => blocks.map((b) => b.slug)

/** Walks a field tree, calling `visit` on every field with its ancestors' names. */
function walk(
  fields: Field[],
  visit: (field: Field, path: string[]) => void,
  path: string[] = []
) {
  for (const field of fields) {
    visit(field, path)
    const name = "name" in field ? [String(field.name)] : []
    if ("fields" in field) walk(field.fields, visit, [...path, ...name])
  }
}

function find(fields: Field[], name: string): Field {
  let found: Field | undefined
  walk(fields, (f) => {
    if ("name" in f && f.name === name && !found) found = f
  })
  if (!found) throw new Error(`no field ${name}`)
  return found
}

describe("the region Blocks", () => {
  it("offers only the Header Blocks in a Header", () => {
    expect(slugs(headerBlocks)).toEqual([
      "logo",
      "navigation",
      "headerActions",
      "utilityStrip",
      "container",
    ])
  })

  it("offers the Footer Blocks, plus Newsletter and Call to action, in a Footer", () => {
    expect(slugs(footerBlocks)).toEqual([
      "footerColumns",
      "legalBar",
      "newsletter",
      "callToAction",
      "logo",
      "container",
    ])
  })

  it("keeps the Header-only and Footer-only Blocks apart: they share the Logo and the Container", () => {
    const header = new Set(slugs(headerBlocks))
    expect(slugs(footerBlocks).filter((s) => header.has(s))).toEqual([
      "logo",
      "container",
    ])
    expect(regionHolds("header", "legalBar", false)).toBe(false)
    expect(regionHolds("footer", "navigation", true)).toBe(false)
    expect(regionHolds("footer", "logo", true)).toBe(true)
    expect(regionHolds("header", "utilityStrip", false)).toBe(true)
    expect(regionHolds("header", "utilityStrip", true)).toBe(false)
    expect(regionHolds("header", "hero", false)).toBe(false)
  })

  it("gives every Block an interface name", () => {
    for (const block of [...headerBlocks, ...footerBlocks])
      expect(block.interfaceName, block.slug).toBeTruthy()
  })
})

describe("Navigation", () => {
  const items = find(Navigation.fields, "items") as { fields: Field[] }
  const children = find(items.fields, "children") as {
    type: string
    fields: Field[]
  }

  it("has dropdown items that hold links, not further dropdowns", () => {
    expect(children.type).toBe("array")
    const nested: string[] = []
    walk(children.fields, (f, path) => {
      if ("name" in f && f.name === "children") nested.push(path.join("."))
    })
    expect(nested).toEqual([])
  })

  it("shows an item as a dropdown or as mega-menu columns", () => {
    const display = find(items.fields, "display") as {
      defaultValue: string
      options: { value: string }[]
    }
    expect(display.defaultValue).toBe("dropdown")
    expect(display.options.map((o) => o.value)).toEqual(["dropdown", "mega"])
  })
})

describe("navLink", () => {
  const link = navLink("link") as unknown as { fields: Field[] }
  const url = find(link.fields, "url") as {
    validate: (v: string | null | undefined) => true | string
  }

  it("is either a Page or a URL", () => {
    const type = find(link.fields, "type") as {
      type: string
      options: { value: string }[]
    }
    expect(type.type).toBe("radio")
    expect(type.options.map((o) => o.value)).toEqual(["page", "url"])
    const page = find(link.fields, "page") as {
      type: string
      relationTo: string
    }
    expect(page.type).toBe("relationship")
    expect(page.relationTo).toBe("pages")
  })

  it("accepts Site paths and http(s), mailto and tel URLs", () => {
    for (const ok of [
      "",
      "/about",
      "#top",
      "https://example.com/x",
      "mailto:a@b.co",
      "tel:+44 20 7946 0000",
    ])
      expect(url.validate(ok), ok).toBe(true)
  })

  it("rejects unsafe or malformed URLs", () => {
    for (const bad of [
      "javascript:alert(1)",
      "//evil.com",
      "/\\evil.com",
      "example.com",
    ])
      expect(url.validate(bad), bad).not.toBe(true)
  })
})
