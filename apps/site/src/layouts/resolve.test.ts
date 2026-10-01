import { describe, expect, it } from "vitest"

import {
  layoutLabel,
  normalizePath,
  resolveLayout,
  type LayoutCandidate,
} from "./resolve"

const main: LayoutCandidate = {
  id: "main",
  name: "Main",
  paths: [],
  isDefault: true,
}
const listings: LayoutCandidate = {
  id: "listings",
  name: "Listings",
  paths: ["/stays"],
  isDefault: false,
}
const villas: LayoutCandidate = {
  id: "villas",
  name: "Villas",
  paths: ["/stays/villas", "/rentals/"],
  isDefault: false,
}
const layouts = [main, listings, villas]

const route = { mode: "route" } as const

describe("normalizePath", () => {
  it.each([
    ["/", "/"],
    ["", "/"],
    ["stays", "/stays"],
    ["/stays/", "/stays"],
    ["/stays///", "/stays"],
    ["//stays//x/", "/stays/x"],
  ])("%j -> %j", (input, expected) => {
    expect(normalizePath(input)).toBe(expected)
  })
})

describe("resolveLayout: a Page that picks a specific Layout", () => {
  it("uses it, even when a path prefix or the default would apply", () => {
    const result = resolveLayout({
      path: "/stays/cabin",
      choice: { mode: "specific", layoutId: "main" },
      layouts,
    })
    expect(result).toEqual({ layout: main, reason: "specific" })
  })

  it("uses it for a Layout that is not the default and covers no path", () => {
    const orphan = { ...main, id: "o", name: "O", isDefault: false }
    const result = resolveLayout({
      path: "/about",
      choice: { mode: "specific", layoutId: "o" },
      layouts: [main, orphan],
    })
    expect(result.layout).toBe(orphan)
    expect(result.reason).toBe("specific")
  })

  it("matches a numeric id against a string id", () => {
    const numeric = { ...listings, id: 7 }
    const result = resolveLayout({
      path: "/about",
      choice: { mode: "specific", layoutId: "7" },
      layouts: [main, numeric],
    })
    expect(result.layout).toBe(numeric)
  })

  it("falls back to route resolution when that Layout no longer exists", () => {
    const result = resolveLayout({
      path: "/stays/cabin",
      choice: { mode: "specific", layoutId: "deleted" },
      layouts,
    })
    expect(result).toEqual({
      layout: listings,
      reason: "path",
      via: "/stays",
    })
  })

  it("falls back to route resolution when no Layout id is given", () => {
    const result = resolveLayout({
      path: "/about",
      choice: { mode: "specific" },
      layouts,
    })
    expect(result).toEqual({ layout: main, reason: "default" })
  })
})

describe("resolveLayout: a Page that picks No Layout", () => {
  it("renders none, whatever paths and the default say", () => {
    const result = resolveLayout({
      path: "/stays/cabin",
      choice: { mode: "none" },
      layouts,
    })
    expect(result).toEqual({ layout: null, reason: "none" })
  })
})

describe("resolveLayout: by path", () => {
  it("covers the prefix itself and everything under it", () => {
    for (const path of ["/stays", "/stays/", "/stays/cabin", "/stays/a/b/c"]) {
      const result = resolveLayout({ path, choice: route, layouts })
      expect(result.layout).toBe(listings)
      expect(result.reason).toBe("path")
      expect(result).toMatchObject({ via: "/stays" })
    }
  })

  it("does not cross a segment boundary", () => {
    for (const path of ["/stayshome", "/stays-home", "/stay", "/mystays"]) {
      const result = resolveLayout({ path, choice: route, layouts })
      expect(result.layout).toBe(main)
      expect(result.reason).toBe("default")
    }
  })

  it("picks the longest matching prefix among nested prefixes", () => {
    const nested = resolveLayout({
      path: "/stays/villas/blue",
      choice: route,
      layouts,
    })
    expect(nested).toEqual({
      layout: villas,
      reason: "path",
      via: "/stays/villas",
    })

    const outer = resolveLayout({
      path: "/stays/cabins",
      choice: route,
      layouts,
    })
    expect(outer.layout).toBe(listings)
  })

  it("picks the longest prefix regardless of Layout order", () => {
    const result = resolveLayout({
      path: "/stays/villas",
      choice: route,
      layouts: [villas, listings, main],
    })
    expect(result.layout).toBe(villas)
  })

  it("normalises trailing slashes on both the path and the prefixes", () => {
    const result = resolveLayout({
      path: "/rentals/",
      choice: route,
      layouts,
    })
    expect(result).toEqual({ layout: villas, reason: "path", via: "/rentals" })
  })

  it("treats a `/` prefix as matching every path, but only as a last resort", () => {
    const everything = { ...listings, id: "all", name: "All", paths: ["/"] }
    const all = [main, everything, villas]
    expect(
      resolveLayout({ path: "/", choice: route, layouts: all }).layout
    ).toBe(everything)
    expect(
      resolveLayout({ path: "/about/us", choice: route, layouts: all })
    ).toEqual({ layout: everything, reason: "path", via: "/" })
    expect(
      resolveLayout({ path: "/stays/villas/x", choice: route, layouts: all })
        .layout
    ).toBe(villas)
  })

  it("ignores blank prefixes", () => {
    const blank = { ...listings, paths: ["", "  "] }
    const result = resolveLayout({
      path: "/anything",
      choice: route,
      layouts: [main, blank],
    })
    expect(result.layout).toBe(main)
  })

  it("keeps the first Layout when two claim the same prefix", () => {
    const twin = { ...listings, id: "twin", name: "Twin" }
    const result = resolveLayout({
      path: "/stays",
      choice: route,
      layouts: [main, listings, twin],
    })
    expect(result.layout).toBe(listings)
  })
})

describe("resolveLayout: the default", () => {
  it("is used when no prefix matches", () => {
    expect(resolveLayout({ path: "/about", choice: route, layouts })).toEqual({
      layout: main,
      reason: "default",
    })
  })

  it("is used for the home page when nothing covers /", () => {
    expect(resolveLayout({ path: "/", choice: route, layouts }).layout).toBe(
      main
    )
  })

  it("resolves to no Layout when there is no default and no match", () => {
    expect(
      resolveLayout({ path: "/about", choice: route, layouts: [listings] })
    ).toEqual({ layout: null, reason: "default" })
    expect(
      resolveLayout({ path: "/", choice: route, layouts: [] }).layout
    ).toBeNull()
  })
})

describe("layoutLabel", () => {
  it("names the Layout and the prefix for a path match", () => {
    expect(
      layoutLabel(
        resolveLayout({ path: "/stays/cabin", choice: route, layouts })
      )
    ).toBe("Listings, via /stays")
  })

  it("marks the default Layout", () => {
    expect(
      layoutLabel(resolveLayout({ path: "/about", choice: route, layouts }))
    ).toBe("Main (default)")
  })

  it("gives just the name for a specific Layout", () => {
    expect(
      layoutLabel(
        resolveLayout({
          path: "/about",
          choice: { mode: "specific", layoutId: "listings" },
          layouts,
        })
      )
    ).toBe("Listings")
  })

  it('says "No Layout" for none, and when nothing resolves', () => {
    expect(
      layoutLabel(
        resolveLayout({ path: "/x", choice: { mode: "none" }, layouts })
      )
    ).toBe("No Layout")
    expect(
      layoutLabel(resolveLayout({ path: "/x", choice: route, layouts: [] }))
    ).toBe("No Layout")
  })
})
