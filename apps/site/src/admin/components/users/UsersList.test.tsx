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

const actions = vi.hoisted(() => ({ removeUser: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../../actions/users", () => actions)
vi.mock("sonner", () => ({ toast }))

import type { UserRow } from "../../users"
import { UsersList } from "./UsersList"

const rows: UserRow[] = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com", isYou: true },
  { id: 2, name: "Grace Hopper", email: "grace@example.com", isYou: false },
  { id: 3, name: "", email: "nameless@example.com", isYou: false },
]

beforeEach(() => {
  actions.removeUser.mockResolvedValue({ ok: true, message: "Removed Grace." })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("<UsersList>", () => {
  it("marks your own row and offers no Remove for it", () => {
    render(<UsersList rows={rows} />)
    const own = screen.getByRole("row", { name: /Ada Lovelace/ })

    expect(within(own).getByText("You")).toBeTruthy()
    expect(within(own).queryByRole("button")).toBeNull()
  })

  it("names each Remove button by the person, falling back to the email", () => {
    render(<UsersList rows={rows} />)

    expect(
      screen.getByRole("button", { name: "Remove Grace Hopper" })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Remove nameless@example.com" })
    ).toBeTruthy()
  })

  it("explains that they can sign in again, and removes nothing until confirmed", async () => {
    const user = userEvent.setup()
    render(<UsersList rows={rows} />)
    await user.click(
      screen.getByRole("button", { name: "Remove Grace Hopper" })
    )
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByText("Remove “Grace Hopper”?")).toBeTruthy()
    expect(within(dialog).getByText(/sign in again/)).toBeTruthy()
    expect(within(dialog).getByText(/Entra app role/)).toBeTruthy()
    expect(actions.removeUser).not.toHaveBeenCalled()
  })

  it("removes on confirm and says so with a toast", async () => {
    const user = userEvent.setup()
    render(<UsersList rows={rows} />)
    await user.click(
      screen.getByRole("button", { name: "Remove Grace Hopper" })
    )
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Remove User" })
    )

    await waitFor(() => expect(actions.removeUser).toHaveBeenCalledWith(2))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Removed Grace.")
    )
  })
})
