import { describe, expect, it } from "vitest"

import type { PageRow, RecentItem } from "./rows"
import {
  continueEditing,
  needsSeoAttention,
  waitingToPublish,
} from "./summaries"

const recent = (
  id: number,
  updatedAt: string,
  kind: "page" | "layout" = "page"
) =>
  ({
    kind,
    id,
    title: `Item ${id}`,
    href: `/admin/${kind}s/${id}`,
    updatedAt,
  }) satisfies RecentItem

describe("continueEditing", () => {
  it("lists the most recently edited first", () => {
    const items = [
      recent(1, "2026-01-01T00:00:00Z"),
      recent(2, "2026-03-01T00:00:00Z"),
      recent(3, "2026-02-01T00:00:00Z"),
    ]
    expect(continueEditing(items).map((i) => i.id)).toEqual([2, 3, 1])
  })

  it("stops at five", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      recent(i + 1, `2026-01-0${i + 1}T00:00:00Z`)
    )
    expect(continueEditing(items).map((i) => i.id)).toEqual([8, 7, 6, 5, 4])
  })

  it("merges Pages and Layouts into one list", () => {
    const items = [
      recent(1, "2026-01-01T00:00:00Z", "page"),
      recent(1, "2026-02-01T00:00:00Z", "layout"),
    ]
    expect(continueEditing(items).map((i) => i.kind)).toEqual([
      "layout",
      "page",
    ])
  })

  it("does not reorder its input", () => {
    const items = [
      recent(1, "2026-01-01T00:00:00Z"),
      recent(2, "2026-02-01T00:00:00Z"),
    ]
    continueEditing(items)
    expect(items.map((i) => i.id)).toEqual([1, 2])
  })
})

const row = (id: number, status: PageRow["status"]): PageRow => ({
  id,
  title: `Page ${id}`,
  path: `/p${id}`,
  status,
  layout: "No Layout",
  updatedAt: "2026-01-01T00:00:00Z",
})

describe("waitingToPublish", () => {
  it("selects Pages with unpublished changes, and never-published Drafts", () => {
    const rows = [
      row(1, "published"),
      row(2, "changes"),
      row(3, "draft"),
      row(4, "published"),
    ]
    expect(waitingToPublish(rows).map((r) => r.id)).toEqual([2, 3])
  })

  it("is empty when everything is published", () => {
    expect(waitingToPublish([row(1, "published")])).toEqual([])
  })
})

describe("needsSeoAttention", () => {
  it.each([
    [{ title: "T", description: "D" }, false],
    [{ title: "", description: "D" }, true],
    [{ title: "T", description: "" }, true],
    [{ title: "  ", description: "D" }, true],
    [{ title: "T", description: null }, true],
    [{}, true],
    [undefined, true],
    [null, true],
  ])("seo %j needs attention: %s", (seo, expected) => {
    expect(needsSeoAttention(seo)).toBe(expected)
  })
})
