import { describe, expect, it } from "vitest"

import type { LayoutInfo } from "../../layouts/usage"
import {
  getLayoutRows,
  getRecentLayouts,
  layoutLabelForPage,
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

describe("layoutLabelForPage", () => {
  const labels = new Map([[7, "Listings, via /stays"]])

  it("reads the Page's resolved label", () => {
    expect(layoutLabelForPage(labels, 7)).toBe("Listings, via /stays")
  })

  it("is No Layout for a Page that is not in the usage", () => {
    expect(layoutLabelForPage(labels, 8)).toBe("No Layout")
  })

  it("is what a Pages list row shows", () => {
    expect(toPageRow(latest, "draft", "Main (default)").layout).toBe(
      "Main (default)"
    )
  })
})

const info = (
  id: number,
  name: string,
  over: Partial<LayoutInfo> = {}
): LayoutInfo => ({
  id,
  name,
  paths: [],
  isDefault: false,
  updatedAt: "2026-03-01T10:00:00.000Z",
  ...over,
})

describe("getLayoutRows", () => {
  it("has no rows without Layouts", () => {
    expect(getLayoutRows([], { usedBy: new Map() })).toEqual([])
  })

  it("lists Layouts by name with paths, default flag and how many Pages use them", () => {
    const rows = getLayoutRows(
      [
        info(2, "Listings", { paths: ["/stays", "/rentals"] }),
        info(1, "Main", { isDefault: true }),
      ],
      { usedBy: new Map([[2, 3]]) }
    )
    expect(rows).toEqual([
      {
        id: 2,
        name: "Listings",
        paths: ["/stays", "/rentals"],
        isDefault: false,
        usedByPages: 3,
        dependents: [],
        pages: [],
        updatedAt: "2026-03-01T10:00:00.000Z",
      },
      {
        id: 1,
        name: "Main",
        paths: [],
        isDefault: true,
        usedByPages: 0,
        dependents: [],
        pages: [],
        updatedAt: "2026-03-01T10:00:00.000Z",
      },
    ])
  })

  it("carries the Pages that pick a Layout, for the Delete confirmation", () => {
    const pick = { kind: "Page", name: "Pinned", href: "/admin/pages/3" }
    const [row] = getLayoutRows(
      [info(2, "Listings")],
      { usedBy: new Map() },
      new Map([[2, [pick]]])
    )
    expect(row?.dependents).toEqual([pick])
  })
})

describe("getLayoutRows Pages served", () => {
  it("names the Pages a Layout serves by path, linking to each", () => {
    const [row] = getLayoutRows([info(2, "Listings")], {
      usedBy: new Map([[2, 2]]),
      pagesBy: new Map([
        [
          2,
          [
            { id: 10, title: "Cabin" },
            { id: 11, title: "Villa" },
          ],
        ],
      ]),
    })
    expect(row?.pages).toEqual([
      { kind: "Page", name: "Cabin", href: "/admin/pages/10" },
      { kind: "Page", name: "Villa", href: "/admin/pages/11" },
    ])
  })
})

describe("getRecentLayouts", () => {
  it("offers each Layout as an editable item", () => {
    expect(
      getRecentLayouts([
        info(2, "Listings", { updatedAt: "2026-03-02T10:00:00.000Z" }),
      ])
    ).toEqual([
      {
        kind: "layout",
        id: 2,
        title: "Listings",
        href: "/admin/layouts/2",
        updatedAt: "2026-03-02T10:00:00.000Z",
      },
    ])
  })
})
