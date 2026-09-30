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
  substitutions: [],
  ...over,
})

const rows = [
  row({ id: 5, isLive: true, when: "Mar 5, 2026, 9:00 AM UTC" }),
  row({ id: 4, summary: "Spacing", author: null }),
  row({
    id: 3,
    missingFonts: ["Heading font"],
    substitutions: [{ label: "Heading font", family: "Newsreader" }],
  }),
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

  it("disables Restore on the live version, with the reason as its label", () => {
    render(<ThemeHistory rows={rows} />)
    const [live, second] = screen.getAllByRole("listitem")
    const restore = within(live!).getByRole("button", {
      name: "That version is already live.",
    }) as HTMLButtonElement
    expect(restore.disabled).toBe(true)
    fireEvent.click(restore)
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(
      within(second!).queryByRole("button", {
        name: "That version is already live.",
      })
    ).toBeNull()
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

  it("names the substitution in the row and in the confirm dialog, before the save", async () => {
    render(<ThemeHistory rows={rows} />)
    expect(
      within(screen.getAllByRole("listitem")[2]!).getByText(
        "The Heading font was deleted, so the Classic font (Newsreader) will be used instead."
      )
    ).toBeTruthy()
    fireEvent.click(screen.getAllByRole("button", { name: /^Restore/ })[1]!)
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(
        /The Heading font was deleted, so the Classic font \(Newsreader\) will be used instead\./
      )
    ).toBeTruthy()
    expect(restoreTheme).not.toHaveBeenCalled()
  })

  it("names every substitution when both fonts were deleted", async () => {
    render(
      <ThemeHistory
        rows={[
          row({ id: 9, isLive: true }),
          row({
            id: 8,
            missingFonts: ["Heading font", "Body font"],
            substitutions: [
              { label: "Heading font", family: "Newsreader" },
              { label: "Body font", family: "Public Sans" },
            ],
          }),
        ]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /^Restore/ }))
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(
        /The Heading font and Body font were deleted, so the Classic fonts \(Newsreader and Public Sans\) will be used instead\./
      )
    ).toBeTruthy()
  })
})
