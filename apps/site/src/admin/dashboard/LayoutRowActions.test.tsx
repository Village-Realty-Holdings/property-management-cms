// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi, type Mock } from "vitest"

const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

import type { FormState } from "../formState"
import { LayoutRowActions } from "./LayoutRowActions"
import type { LayoutRow } from "./rows"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const layout = (over: Partial<LayoutRow> = {}): LayoutRow => ({
  id: 4,
  name: "Listings",
  paths: ["/stays"],
  isDefault: false,
  usedByPages: 2,
  dependents: [],
  pages: [],
  updatedAt: "2026-03-01T10:00:00.000Z",
  ...over,
})

type Action = Mock<(id: number) => Promise<FormState>>

function setup(
  row: LayoutRow,
  over: Partial<Record<"duplicate" | "remove", Action>> = {}
) {
  const duplicate =
    over.duplicate ??
    vi.fn().mockResolvedValue({
      ok: true,
      message: "Duplicated as “Listings (copy)”.",
    })
  const remove =
    over.remove ??
    vi
      .fn()
      .mockResolvedValue({ ok: true, message: "Deleted Layout “Listings”." })
  render(<LayoutRowActions row={row} duplicate={duplicate} remove={remove} />)
  return { duplicate, remove, user: userEvent.setup() }
}

describe("Duplicate", () => {
  it("duplicates the Layout and confirms with a toast", async () => {
    const { duplicate, user } = setup(layout())
    await user.click(screen.getByRole("button", { name: "Duplicate Listings" }))
    expect(duplicate).toHaveBeenCalledWith(4)
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Duplicated as “Listings (copy)”."
      )
    )
  })

  it("shows a failure inline, with no toast", async () => {
    const duplicate = vi.fn().mockResolvedValue({
      ok: false,
      message: "That Layout no longer exists.",
    })
    const { user } = setup(layout(), { duplicate })
    await user.click(screen.getByRole("button", { name: "Duplicate Listings" }))
    expect((await screen.findByRole("alert")).textContent).toContain(
      "That Layout no longer exists."
    )
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("Delete", () => {
  it("asks first and deletes nothing until confirmed", async () => {
    const { remove, user } = setup(layout({ usedByPages: 0 }))
    await user.click(screen.getByRole("button", { name: "Delete Listings" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Delete Layout “Listings”?")).toBeTruthy()
    expect(within(dialog).getByText("Nothing else uses it.")).toBeTruthy()
    expect(remove).not.toHaveBeenCalled()

    await user.click(
      within(dialog).getByRole("button", { name: "Delete Layout" })
    )
    expect(remove).toHaveBeenCalledWith(4)
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Deleted Layout “Listings”.")
    )
  })

  it("names the Pages that reach the Layout by path, never claiming nothing uses it", async () => {
    const { user } = setup(
      layout({
        usedByPages: 3,
        pages: [
          { kind: "Page", name: "Cabin", href: "/admin/pages/10" },
          { kind: "Page", name: "Villa", href: "/admin/pages/11" },
          { kind: "Page", name: "Loft", href: "/admin/pages/12" },
        ],
      })
    )
    await user.click(screen.getByRole("button", { name: "Delete Listings" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Used by 3 Pages.")).toBeTruthy()
    expect(within(dialog).getByText("Page: Cabin")).toBeTruthy()
    expect(within(dialog).queryByText("Nothing else uses it.")).toBeNull()
    expect(
      within(dialog).getByText(/next Layout that covers them/)
    ).toBeTruthy()
  })

  it("never says nothing uses the Layout when Pages do, even if they can't be named", async () => {
    const { user } = setup(layout({ usedByPages: 3, pages: [] }))
    await user.click(screen.getByRole("button", { name: "Delete Listings" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).queryByText("Nothing else uses it.")).toBeNull()
  })

  it("names the Pages that pick the Layout and says it can't be deleted", async () => {
    const { user } = setup(
      layout({
        dependents: [
          { kind: "Page", name: "Pinned", href: "/admin/pages/3" },
          { kind: "Page", name: "Villa" },
        ],
      })
    )
    await user.click(screen.getByRole("button", { name: "Delete Listings" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Used by 2 Pages.")).toBeTruthy()
    expect(within(dialog).getByText("Page: Pinned")).toBeTruthy()
    expect(within(dialog).getByText(/can't be deleted/)).toBeTruthy()
  })

  it("says the default Layout can't be deleted, without claiming nothing uses it", async () => {
    const { user } = setup(
      layout({ name: "Main", isDefault: true, usedByPages: 5 })
    )
    await user.click(screen.getByRole("button", { name: "Delete Main" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(/default Layout, so it can't be deleted/)
    ).toBeTruthy()
    expect(within(dialog).queryByText("Nothing else uses it.")).toBeNull()
  })

  it("keeps the dialog open with the reason when the server refuses", async () => {
    const remove = vi.fn().mockResolvedValue({
      ok: false,
      message: "“Main” is the default Layout, so it can't be deleted.",
    })
    const { user } = setup(layout({ name: "Main", isDefault: true }), {
      remove,
    })
    await user.click(screen.getByRole("button", { name: "Delete Main" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Layout" })
    )
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "is the default Layout"
    )
    expect(toast.success).not.toHaveBeenCalled()
  })
})
