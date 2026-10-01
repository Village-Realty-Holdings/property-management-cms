// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useDirtyState } from "./useDirtyState"

describe("useDirtyState", () => {
  it("starts clean and turns dirty when the value moves away from the saved one", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDirtyState(value),
      { initialProps: { value: { title: "Home" } } }
    )
    expect(result.current.dirty).toBe(false)
    rerender({ value: { title: "Home page" } })
    expect(result.current.dirty).toBe(true)
  })

  it("is clean again when the user puts the value back", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDirtyState(value),
      { initialProps: { value: { title: "Home" } } }
    )
    rerender({ value: { title: "x" } })
    rerender({ value: { title: "Home" } })
    expect(result.current.dirty).toBe(false)
  })

  it("markSaved() makes the current value the new baseline", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDirtyState(value),
      { initialProps: { value: { title: "Home" } } }
    )
    rerender({ value: { title: "Home page" } })
    act(() => result.current.markSaved())
    expect(result.current.dirty).toBe(false)
    rerender({ value: { title: "Home page 2" } })
    expect(result.current.dirty).toBe(true)
  })

  it("markSaved(value) sets the baseline to what the server stored", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDirtyState(value),
      { initialProps: { value: { title: "Home" } } }
    )
    rerender({ value: { title: "  Home page " } })
    act(() => result.current.markSaved({ title: "Home page" }))
    expect(result.current.dirty).toBe(true)
  })
})
