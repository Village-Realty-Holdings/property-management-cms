// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

const actions = vi.hoisted(() => ({
  duplicatePage: vi.fn(),
  exportPage: vi.fn(),
  importPage: vi.fn(),
}))
vi.mock("../actions/pages", () => actions)

import { PageRowActions } from "./PageRowActions"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("Duplicate", () => {
  it("duplicates the Page and confirms with a toast", async () => {
    actions.duplicatePage.mockResolvedValue({
      ok: true,
      message: "Duplicated as “About (copy)” at /about-2.",
    })
    const user = userEvent.setup()
    render(<PageRowActions id={7} title="About" />)
    await user.click(screen.getByRole("button", { name: "Duplicate About" }))
    expect(actions.duplicatePage).toHaveBeenCalledWith(7)
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Duplicated as “About (copy)” at /about-2."
      )
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("disables the button while it works", async () => {
    let finish: (value: { ok: true; message: string }) => void = () => {}
    actions.duplicatePage.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const user = userEvent.setup()
    render(<PageRowActions id={7} title="About" />)
    const button = screen.getByRole("button", { name: "Duplicate About" })
    await user.click(button)
    expect((button as HTMLButtonElement).disabled).toBe(true)
    finish({ ok: true, message: "Duplicated" })
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(false)
    )
  })

  it("shows a failure inline, with no toast", async () => {
    actions.duplicatePage.mockResolvedValue({
      ok: false,
      message: "That Page no longer exists.",
    })
    const user = userEvent.setup()
    render(<PageRowActions id={7} title="About" />)
    await user.click(screen.getByRole("button", { name: "Duplicate About" }))
    expect((await screen.findByRole("alert")).textContent).toContain(
      "That Page no longer exists."
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("says so when the action throws", async () => {
    actions.duplicatePage.mockRejectedValue(new Error("boom"))
    const user = userEvent.setup()
    render(<PageRowActions id={7} title="About" />)
    await user.click(screen.getByRole("button", { name: "Duplicate About" }))
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Something went wrong"
    )
  })
})

describe("Export", () => {
  it("is still on the row", () => {
    render(<PageRowActions id={7} title="About" />)
    expect(screen.getByRole("button", { name: "Export About" })).toBeTruthy()
  })
})
