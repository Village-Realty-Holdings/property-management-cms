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

const actions = vi.hoisted(() => ({ deletePage: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))
const onDeleted = vi.hoisted(() => vi.fn())

vi.mock("../actions/pages", () => actions)
vi.mock("sonner", () => ({ toast }))

import { DeletePageButton } from "./DeletePageButton"

beforeEach(() => {
  actions.deletePage.mockResolvedValue({
    ok: true,
    message: "Deleted Page “About”.",
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const renderButton = (
  props: Partial<Parameters<typeof DeletePageButton>[0]> = {}
) =>
  render(
    <DeletePageButton
      id={4}
      title="About"
      path="/about"
      published={false}
      dependents={[]}
      onDeleted={onDeleted}
      {...props}
    />
  )

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Delete Page" }))
  return screen.findByRole("alertdialog")
}

describe("<DeletePageButton>", () => {
  it("deletes nothing until the dialog is confirmed", async () => {
    const user = userEvent.setup()
    renderButton()
    const dialog = await open(user)

    expect(within(dialog).getByText("Delete Page “About”?")).toBeTruthy()
    expect(within(dialog).getByText("Nothing else uses it.")).toBeTruthy()
    expect(actions.deletePage).not.toHaveBeenCalled()
  })

  it("says a Published Page is live, and where", async () => {
    const user = userEvent.setup()
    renderButton({ published: true })
    const dialog = await open(user)

    expect(within(dialog).getByText(/live on the Site at \/about/)).toBeTruthy()
  })

  it("names the Pages that link to it", async () => {
    const user = userEvent.setup()
    renderButton({ dependents: [{ kind: "Page", name: "Home" }] })
    const dialog = await open(user)

    expect(within(dialog).getByText("Used by 1 Page.")).toBeTruthy()
    expect(within(dialog).getByText("Page: Home")).toBeTruthy()
  })

  it("cancelling keeps the Page", async () => {
    const user = userEvent.setup()
    renderButton()
    const dialog = await open(user)
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(actions.deletePage).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it("deletes on confirm, says so with a toast and tells the editor", async () => {
    const user = userEvent.setup()
    renderButton()
    const dialog = await open(user)
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Page" })
    )

    await waitFor(() => expect(actions.deletePage).toHaveBeenCalledWith(4))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Deleted Page “About”.")
    )
    expect(onDeleted).toHaveBeenCalledTimes(1)
  })

  it("shows a failure inline and keeps the Page", async () => {
    actions.deletePage.mockResolvedValue({
      ok: false,
      message: "That Page no longer exists.",
    })
    const user = userEvent.setup()
    renderButton()
    const dialog = await open(user)
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Page" })
    )

    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "That Page no longer exists."
    )
    expect(onDeleted).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
