import { describe, expect, it } from "vitest"

import {
  getLayoutRows,
  getRecentLayouts,
  pageToRecentItem,
  toPageRow,
} from "./rows"

const latest = {
  id: 7,
  title: "Stays",
  path: "/stays",
  updatedAt: "2026-03-01T10:00:00.000Z",
  _status: "draft" as const,
}

describe("toPageRow", () => {
  it("combines the newest version with the published copy's status", () => {
    expect(toPageRow(latest, "published")).toEqual({
      id: 7,
      title: "Stays",
      path: "/stays",
      status: "changes",
      layout: "No Layout",
      updatedAt: "2026-03-01T10:00:00.000Z",
    })
  })

  it("is a Draft when the Page was never published", () => {
    expect(toPageRow(latest, "draft").status).toBe("draft")
    expect(toPageRow(latest, undefined).status).toBe("draft")
  })
})

describe("pageToRecentItem", () => {
  it("opens the Page in the editor", () => {
    expect(pageToRecentItem(toPageRow(latest, "draft"))).toEqual({
      kind: "page",
      id: 7,
      title: "Stays",
      href: "/admin/pages/7",
      updatedAt: "2026-03-01T10:00:00.000Z",
    })
  })
})

describe("Layout seams (until the collection exists)", () => {
  it("has no Layouts", () => {
    expect(getLayoutRows()).toEqual([])
    expect(getRecentLayouts()).toEqual([])
  })
})
