import { beforeEach, describe, expect, it, vi } from "vitest"

const testUser = vi.hoisted(() => ({
  payload: { tag: "payload" },
  as: { overrideAccess: false, user: { id: 7 } },
}))
const requireUser = vi.hoisted(() => vi.fn())
const loadPageRows = vi.hoisted(() => vi.fn())
vi.mock("../session", () => ({ requireUser }))
vi.mock("../dashboard/queries", () => ({ loadPageRows }))

import { searchPages } from "./pagePicker"

const row = (id: number) => ({
  id,
  title: `Page ${id}`,
  path: `/p${id}`,
  status: "draft" as const,
  layout: "No Layout",
  updatedAt: "2026-01-01T00:00:00.000Z",
})

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue(testUser)
  loadPageRows.mockReset().mockResolvedValue([row(1), row(2)])
})

describe("searchPages", () => {
  it("searches as the User and returns just what the picker shows", async () => {
    expect(await searchPages("  page ")).toEqual([
      { id: 1, title: "Page 1", path: "/p1", status: "draft" },
      { id: 2, title: "Page 2", path: "/p2", status: "draft" },
    ])
    expect(loadPageRows).toHaveBeenCalledWith(testUser.payload, testUser.as, {
      q: "page",
    })
  })

  it("returns at most 25 Pages", async () => {
    loadPageRows.mockResolvedValue(Array.from({ length: 40 }, (_, i) => row(i)))
    expect(await searchPages("")).toHaveLength(25)
  })

  it("does not search at all when the caller is not signed in", async () => {
    requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"))
    await expect(searchPages("x")).rejects.toThrow("NEXT_REDIRECT")
    expect(loadPageRows).not.toHaveBeenCalled()
  })

  it("treats anything but text as an empty search", async () => {
    await searchPages(42 as unknown as string)
    expect(loadPageRows).toHaveBeenCalledWith(testUser.payload, testUser.as, {
      q: "",
    })
  })
})
