// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { SaveConflict } from "../staleSave"
import { useStaleSave } from "./useStaleSave"

afterEach(cleanup)

const conflict: SaveConflict = {
  kind: "page",
  by: "Sam Taylor",
  byYou: false,
  at: "2026-10-04T14:32:00.000Z",
}

function setup(over: { initial?: string | null; dirty?: boolean } = {}) {
  const discard = vi.fn()
  const reload = vi.fn()
  const view = renderHook(
    (props: { dirty: boolean }) =>
      useStaleSave({
        initial: "initial" in over ? over.initial : "5",
        dirty: props.dirty,
        discard,
        reload,
      }),
    { initialProps: { dirty: over.dirty ?? false } }
  )
  return { ...view, discard, reload }
}

describe("useStaleSave", () => {
  it("expects the revision the editor opened", () => {
    expect(setup().result.current.expected()).toBe("5")
    expect(setup({ initial: null }).result.current.expected()).toBeNull()
    expect(setup({ initial: undefined }).result.current.expected()).toBe(
      undefined
    )
  })

  it("keeps the revision a save returns, and says there is no conflict", () => {
    const { result } = setup()
    let stale!: boolean
    act(() => {
      stale = result.current.settle({ revision: "9" }, vi.fn())
    })
    expect(stale).toBe(false)
    expect(result.current.expected()).toBe("9")
    expect(result.current.dialog.conflict).toBeNull()
  })

  it("opens the dialog on a conflict and keeps the old revision", () => {
    const { result } = setup()
    let stale!: boolean
    act(() => {
      stale = result.current.settle({ conflict }, vi.fn())
    })
    expect(stale).toBe(true)
    expect(result.current.dialog.conflict).toEqual(conflict)
    expect(result.current.expected()).toBe("5")
  })

  it("retries on Save anyway and clears the conflict", async () => {
    const { result } = setup()
    const retry = vi.fn().mockResolvedValue({ ok: true })
    act(() => {
      result.current.settle({ conflict }, retry)
    })
    await act(async () => {
      await result.current.dialog.onSaveAnyway()
    })
    expect(retry).toHaveBeenCalledTimes(1)
    expect(result.current.dialog.conflict).toBeNull()
  })

  it("stays open, and hands back the failure, when the retry fails", async () => {
    const { result } = setup()
    const failure = { ok: false, message: "Give the Page a title." }
    act(() => {
      result.current.settle({ conflict }, vi.fn().mockResolvedValue(failure))
    })
    let returned: unknown
    await act(async () => {
      returned = await result.current.dialog.onSaveAnyway()
    })
    expect(returned).toEqual(failure)
    expect(result.current.dialog.conflict).toEqual(conflict)
  })

  it("discards on Reload and reloads once nothing is dirty", () => {
    const { result, rerender, discard, reload } = setup({ dirty: true })
    act(() => {
      result.current.settle({ conflict }, vi.fn())
    })
    act(() => result.current.dialog.onReload())
    expect(discard).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()
    rerender({ dirty: false })
    expect(reload).toHaveBeenCalledTimes(1)
    rerender({ dirty: false })
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("closes on Escape, without discarding", () => {
    const { result, discard } = setup()
    act(() => {
      result.current.settle({ conflict }, vi.fn())
    })
    act(() => result.current.dialog.onClose())
    expect(result.current.dialog.conflict).toBeNull()
    expect(discard).not.toHaveBeenCalled()
  })
})
