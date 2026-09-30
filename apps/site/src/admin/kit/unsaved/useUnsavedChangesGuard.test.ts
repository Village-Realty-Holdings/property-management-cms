// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard"

type Options = Parameters<typeof useUnsavedChangesGuard>[0]

function setup(initial: Options) {
  return renderHook((options: Options) => useUnsavedChangesGuard(options), {
    initialProps: initial,
  })
}

function clickLink(href: string) {
  const a = document.createElement("a")
  a.href = href
  document.body.append(a)
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
  })
  act(() => {
    a.dispatchEvent(event)
  })
  return event
}

beforeEach(() => {
  for (const fn of Object.values(router)) fn.mockReset()
  window.history.replaceState(null, "", "/admin/pages/1")
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("useUnsavedChangesGuard", () => {
  it("shows no dialog and lets links through while clean", () => {
    const { result } = setup({ dirty: false, onSave: vi.fn() })
    expect(result.current.dialog.open).toBe(false)
    expect(clickLink("/admin/media").defaultPrevented).toBe(false)
  })

  it("opens the dialog when a link is clicked on a dirty editor", () => {
    const { result } = setup({ dirty: true, onSave: vi.fn() })
    const event = clickLink("/admin/media")
    expect(event.defaultPrevented).toBe(true)
    expect(result.current.dialog.open).toBe(true)
    expect(router.push).not.toHaveBeenCalled()
  })

  it("Stay closes the dialog and goes nowhere", () => {
    const { result } = setup({ dirty: true, onSave: vi.fn() })
    clickLink("/admin/media")
    act(() => result.current.dialog.onStay())
    expect(result.current.dialog.open).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
  })

  it("Discard runs onDiscard and then goes where the user was heading", async () => {
    const onDiscard = vi.fn()
    const { result } = setup({ dirty: true, onSave: vi.fn(), onDiscard })
    clickLink("/admin/media")
    await act(async () => result.current.dialog.onDiscard())
    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith("/admin/media")
    expect(result.current.dialog.open).toBe(false)
  })

  it("Save runs onSave, then goes on", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true, message: "Saved" })
    const { result } = setup({ dirty: true, onSave })
    clickLink("/admin/media")
    await act(async () => result.current.dialog.onSave())
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith("/admin/media")
    expect(result.current.dialog.open).toBe(false)
  })

  it("shows the saving state while onSave is pending", async () => {
    let finish!: (value: { ok: boolean }) => void
    const onSave = vi.fn(
      () => new Promise<{ ok: boolean }>((resolve) => (finish = resolve))
    )
    const { result } = setup({ dirty: true, onSave })
    clickLink("/admin/media")
    act(() => {
      void result.current.dialog.onSave()
    })
    expect(result.current.dialog.saving).toBe(true)
    await act(async () => finish({ ok: true }))
    expect(router.push).toHaveBeenCalledWith("/admin/media")
  })

  it("keeps the user on the page, with the error, when the save fails", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Title is required" })
    const { result } = setup({ dirty: true, onSave })
    clickLink("/admin/media")
    await act(async () => result.current.dialog.onSave())
    expect(router.push).not.toHaveBeenCalled()
    expect(result.current.dialog.open).toBe(true)
    expect(result.current.dialog.saving).toBe(false)
    expect(result.current.dialog.error).toBe("Title is required")
  })

  it("treats a thrown save as a failure", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network down"))
    const { result } = setup({ dirty: true, onSave })
    clickLink("/admin/media")
    await act(async () => result.current.dialog.onSave())
    expect(router.push).not.toHaveBeenCalled()
    expect(result.current.dialog.error).toBe("Network down")
  })

  it("clears the error when the user stays, and on the next attempt", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false, message: "No" })
    const { result } = setup({ dirty: true, onSave })
    clickLink("/admin/media")
    await act(async () => result.current.dialog.onSave())
    act(() => result.current.dialog.onStay())
    clickLink("/admin/pages")
    expect(result.current.dialog.open).toBe(true)
    expect(result.current.dialog.error).toBeUndefined()
  })

  it("follows the latest dirty flag", () => {
    const { result, rerender } = setup({ dirty: false, onSave: vi.fn() })
    rerender({ dirty: true, onSave: vi.fn() })
    expect(clickLink("/admin/media").defaultPrevented).toBe(true)
    act(() => result.current.dialog.onStay())
    rerender({ dirty: false, onSave: vi.fn() })
    expect(clickLink("/admin/media").defaultPrevented).toBe(false)
  })

  it("warns the browser on tab close while dirty, not when clean", () => {
    const { rerender } = setup({ dirty: true, onSave: vi.fn() })
    const close = () => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(close()).toBe(true)
    rerender({ dirty: false, onSave: vi.fn() })
    expect(close()).toBe(false)
  })

  it("stops guarding when the editor unmounts", () => {
    const { unmount } = setup({ dirty: true, onSave: vi.fn() })
    unmount()
    expect(clickLink("/admin/media").defaultPrevented).toBe(false)
  })

  describe("guarded router", () => {
    it("pushes straight away while clean", () => {
      const { result } = setup({ dirty: false, onSave: vi.fn() })
      act(() => result.current.router.push("/admin/media"))
      expect(router.push).toHaveBeenCalledWith("/admin/media")
      expect(result.current.dialog.open).toBe(false)
    })

    it("asks first while dirty, then replaces after Discard", async () => {
      const { result } = setup({ dirty: true, onSave: vi.fn() })
      act(() => result.current.router.replace("/admin/pages"))
      expect(router.replace).not.toHaveBeenCalled()
      expect(result.current.dialog.open).toBe(true)
      await act(async () => result.current.dialog.onDiscard())
      expect(router.replace).toHaveBeenCalledWith("/admin/pages")
    })

    it("guards back() while dirty", () => {
      const { result } = setup({ dirty: true, onSave: vi.fn() })
      const back = vi.spyOn(window.history, "go")
      act(() => result.current.router.back())
      expect(result.current.dialog.open).toBe(true)
      expect(back).not.toHaveBeenCalled()
      back.mockRestore()
    })

    it("goes back when clean", async () => {
      const { result } = setup({ dirty: false, onSave: vi.fn() })
      const go = vi.spyOn(window.history, "go").mockImplementation(() => {})
      act(() => result.current.router.back())
      await waitFor(() => expect(go).toHaveBeenCalledWith(-1))
      go.mockRestore()
    })
  })
})
