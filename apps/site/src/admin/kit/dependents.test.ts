import { describe, expect, it } from "vitest"

import { summarizeDependents, type Dependent } from "./dependents"

const page = (name: string): Dependent => ({ kind: "Page", name })
const layout = (name: string): Dependent => ({ kind: "Layout", name })

describe("summarizeDependents", () => {
  it("says nothing depends on the item when the list is empty", () => {
    expect(summarizeDependents([])).toBe("Nothing else uses it.")
  })

  it("counts one kind", () => {
    expect(summarizeDependents([page("Home")])).toBe("Used by 1 Page.")
    expect(summarizeDependents([page("Home"), page("About")])).toBe(
      "Used by 2 Pages."
    )
  })

  it("lists several kinds, in the order they first appear", () => {
    expect(
      summarizeDependents([
        layout("Listings"),
        page("Home"),
        page("About"),
        page("Stays"),
      ])
    ).toBe("Used by 1 Layout and 3 Pages.")
  })

  it("joins three kinds with commas", () => {
    expect(
      summarizeDependents([
        page("a"),
        layout("b"),
        { kind: "Theme", name: "c" },
      ])
    ).toBe("Used by 1 Page, 1 Layout and 1 Theme.")
  })

  it("uses the given plural for irregular kinds", () => {
    expect(
      summarizeDependents([
        { kind: "Category", plural: "Categories", name: "a" },
        { kind: "Category", plural: "Categories", name: "b" },
      ])
    ).toBe("Used by 2 Categories.")
  })
})
