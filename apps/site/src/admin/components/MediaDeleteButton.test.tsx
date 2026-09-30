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

const renderButton = (
  dependents: Parameters<typeof MediaDeleteButton>[0]["dependents"] = []
) =>
  render(
    <MediaDeleteButton id={7} filename="hero.jpg" dependents={dependents} />
  )

describe("<MediaDeleteButton>", () => {
  it("asks before deleting and deletes nothing until confirmed", async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Delete image “hero.jpg”?")).toBeTruthy()
    expect(within(dialog).getByText("Nothing else uses it.")).toBeTruthy()
    expect(actions.deleteMedia).not.toHaveBeenCalled()
  })

  it("names what uses the image before it goes", async () => {
    const user = userEvent.setup()
    renderButton([
      { kind: "Brand setting", name: "Logo" },
      { kind: "Page", name: "Home (hero image)" },
      { kind: "Page", name: "About (SEO image)" },
    ])
    await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText("Used by 1 Brand setting and 2 Pages.")
    ).toBeTruthy()
    expect(within(dialog).getByText("Brand setting: Logo")).toBeTruthy()
    expect(within(dialog).getByText("Page: Home (hero image)")).toBeTruthy()
    expect(within(dialog).queryByText(/Nothing else uses it/)).toBeNull()
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
