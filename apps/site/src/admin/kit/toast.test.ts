// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const sonner = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: sonner }))

import { notify, saveToastMessage, useSaveToast } from "./toast"

beforeEach(() => {
  sonner.success.mockReset()
  sonner.info.mockReset()
})

describe("saveToastMessage", () => {
  it("confirms a successful save with the action's own message", () => {
    expect(saveToastMessage({ ok: true, message: "Page published" })).toBe(
      "Page published"
    )
  })

  it("falls back to Saved when the action gave no message", () => {
    expect(saveToastMessage({ ok: true })).toBe("Saved")
  })

  it("is silent for failures (they show inline) and for no result yet", () => {
    expect(saveToastMessage({ ok: false, message: "Nope" })).toBeNull()
    expect(saveToastMessage({})).toBeNull()
  })
})

describe("notify", () => {
  it("saved() confirms a save, naming what was saved", () => {
    notify.saved()
    notify.saved("Brand")
    expect(sonner.success).toHaveBeenNthCalledWith(1, "Saved")
    expect(sonner.success).toHaveBeenNthCalledWith(2, "Brand saved")
  })

  it("success() and info() show a plain message", () => {
    notify.success("Copied")
    notify.info("Nothing to do")
    expect(sonner.success).toHaveBeenCalledWith("Copied")
    expect(sonner.info).toHaveBeenCalledWith("Nothing to do")
  })

  it("has no error toast: failures are shown inline", () => {
    expect("error" in notify).toBe(false)
  })
})

describe("useSaveToast", () => {
  it("toasts once per successful result", () => {
    const first = { ok: true, message: "Saved brand" }
    const { rerender } = renderHook(({ state }) => useSaveToast(state), {
      initialProps: { state: {} as { ok?: boolean; message?: string } },
    })
    expect(sonner.success).not.toHaveBeenCalled()
    rerender({ state: first })
    rerender({ state: first })
    expect(sonner.success).toHaveBeenCalledTimes(1)
    expect(sonner.success).toHaveBeenCalledWith("Saved brand")
    rerender({ state: { ok: true, message: "Saved brand" } })
    expect(sonner.success).toHaveBeenCalledTimes(2)
  })

  it("does not toast a failure", () => {
    const { rerender } = renderHook(({ state }) => useSaveToast(state), {
      initialProps: { state: {} as { ok?: boolean; message?: string } },
    })
    rerender({ state: { ok: false, message: "Nope" } })
    expect(sonner.success).not.toHaveBeenCalled()
  })
})
