// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HistoryRow } from "../theme/themeScreen"

const restoreTheme = vi.fn()
vi.mock("../actions/theme", () => ({
  restoreTheme: (id: number) => restoreTheme(id),
}))
const success = vi.fn()
vi.mock("sonner", () => ({
  toast: { success: (m: string) => success(m) },
}))

import { ThemeHistory } from "./ThemeHistory"

const row = (over: Partial<HistoryRow> = {}): HistoryRow => ({
  id: 3,
  savedAt: "2026-03-02T09:00:00.000Z",
  when: "Mar 2, 2026, 9:00 AM UTC",
  author: "Ada",
  summary: "Primary colour, Button corners",
  isLive: false,
  missingFonts: [],
  ...over,
})

const rows = [
  row({ id: 5, isLive: true, when: "Mar 5, 2026, 9:00 AM UTC" }),
  row({ id: 4, summary: "Spacing", author: null }),
  row({ id: 3, missingFonts: ["Heading font"] }),
]

beforeEach(() => {
  restoreTheme.mockReset()
  success.mockReset()
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("<ThemeHistory>", () => {
  it("lists each version with its time, author and summary", () => {
    render(<ThemeHistory rows={rows} />)
    const items = within(
      screen.getByRole("list", { name: "Theme versions" })
    ).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[0]!.textContent).toContain("Mar 5, 2026, 9:00 AM UTC")
    expect(items[1]!.textContent).toContain("Spacing")
    expect(items[2]!.textContent).toContain("Ada")
  })

  it("marks the live version in words and offers no Restore for it", () => {
    render(<ThemeHistory rows={rows} />)
    const [live, second] = screen.getAllByRole("listitem")
    expect(within(live!).getByText("Live on your Site")).toBeTruthy()
    expect(within(live!).queryByRole("button")).toBeNull()
    expect(
      within(second!).getByRole("button", {
        name: "Restore the version saved Mar 2, 2026, 9:00 AM UTC",
      })
    ).toBeTruthy()
  })

  it("says when there is no history yet", () => {
    render(<ThemeHistory rows={[]} />)
    expect(screen.getByText(/No versions yet/)).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("asks before restoring, and Cancel changes nothing", async () => {
    render(<ThemeHistory rows={rows} />)
    fireEvent.click(screen.getAllByRole("button", { name: /^Restore/ })[0]!)
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/Restore this version\?/)).toBeTruthy()
    expect(within(dialog).getByText(/nothing is lost/i)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(restoreTheme).not.toHaveBeenCalled()
  })

  it("restores the chosen version, closes and toasts", async () => {
    restoreTheme.mockResolvedValue({ ok: true, message: "Restored it." })
    render(<ThemeHistory rows={rows} />)
    fireEvent.click(screen.getAllByRole("button", { name: /^Restore/ })[0]!)
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Restore version" })
    )
    await waitFor(() => expect(restoreTheme).toHaveBeenCalledWith(4))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(success).toHaveBeenCalledWith("Restored it.")
  })

  it("keeps the dialog open and shows why when the restore fails", async () => {
    restoreTheme.mockResolvedValue({
      ok: false,
      message: "That version no longer exists.",
    })
    render(<ThemeHistory rows={rows} />)
    fireEvent.click(screen.getAllByRole("button", { name: /^Restore/ })[0]!)
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Restore version" })
    )
    expect(await within(dialog).findByRole("alert")).toBeTruthy()
    expect(
      within(dialog).getByText("That version no longer exists.")
    ).toBeTruthy()
    expect(success).not.toHaveBeenCalled()
  })

  it("warns, before restoring, that a deleted Font is replaced", async () => {
    render(<ThemeHistory rows={rows} />)
    expect(
      within(screen.getAllByRole("listitem")[2]!).getByText(
        /Heading font was deleted/
      )
    ).toBeTruthy()
    fireEvent.click(screen.getAllByRole("button", { name: /^Restore/ })[1]!)
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/Classic font is used/)).toBeTruthy()
  })
})
