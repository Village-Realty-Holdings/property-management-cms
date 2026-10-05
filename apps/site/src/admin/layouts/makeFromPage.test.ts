import type { Payload } from "payload"
import { beforeEach, describe, expect, it, vi } from "vitest"

const duplicate = vi.hoisted(() => ({ makeLayoutFromPage: vi.fn() }))
vi.mock("../../layouts/duplicate", () => duplicate)

import type { Layout } from "../../payload-types"
import type { UserAccess } from "../dashboard/queries"
import { makeLayoutFromPageAs } from "./makeFromPage"

const findVersions = vi.fn()
const payload = { findVersions } as unknown as Payload

/** The Page's latest version, as findVersions answers. */
const pageVersion = (id: number) =>
  findVersions.mockResolvedValue({
    docs: [{ id, createdAt: "2026-10-04T14:32:00.000Z", version: {} }],
  })
const as = {
  overrideAccess: false,
  user: { id: 1 },
} as unknown as UserAccess

const copy = {
  id: 9,
  name: "Lodge",
  isDefault: false,
  paths: [],
  header: [{ id: "h", blockType: "logo" }],
  footer: [],
} as unknown as Layout

beforeEach(() => vi.resetAllMocks())

describe("makeLayoutFromPageAs", () => {
  it("copies the Layout for the Page and answers with the copy", async () => {
    duplicate.makeLayoutFromPage.mockResolvedValue(copy)
    pageVersion(12)
    const result = await makeLayoutFromPageAs(payload, as, {
      pageId: 4,
      layoutId: 3,
      name: "  Lodge  ",
    })
    expect(duplicate.makeLayoutFromPage).toHaveBeenCalledWith(payload, {
      user: as.user,
      pageId: 4,
      layoutId: 3,
      name: "Lodge",
    })
    expect(result).toMatchObject({
      ok: true,
      message: expect.stringContaining("Lodge"),
      layout: { id: 9, name: "Lodge", header: [{ blockType: "logo" }] },
      revision: "12",
    })
  })

  it("refuses before making anything when the Page changed since it was opened", async () => {
    pageVersion(12)
    const result = await makeLayoutFromPageAs(payload, as, {
      pageId: 4,
      layoutId: 3,
      name: "Lodge",
      expected: "11",
    })
    expect(result).toMatchObject({
      ok: false,
      message: "This Page changed since you opened it.",
      conflict: { kind: "page", at: "2026-10-04T14:32:00.000Z" },
    })
    expect(duplicate.makeLayoutFromPage).not.toHaveBeenCalled()
  })

  it("goes ahead when forced, or when the Page is as it was opened", async () => {
    duplicate.makeLayoutFromPage.mockResolvedValue(copy)
    pageVersion(12)
    for (const guard of [{ expected: "12" }, { expected: "11", force: true }]) {
      const result = await makeLayoutFromPageAs(payload, as, {
        pageId: 4,
        layoutId: 3,
        name: "Lodge",
        ...guard,
      })
      expect(result.ok).toBe(true)
    }
    expect(duplicate.makeLayoutFromPage).toHaveBeenCalledTimes(2)
  })

  it("asks for a name before doing anything", async () => {
    const result = await makeLayoutFromPageAs(payload, as, {
      pageId: 4,
      layoutId: 3,
      name: "   ",
    })
    expect(result).toEqual({
      ok: false,
      message: "Give the new Layout a name.",
    })
    expect(duplicate.makeLayoutFromPage).not.toHaveBeenCalled()
  })

  it.each([
    ["pageId", { pageId: 0, layoutId: 3 }],
    ["layoutId", { pageId: 4, layoutId: 1.5 }],
  ])("refuses a bad %s", async (_, ids) => {
    const result = await makeLayoutFromPageAs(payload, as, {
      ...ids,
      name: "Lodge",
    })
    expect(result.ok).toBe(false)
    expect(duplicate.makeLayoutFromPage).not.toHaveBeenCalled()
  })

  it("reports a refusal, such as a name already taken, in words", async () => {
    duplicate.makeLayoutFromPage.mockRejectedValue(
      new Error('A Layout named "Lodge" already exists.')
    )
    expect(
      await makeLayoutFromPageAs(payload, as, {
        pageId: 4,
        layoutId: 3,
        name: "Lodge",
      })
    ).toEqual({ ok: false, message: 'A Layout named "Lodge" already exists.' })
  })
})
