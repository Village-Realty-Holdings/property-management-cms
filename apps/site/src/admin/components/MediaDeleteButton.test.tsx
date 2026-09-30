// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const actions = vi.hoisted(() => ({ deleteMedia: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../actions/media", () => actions)
vi.mock("sonner", () => ({ toast }))

import { MediaDeleteButton } from "./MediaDeleteButton"

beforeEach(() => {
  actions.deleteMedia.mockResolvedValue({ ok: true, message: "Deleted." })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const renderButton = () =>
  render(<MediaDeleteButton id={7} filename="hero.jpg" />)

describe("<MediaDeleteButton>", () => {
  it("asks before deleting and deletes nothing until confirmed", async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Delete this image?")).toBeTruthy()
    expect(
      within(dialog).getByText("Anything using it will lose it.")
    ).toBeTruthy()
    // Who uses it is not looked up yet, so the dialog must not claim to know.
    expect(within(dialog).queryByText(/Nothing else uses it/)).toBeNull()
    expect(actions.deleteMedia).not.toHaveBeenCalled()
  })

  it("cancelling leaves the image alone", async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(actions.deleteMedia).not.toHaveBeenCalled()
  })

  it("deletes on confirm and says so with a toast", async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Delete image" })
    )

    await waitFor(() => expect(actions.deleteMedia).toHaveBeenCalledWith(7))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it("shows a failure inline and keeps the dialog open", async () => {
    actions.deleteMedia.mockResolvedValue({
      ok: false,
      message: "That image no longer exists.",
    })
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Delete image" })
    )

    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "That image no longer exists."
    )
    expect(screen.getByRole("alertdialog")).toBeTruthy()
  })
})
