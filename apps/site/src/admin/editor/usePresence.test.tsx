// @vitest-environment jsdom
import { StrictMode } from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const actions = vi.hoisted(() => ({
  touchPresence: vi.fn(),
  readPresence: vi.fn(),
}))
vi.mock("../actions/presence", () => actions)

import type { PresenceTarget } from "../presence"
import { RELEASE_PATH } from "../presence"
import { FIRST_TOUCH_MS, HEARTBEAT_MS, usePresence } from "./usePresence"

const page: PresenceTarget = { kind: "page", id: 4 }
const layout: PresenceTarget = { kind: "layout", id: 4 }
const yours = { status: "yours" } as const
const free = { status: "free" } as const
const sam = { status: "other", name: "Sam Taylor" } as const

const beacon = vi.fn()
let visibility: "visible" | "hidden" = "visible"

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const setVisibility = (next: "visible" | "hidden") => {
  visibility = next
  document.dispatchEvent(new Event("visibilitychange"))
}

beforeEach(() => {
  vi.useFakeTimers()
  visibility = "visible"
  Object.defineProperty(document, "visibilityState", {
    get: () => visibility,
    configurable: true,
  })
  Object.defineProperty(navigator, "sendBeacon", {
    value: beacon,
    configurable: true,
  })
  actions.touchPresence.mockResolvedValue(yours)
  actions.readPresence.mockResolvedValue(free)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("usePresence", () => {
  it("does nothing without a target", async () => {
    const { result } = renderHook(() => usePresence(null))
    await advance(HEARTBEAT_MS * 2)
    expect(actions.touchPresence).not.toHaveBeenCalled()
    expect(actions.readPresence).not.toHaveBeenCalled()
    expect(result.current.view).toEqual({ status: "unknown" })
    result.current.refresh()
    expect(actions.touchPresence).not.toHaveBeenCalled()
  })

  it("touches once loaded and every minute, but not while hidden", async () => {
    const { result } = renderHook(() => usePresence(page))
    await advance(FIRST_TOUCH_MS - 1)
    expect(actions.touchPresence).not.toHaveBeenCalled()
    await advance(1)
    expect(actions.touchPresence).toHaveBeenCalledTimes(1)
    expect(actions.touchPresence).toHaveBeenCalledWith(page)
    expect(result.current.view).toEqual({ status: "yours" })

    await advance(HEARTBEAT_MS)
    expect(actions.touchPresence).toHaveBeenCalledTimes(2)

    visibility = "hidden"
    await advance(HEARTBEAT_MS)
    expect(actions.touchPresence).toHaveBeenCalledTimes(2)

    await act(async () => setVisibility("visible"))
    expect(actions.touchPresence).toHaveBeenCalledTimes(3)
  })

  it("watches with reads once someone else holds it, and claims a free target on the tick after", async () => {
    actions.touchPresence.mockResolvedValueOnce(sam)
    const { result } = renderHook(() => usePresence(page))
    await advance(FIRST_TOUCH_MS)
    expect(result.current.view).toEqual({
      status: "other",
      name: "Sam Taylor",
      tookOver: false,
    })

    actions.readPresence.mockResolvedValueOnce(sam)
    await advance(HEARTBEAT_MS)
    expect(actions.readPresence).toHaveBeenCalledTimes(1)
    expect(actions.touchPresence).toHaveBeenCalledTimes(1)
    expect(result.current.view.status).toBe("other")

    // A save cleared the rows: free is shown, and nothing is claimed yet.
    actions.readPresence.mockResolvedValueOnce(free)
    await advance(HEARTBEAT_MS)
    expect(result.current.view).toEqual({ status: "free" })
    expect(actions.touchPresence).toHaveBeenCalledTimes(1)

    await advance(HEARTBEAT_MS)
    expect(actions.touchPresence).toHaveBeenCalledTimes(2)
    expect(result.current.view).toEqual({ status: "yours" })
  })

  it("says it was taken over when the holder is replaced", async () => {
    const { result } = renderHook(() => usePresence(page))
    await advance(FIRST_TOUCH_MS)
    actions.touchPresence.mockResolvedValueOnce(sam)
    await advance(HEARTBEAT_MS)
    expect(result.current.view).toEqual({
      status: "other",
      name: "Sam Taylor",
      tookOver: true,
    })
  })

  it("takes over on request", async () => {
    actions.touchPresence.mockResolvedValueOnce(sam)
    const { result } = renderHook(() => usePresence(page))
    await advance(FIRST_TOUCH_MS)
    await act(() => result.current.takeOver())
    expect(actions.touchPresence).toHaveBeenLastCalledWith(page, {
      takeOver: true,
    })
    expect(result.current.view).toEqual({ status: "yours" })
  })

  it("refreshes after a save only while it holds the target", async () => {
    const { result } = renderHook(() => usePresence(page))
    await advance(FIRST_TOUCH_MS)
    actions.touchPresence.mockClear()
    await act(async () => result.current.refresh())
    expect(actions.touchPresence).toHaveBeenCalledTimes(1)

    actions.touchPresence.mockResolvedValueOnce(sam)
    await advance(HEARTBEAT_MS)
    actions.touchPresence.mockClear()
    actions.readPresence.mockClear()
    await act(async () => result.current.refresh())
    expect(actions.touchPresence).not.toHaveBeenCalled()
    expect(actions.readPresence).not.toHaveBeenCalled()
  })

  it("releases on unmount and on pagehide", async () => {
    const { unmount } = renderHook(() => usePresence(layout))
    await advance(FIRST_TOUCH_MS)
    act(() => {
      window.dispatchEvent(new Event("pagehide"))
    })
    expect(beacon).toHaveBeenCalledTimes(1)
    const [path, body] = beacon.mock.calls[0]!
    expect(path).toBe(RELEASE_PATH)
    expect(String(body)).toBe("kind=layout&id=4")

    unmount()
    expect(beacon).toHaveBeenCalledTimes(2)
    expect(String(beacon.mock.calls[1]![1])).toBe("kind=layout&id=4")
  })

  it("keeps the view when an answer is null or the call fails", async () => {
    const { result } = renderHook(() => usePresence(page))
    await advance(FIRST_TOUCH_MS)
    actions.touchPresence.mockResolvedValueOnce(null)
    await advance(HEARTBEAT_MS)
    expect(result.current.view).toEqual({ status: "yours" })
    actions.touchPresence.mockRejectedValueOnce(new Error("offline"))
    await advance(HEARTBEAT_MS)
    expect(result.current.view).toEqual({ status: "yours" })
    // And the next heartbeat still runs.
    actions.touchPresence.mockResolvedValueOnce(sam)
    await advance(HEARTBEAT_MS)
    expect(result.current.view.status).toBe("other")
  })

  it("ignores an answer that arrives after unmount", async () => {
    let answer: (value: typeof sam) => void = () => {}
    actions.touchPresence.mockReturnValueOnce(
      new Promise((resolve) => (answer = resolve))
    )
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const { result, unmount } = renderHook(() => usePresence(page))
    unmount()
    await act(async () => answer(sam))
    expect(result.current.view).toEqual({ status: "unknown" })
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it("starts again when the target changes, releasing the old one", async () => {
    const { result, rerender } = renderHook(
      ({ target }) => usePresence(target),
      { initialProps: { target: page as PresenceTarget } }
    )
    await advance(FIRST_TOUCH_MS)
    rerender({ target: layout })
    await advance(FIRST_TOUCH_MS)
    expect(String(beacon.mock.calls[0]![1])).toBe("kind=page&id=4")
    expect(actions.touchPresence).toHaveBeenLastCalledWith(layout)
    expect(result.current.view).toEqual({ status: "yours" })
  })

  it("waits for the window's load before the first touch", async () => {
    const readyState = vi
      .spyOn(document, "readyState", "get")
      .mockReturnValue("loading")
    renderHook(() => usePresence(page))
    await advance(FIRST_TOUCH_MS * 2)
    expect(actions.touchPresence).not.toHaveBeenCalled()
    readyState.mockRestore()
    act(() => {
      window.dispatchEvent(new Event("load"))
    })
    await advance(FIRST_TOUCH_MS)
    expect(actions.touchPresence).toHaveBeenCalledTimes(1)
  })

  it("releases nothing when it leaves before its first touch", async () => {
    const { unmount } = renderHook(() => usePresence(page))
    act(() => {
      window.dispatchEvent(new Event("pagehide"))
    })
    unmount()
    await advance(FIRST_TOUCH_MS)
    expect(beacon).not.toHaveBeenCalled()
    expect(actions.touchPresence).not.toHaveBeenCalled()
  })

  it("claims once and releases nothing across a StrictMode remount", async () => {
    const { result } = renderHook(() => usePresence(page), {
      wrapper: StrictMode,
    })
    await advance(FIRST_TOUCH_MS)
    expect(actions.touchPresence).toHaveBeenCalledTimes(1)
    expect(beacon).not.toHaveBeenCalled()
    expect(result.current.view).toEqual({ status: "yours" })
  })
})
