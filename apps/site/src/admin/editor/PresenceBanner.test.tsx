// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PresenceBanner } from "./PresenceBanner"
import type { PresenceView } from "./usePresence"

afterEach(cleanup)

const sam: PresenceView = {
  status: "other",
  name: "Sam Taylor",
  tookOver: false,
}

describe("PresenceBanner", () => {
  it.each<PresenceView>([
    { status: "unknown" },
    { status: "free" },
    { status: "yours" },
  ])("shows nothing for %j", (view) => {
    const { container } = render(
      <PresenceBanner view={view} kind="page" onTakeOver={vi.fn()} />
    )
    expect(container.innerHTML).toBe("")
  })

  it("says who is editing, with a Take over button", () => {
    render(<PresenceBanner view={sam} kind="page" onTakeOver={vi.fn()} />)
    expect(screen.getByRole("status").textContent).toContain(
      "Sam Taylor is editing this Page."
    )
    expect(screen.getByRole("button", { name: "Take over" })).toBeTruthy()
  })

  it("names a Layout and the Theme", () => {
    const { rerender } = render(
      <PresenceBanner view={sam} kind="layout" onTakeOver={vi.fn()} />
    )
    expect(screen.getByRole("status").textContent).toContain(
      "Sam Taylor is editing this Layout."
    )
    rerender(<PresenceBanner view={sam} kind="theme" onTakeOver={vi.fn()} />)
    expect(screen.getByRole("status").textContent).toContain(
      "Sam Taylor is editing the Theme."
    )
  })

  it("says so when someone took over", () => {
    render(
      <PresenceBanner
        view={{ ...sam, tookOver: true }}
        kind="page"
        onTakeOver={vi.fn()}
      />
    )
    expect(screen.getByRole("status").textContent).toContain(
      "Sam Taylor took over this Page. Your unsaved changes are still here."
    )
  })

  it("is busy while taking over", async () => {
    let done: () => void = () => {}
    const onTakeOver = vi.fn(() => new Promise<void>((r) => (done = r)))
    render(<PresenceBanner view={sam} kind="page" onTakeOver={onTakeOver} />)
    await userEvent.click(screen.getByRole("button", { name: "Take over" }))
    expect(onTakeOver).toHaveBeenCalledTimes(1)
    const busy = screen.getByRole("button", { name: "Taking over…" })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    await act(async () => done())
    expect(screen.getByRole("button", { name: "Take over" })).toBeTruthy()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <PresenceBanner view={sam} kind="page" onTakeOver={vi.fn()} />
    )
    const { violations } = await axe.run(container)
    expect(violations).toEqual([])
  })
})
