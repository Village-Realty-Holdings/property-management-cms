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

const actions = vi.hoisted(() => ({
  saveUser: vi.fn(),
  deleteRegistryUser: vi.fn(),
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../../actions/users", () => actions)
vi.mock("sonner", () => ({ toast }))

import type { UserRow, UsersScreen } from "../../users"
import { UsersList } from "./UsersList"

const person = (over: Partial<UserRow>): UserRow => ({
  id: 1,
  email: "someone@example.com",
  name: null,
  entraOid: null,
  hasPassword: false,
  isSuperAdmin: false,
  disabled: false,
  siteIds: [],
  isYou: false,
  ...over,
})

const here = { id: 10, schema: "here", name: "Here", url: null }
const there = { id: 11, schema: "there", name: "There", url: null }

const screenFor = (canManage: boolean): UsersScreen => ({
  canManage,
  here,
  sites: [here, there],
  rows: [
    person({
      id: 1,
      name: "Ada Lovelace",
      isYou: true,
      isSuperAdmin: true,
      entraOid: "a",
    }),
    person({
      id: 2,
      name: "Grace Hopper",
      email: "grace@example.com",
      hasPassword: true,
      siteIds: [10, 11],
    }),
    person({ id: 3, email: "nameless@example.com", disabled: true }),
  ],
})

beforeEach(() => {
  actions.saveUser.mockResolvedValue({
    ok: true,
    message: "Saved Grace Hopper.",
  })
  actions.deleteRegistryUser.mockResolvedValue({
    ok: true,
    message: "Deleted Grace Hopper.",
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("<UsersList>", () => {
  it("shows how each User signs in and which Sites they can use", () => {
    render(<UsersList screen={screenFor(true)} />)
    const ada = screen.getByRole("row", { name: /Ada Lovelace/ })
    expect(within(ada).getByText("You")).toBeTruthy()
    expect(within(ada).getByText(/Super Admin/)).toBeTruthy()
    const grace = screen.getByRole("row", { name: /Grace Hopper/ })
    expect(within(grace).getByText("Password")).toBeTruthy()
    expect(within(grace).getByText("Here")).toBeTruthy()
    expect(within(grace).getByText("There")).toBeTruthy()
    const nameless = screen.getByRole("row", { name: /nameless@example.com/ })
    expect(within(nameless).getByText("Disabled")).toBeTruthy()
  })

  it("offers no Add or Edit to someone who isn't a Super Admin", () => {
    render(<UsersList screen={screenFor(false)} />)
    expect(screen.queryByRole("button", { name: "Add User" })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull()
  })

  it("edits a User's Site Access and saves it", async () => {
    const user = userEvent.setup()
    render(<UsersList screen={screenFor(true)} />)
    await user.click(screen.getByRole("button", { name: "Edit Grace Hopper" }))
    const sheet = await screen.findByRole("dialog")
    await user.click(within(sheet).getByRole("checkbox", { name: /There/ }))
    await user.click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => expect(actions.saveUser).toHaveBeenCalled())
    const [id, data] = actions.saveUser.mock.calls[0]!
    expect(id).toBe(2)
    expect((data as FormData).getAll("site")).toEqual(["10"])
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Saved Grace Hopper.")
    )
  })

  it("won't let you disable or delete yourself", async () => {
    const user = userEvent.setup()
    render(<UsersList screen={screenFor(true)} />)
    await user.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }))
    const sheet = await screen.findByRole("dialog")
    expect(within(sheet).queryByRole("switch", { name: "Disabled" })).toBeNull()
    expect(within(sheet).queryByRole("button", { name: "Delete" })).toBeNull()
  })

  it("deletes only after confirming", async () => {
    const user = userEvent.setup()
    render(<UsersList screen={screenFor(true)} />)
    await user.click(screen.getByRole("button", { name: "Edit Grace Hopper" }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Delete",
      })
    )
    const confirm = await screen.findByRole("alertdialog")
    expect(actions.deleteRegistryUser).not.toHaveBeenCalled()
    await user.click(
      within(confirm).getByRole("button", { name: "Delete User" })
    )
    await waitFor(() =>
      expect(actions.deleteRegistryUser).toHaveBeenCalledWith(2)
    )
  })
})
