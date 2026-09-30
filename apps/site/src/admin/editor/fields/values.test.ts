import { describe, expect, it } from "vitest"

import { emptyRowFor, getAt, planWrite } from "./values"

describe("getAt", () => {
  it("reads through objects and arrays", () => {
    const doc = { blocks: [{ items: [{ label: "A" }] }] }
    expect(getAt(doc, ["blocks", 0, "items", 0, "label"])).toBe("A")
  })

  it("is undefined when the path leads nowhere", () => {
    expect(getAt({ a: null }, ["a", "b"])).toBeUndefined()
    expect(getAt({ a: [] }, ["a", 3])).toBeUndefined()
  })
})

describe("planWrite", () => {
  const doc = {
    kind: "page",
    blocks: [{ blockType: "hero", heading: "Hi", cta: { label: "Go" } }],
  }

  it("writes straight to a field that exists", () => {
    expect(planWrite(doc, ["blocks", 0, "heading"], "Yo")).toEqual({
      path: "blocks.0.heading",
      value: "Yo",
    })
  })

  it("writes at the deepest existing parent when the field is missing", () => {
    expect(planWrite(doc, ["blocks", 0, "subheading"], "Sub")).toEqual({
      path: "blocks.0",
      value: {
        blockType: "hero",
        heading: "Hi",
        cta: { label: "Go" },
        subheading: "Sub",
      },
    })
  })

  it("creates the groups in between", () => {
    const plan = planWrite(doc, ["blocks", 0, "link", "url"], "/x")
    expect(plan.path).toBe("blocks.0")
    expect(plan.value).toMatchObject({ link: { url: "/x" } })
  })

  it("replaces a null group with an object", () => {
    const plan = planWrite(
      { blocks: [{ cta: null }] },
      ["blocks", 0, "cta", "label"],
      "Go"
    )
    expect(plan).toEqual({ path: "blocks.0.cta", value: { label: "Go" } })
  })

  it("does not mutate the document", () => {
    const before = structuredClone(doc)
    planWrite(doc, ["blocks", 0, "link", "url"], "/x")
    expect(doc).toEqual(before)
  })
})

describe("emptyRowFor", () => {
  it("gives every field its default or an empty value", () => {
    expect(
      emptyRowFor([
        { name: "label", type: "text" },
        {
          name: "display",
          type: "select",
          defaultValue: "dropdown",
          options: [],
        },
        { name: "on", type: "checkbox" },
        { name: "count", type: "number" },
        { name: "image", type: "upload", relationTo: "media" },
        { type: "row", fields: [{ name: "note", type: "textarea" }] },
        {
          name: "link",
          type: "group",
          fields: [{ name: "href", type: "text" }],
        },
        { name: "children", type: "array", fields: [] },
      ])
    ).toEqual({
      label: "",
      display: "dropdown",
      on: false,
      count: null,
      image: null,
      note: "",
      link: { href: "" },
      children: [],
    })
  })
})
