import type { Field } from "payload"
import { describe, expect, it } from "vitest"

import {
  descriptionOf,
  isIconField,
  isVisible,
  labelOf,
  valueOrDefault,
} from "./schema"

describe("labelOf", () => {
  it("uses the label, else the field's name in words", () => {
    expect(labelOf({ name: "heading", type: "text" })).toBe("Heading")
    expect(labelOf({ name: "emailPlaceholder", type: "text" })).toBe(
      "Email Placeholder"
    )
    expect(labelOf({ name: "href", label: "Link", type: "text" })).toBe("Link")
  })

  it("is empty when the label is turned off", () => {
    expect(labelOf({ name: "x", label: false, type: "text" })).toBe("")
  })
})

describe("descriptionOf", () => {
  it("reads a plain description", () => {
    expect(
      descriptionOf({ name: "a", type: "text", admin: { description: "Hi" } })
    ).toBe("Hi")
  })

  it("ignores a description that is not plain text", () => {
    const field: Field = {
      name: "a",
      type: "text",
      admin: { description: () => "x" },
    }
    expect(descriptionOf(field)).toBeUndefined()
  })
})

describe("isVisible", () => {
  it("shows a field with no condition", () => {
    expect(isVisible({ name: "a", type: "text" }, {}, {})).toBe(true)
  })

  it("passes the Block's data and the sibling data to the condition", () => {
    const field: Field = {
      name: "phone",
      type: "text",
      admin: { condition: (_, sibling) => sibling?.showPhone !== false },
    }
    expect(isVisible(field, {}, { showPhone: false })).toBe(false)
    expect(isVisible(field, {}, { showPhone: true })).toBe(true)
    expect(isVisible(field, {}, {})).toBe(true)
  })

  it("hides a hidden field, and one whose condition throws is shown", () => {
    expect(
      isVisible({ name: "a", type: "text", admin: { hidden: true } }, {}, {})
    ).toBe(false)
    expect(
      isVisible(
        {
          name: "a",
          type: "text",
          admin: {
            condition: () => {
              throw new Error("boom")
            },
          },
        },
        {},
        {}
      )
    ).toBe(true)
  })
})

describe("valueOrDefault", () => {
  it("falls back to the default only when there is no value", () => {
    const field: Field = {
      name: "size",
      type: "select",
      defaultValue: "medium",
      options: ["small", "medium"],
    }
    expect(valueOrDefault(field, undefined)).toBe("medium")
    expect(valueOrDefault(field, "small")).toBe("small")
    expect(valueOrDefault(field, "")).toBe("")
  })
})

describe("isIconField", () => {
  it("is a text field called icon, or one marked as an icon picker", () => {
    expect(isIconField({ name: "icon", type: "text" })).toBe(true)
    expect(
      isIconField({ name: "glyph", type: "text", custom: { picker: "icon" } })
    ).toBe(true)
    expect(isIconField({ name: "heading", type: "text" })).toBe(false)
    expect(isIconField({ name: "icon", type: "number" })).toBe(false)
  })
})
