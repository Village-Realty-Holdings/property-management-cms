import { describe, expect, it } from "vitest"

import { isNavItemActive, navGroups } from "./navItems"

const items = navGroups.flatMap((group) => group.items)
const item = (label: string) => items.find((i) => i.label === label)!

describe("navGroups", () => {
  it("has the Dashboard, then Content, Settings and Tools, in the spec's order", () => {
    expect(
      navGroups.map((g) => [g.label, g.items.map((i) => i.label)])
    ).toEqual([
      [null, ["Dashboard"]],
      ["Content", ["Layouts", "Pages", "Media"]],
      ["Settings", ["Brand", "SEO", "Theme", "Assets"]],
      ["Tools", ["Replace Text", "Replace Image"]],
    ])
  })

  it("links each item to its Admin route", () => {
    expect(items.map((i) => i.href)).toEqual([
      "/admin",
      "/admin/layouts",
      "/admin/pages",
      "/admin/media",
      "/admin/settings/brand",
      "/admin/settings/seo",
      "/admin/theme",
      "/admin/settings/assets/fonts",
      "/admin/tools/replace-text",
      "/admin/tools/replace-image",
    ])
  })
})

describe("isNavItemActive", () => {
  it("marks the Dashboard active only at the Admin root", () => {
    expect(isNavItemActive(item("Dashboard"), "/admin")).toBe(true)
    expect(isNavItemActive(item("Dashboard"), "/admin/pages")).toBe(false)
  })

  it("marks an item active on its route and everything below it", () => {
    expect(isNavItemActive(item("Pages"), "/admin/pages")).toBe(true)
    expect(isNavItemActive(item("Pages"), "/admin/pages/12")).toBe(true)
    expect(isNavItemActive(item("Pages"), "/admin/pages-archive")).toBe(false)
    expect(isNavItemActive(item("Media"), "/admin/pages")).toBe(false)
  })

  it("keeps Assets active on any Assets screen", () => {
    expect(
      isNavItemActive(item("Assets"), "/admin/settings/assets/fonts")
    ).toBe(true)
    expect(isNavItemActive(item("Assets"), "/admin/settings/assets")).toBe(true)
    expect(isNavItemActive(item("Brand"), "/admin/settings/assets/fonts")).toBe(
      false
    )
  })
})
