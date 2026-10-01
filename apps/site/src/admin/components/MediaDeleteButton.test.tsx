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

  describe("an image that is in use", () => {
    const inUse = [
      { kind: "Brand setting", name: "Logo", href: "/admin/settings/brand" },
      {
        kind: "Page",
        name: "Home, Block 3, Amenities (Amenity 2: Image)",
        href: "/admin/pages/1",
      },
      { kind: "Layout", name: "Main, Header Block 1, Logo" },
    ]

    it("can't be deleted: the dialog names every use, each with a link", async () => {
      const user = userEvent.setup()
      renderButton(inUse)
      await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))

      const dialog = await screen.findByRole("alertdialog")
      expect(
        within(dialog).getByText(
          "Used by 1 Brand setting, 1 Page and 1 Layout."
        )
      ).toBeTruthy()
      const link = within(dialog).getByRole("link", {
        name: "Page: Home, Block 3, Amenities (Amenity 2: Image)",
      })
      expect(link.getAttribute("href")).toBe("/admin/pages/1")
      expect(
        within(dialog)
          .getByRole("link", { name: "Brand setting: Logo" })
          .getAttribute("href")
      ).toBe("/admin/settings/brand")
      // A use with no screen of its own is still named.
      expect(
        within(dialog).getByText("Layout: Main, Header Block 1, Logo")
      ).toBeTruthy()
      expect(within(dialog).queryByText(/Nothing else uses it/)).toBeNull()
    })

    it("offers no way to delete it", async () => {
      const user = userEvent.setup()
      renderButton(inUse)
      await user.click(screen.getByRole("button", { name: "Delete hero.jpg" }))

      const dialog = await screen.findByRole("alertdialog")
      expect(
        within(dialog).queryByRole("button", { name: "Delete image" })
      ).toBeNull()
      await user.click(within(dialog).getByRole("button", { name: "Close" }))
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
      expect(actions.deleteMedia).not.toHaveBeenCalled()
    })
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
