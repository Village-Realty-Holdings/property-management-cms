import { describe, expect, it } from "vitest"

import {
  nextPathForTitle,
  resolvePageLayout,
  seoCount,
  suggestLayoutName,
  type LayoutOption,
} from "./pageTabModel"

const layout = (
  over: Partial<LayoutOption> & { id: number }
): LayoutOption => ({
  name: `Layout ${over.id}`,
  isDefault: false,
  paths: [],
  header: [],
  footer: [],
  ...over,
})

const layouts = [
  layout({ id: 1, name: "Main", isDefault: true }),
  layout({ id: 2, name: "Listings", paths: ["/stays"] }),
]

describe("resolvePageLayout", () => {
  it("follows the path for the default choice, and says how", () => {
    expect(
      resolvePageLayout(layouts, "/stays/cabin", { mode: "default" })
    ).toMatchObject({ id: 2, label: "Listings, via /stays" })
  })

  it("falls back to the default Layout", () => {
    expect(
      resolvePageLayout(layouts, "/about", { mode: "default" })
    ).toMatchObject({ id: 1, label: "Main (default)" })
  })

  it("uses the specific Layout whatever the path", () => {
    expect(
      resolvePageLayout(layouts, "/stays", { mode: "layout", layoutId: 1 })
    ).toMatchObject({ id: 1, label: "Main" })
  })

  it("is null for No Layout, and when there are no Layouts", () => {
    expect(resolvePageLayout(layouts, "/", { mode: "none" })).toBeNull()
    expect(resolvePageLayout([], "/", { mode: "default" })).toBeNull()
  })

  it("carries the Layout's Blocks for the canvas", () => {
    const header = [{ id: "a", blockType: "logo" }] as never
    const found = resolvePageLayout(
      [layout({ id: 5, isDefault: true, header })],
      "/",
      { mode: "default" }
    )
    expect(found?.header).toBe(header)
  })
})

describe("nextPathForTitle", () => {
  const base = { saved: false, path: "/untitled-page", from: "Untitled Page" }

  it("makes a New Page's path follow its title", () => {
    expect(nextPathForTitle({ ...base, to: "Our story" })).toBe("/our-story")
  })

  it("follows through a numbered default", () => {
    expect(
      nextPathForTitle({ ...base, path: "/untitled-page-2", to: "Stays" })
    ).toBe("/stays")
  })

  it("keeps a path the Staff User typed", () => {
    expect(
      nextPathForTitle({ ...base, path: "/custom", to: "Our story" })
    ).toBeNull()
  })

  it("never moves a saved Page's path", () => {
    expect(
      nextPathForTitle({ ...base, saved: true, to: "Our story" })
    ).toBeNull()
  })

  it("keeps the path when the title gives nothing usable", () => {
    expect(nextPathForTitle({ ...base, to: "!!!" })).toBeNull()
    expect(nextPathForTitle({ ...base, to: "" })).toBeNull()
  })

  it("gives Home the root path", () => {
    expect(nextPathForTitle({ ...base, to: "Home" })).toBe("/")
  })
})

describe("seoCount", () => {
  it("counts the trimmed text against the limit", () => {
    expect(seoCount("  hello ", 10)).toEqual({ count: 5, max: 10, over: false })
  })

  it("flags text past the limit", () => {
    expect(seoCount("x".repeat(11), 10).over).toBe(true)
    expect(seoCount("x".repeat(10), 10).over).toBe(false)
  })
})

describe("suggestLayoutName", () => {
  it("adds (copy)", () => {
    expect(suggestLayoutName("Main", layouts)).toBe("Main (copy)")
  })

  it("numbers the copy when that is taken, in any letter case", () => {
    const taken = [{ name: "Main" }, { name: "MAIN (copy)" }]
    expect(suggestLayoutName("Main", taken)).toBe("Main (copy 2)")
    expect(
      suggestLayoutName("Main", [...taken, { name: "main (copy 2)" }])
    ).toBe("Main (copy 3)")
  })
})
