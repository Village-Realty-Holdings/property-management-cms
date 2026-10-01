import { describe, expect, it } from "vitest"

import { isDirty } from "./dirty"

describe("isDirty", () => {
  it("is clean when nothing changed", () => {
    expect(
      isDirty(
        { title: "Home", seo: { a: 1 } },
        { title: "Home", seo: { a: 1 } }
      )
    ).toBe(false)
  })

  it("is dirty when a field changed, at any depth", () => {
    expect(isDirty({ title: "Home" }, { title: "Homes" })).toBe(true)
    expect(isDirty({ seo: { a: 1 } }, { seo: { a: 2 } })).toBe(true)
    expect(isDirty({ tags: ["a", "b"] }, { tags: ["a"] })).toBe(true)
  })

  it("ignores key order but not array order", () => {
    expect(isDirty({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false)
    expect(isDirty({ tags: ["a", "b"] }, { tags: ["b", "a"] })).toBe(true)
  })

  it("treats a missing key and undefined as the same, but not null", () => {
    expect(isDirty({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(isDirty({ a: 1 }, { a: 1, b: null })).toBe(true)
  })

  it("compares dates by time", () => {
    expect(isDirty({ d: new Date(5) }, { d: new Date(5) })).toBe(false)
    expect(isDirty({ d: new Date(5) }, { d: new Date(6) })).toBe(true)
  })

  it("compares primitives", () => {
    expect(isDirty("a", "a")).toBe(false)
    expect(isDirty(1, "1")).toBe(true)
    expect(isDirty(null, undefined)).toBe(true)
  })
})
