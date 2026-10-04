// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import type { SaveResult } from "../settingsSave"
import type { SaveConflict } from "../staleSave"
import { useSettingsEditor } from "./useSettingsEditor"

afterEach(cleanup)

type V = { name: string }

const conflict: SaveConflict = {
  kind: "brand",
  by: null,
  byYou: false,
  at: "2026-10-04T14:32:00.000Z",
}

function setup(save: (v: V, guard: object) => Promise<SaveResult<V>>) {
  return renderHook(() =>
    useSettingsEditor<V>({ initial: { name: "Warren" }, revision: "r1", save })
  )
}

describe("useSettingsEditor and the stale-save check", () => {
  it("sends the revision it opened, and no force", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, revision: "r2" })
    const { result } = setup(save)
    await act(async () => {
      await result.current.submit()
    })
    expect(save).toHaveBeenCalledWith({ name: "Warren" }, { expected: "r1" })
  })

  it("opens the dialog and shows the message inline on a conflict", async () => {
    const save = vi.fn().mockResolvedValue({
      ok: false,
      message: "The Brand changed since you opened it.",
      conflict,
    })
    const { result } = setup(save)
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.staleDialog.conflict).toEqual(conflict)
    expect(result.current.state.message).toBe(
      "The Brand changed since you opened it."
    )
  })

  it("saves again with force on Save anyway", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "m", conflict })
      .mockResolvedValueOnce({ ok: true, revision: "r2" })
    const { result } = setup(save)
    await act(async () => {
      await result.current.submit()
    })
    await act(async () => {
      await result.current.staleDialog.onSaveAnyway()
    })
    expect(save).toHaveBeenLastCalledWith(
      { name: "Warren" },
      { expected: "r1", force: true }
    )
    expect(result.current.staleDialog.conflict).toBeNull()
  })

  it("sends the revision a save returned on the next save", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, revision: "r2" })
    const { result } = setup(save)
    await act(async () => {
      await result.current.submit()
    })
    await act(async () => {
      await result.current.submit()
    })
    expect(save).toHaveBeenLastCalledWith(
      { name: "Warren" },
      { expected: "r2" }
    )
  })
})
