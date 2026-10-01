import type { Payload } from "payload"
import { beforeEach, describe, expect, it, vi } from "vitest"

const duplicate = vi.hoisted(() => ({ makeLayoutFromPage: vi.fn() }))
vi.mock("../../layouts/duplicate", () => duplicate)

import type { Layout } from "../../payload-types"
import type { StaffAccess } from "../dashboard/queries"
import { makeLayoutFromPageAs } from "./makeFromPage"

const payload = {} as Payload
const as = {
  overrideAccess: false,
  user: { id: 1 },
} as unknown as StaffAccess

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
    })
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
