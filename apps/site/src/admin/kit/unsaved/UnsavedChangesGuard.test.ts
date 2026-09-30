// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { createElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

import { UnsavedChangesGuard } from "./UnsavedChangesGuard"

type Props = Parameters<typeof UnsavedChangesGuard>[0]

function mount(props: Props) {
  const link = document.createElement("a")
  link.href = "/admin/media"
  link.textContent = "Media"
  document.body.append(link)
  render(createElement(UnsavedChangesGuard, props))
  return link
}

beforeEach(() => {
  for (const fn of Object.values(router)) fn.mockReset()
  window.history.replaceState(null, "", "/admin/pages/1")
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("<UnsavedChangesGuard>", () => {
  it("renders no dialog until the user tries to leave", () => {
    mount({ dirty: true, onSave: vi.fn() })
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("does not get in the way of a clean editor", () => {
    const link = mount({ dirty: false, onSave: vi.fn() })
    fireEvent.click(link)
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("offers Stay, Discard and Save when a link is clicked while dirty", async () => {
    const link = mount({ dirty: true, onSave: vi.fn() })
    fireEvent.click(link)
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("You have unsaved changes")).toBeTruthy()
    const names = within(dialog)
      .getAllByRole("button")
      .map((b) => b.textContent)
    expect(names).toEqual(["Stay", "Discard changes", "Save"])
  })

  it("moves focus into the dialog", async () => {
    const link = mount({ dirty: true, onSave: vi.fn() })
    link.focus()
    fireEvent.click(link)
    const dialog = await screen.findByRole("alertdialog")
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    )
  })

  it("Escape means Stay", async () => {
    const link = mount({ dirty: true, onSave: vi.fn() })
    fireEvent.click(link)
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(router.push).not.toHaveBeenCalled()
  })

  it("Save then continues to the clicked link", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true })
    const link = mount({ dirty: true, onSave })
    fireEvent.click(link)
    fireEvent.click(await screen.findByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/media")
    )
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("a failed Save keeps the user here and shows the error as an alert", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Path is already used" })
    const link = mount({ dirty: true, onSave })
    fireEvent.click(link)
    fireEvent.click(await screen.findByRole("button", { name: "Save" }))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Path is already used")
    expect(router.push).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
  })

  it("Discard resets the editor and continues", async () => {
    const onDiscard = vi.fn()
    const link = mount({ dirty: true, onSave: vi.fn(), onDiscard })
    fireEvent.click(link)
    fireEvent.click(
      await screen.findByRole("button", { name: "Discard changes" })
    )
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/media")
    )
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })
})
