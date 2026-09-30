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
  addGoogleFont: vi.fn(),
  uploadFonts: vi.fn(),
  deleteFont: vi.fn(),
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../../actions/fonts", () => actions)
vi.mock("sonner", () => ({ toast }))

import { builtInRows, buildFontRows } from "../../fonts/rows"
import { FontsScreen } from "./FontsScreen"

const record = (id: number, family: string, weights = [400, 700]) => ({
  id,
  family,
  kind: "serif" as const,
  source: "google" as const,
  files: weights.map((weight) => ({
    weight,
    style: "normal" as const,
    url: `/api/font-files/file/${family}-${weight}.woff2`,
  })),
})

const free = record(1, "Lora")
const used = record(2, "Roboto Slab")

const earlier = record(3, "Newsreader Slab")

const rows = buildFontRows(
  [free, used, earlier],
  new Map([[2, ["Used by the Theme (heading font)"]]]),
  new Map([[3, ["2026-03-01T10:05:00.000Z", "2026-02-01T09:00:00.000Z"]]])
)

function renderScreen(
  overrides: Partial<Parameters<typeof FontsScreen>[0]> = {}
) {
  return render(
    <FontsScreen rows={rows} builtIn={builtInRows()} {...overrides} />
  )
}

beforeEach(() => {
  actions.addGoogleFont.mockResolvedValue({ ok: true, message: "Added Lora." })
  actions.uploadFonts.mockResolvedValue({ ok: true, message: "Added Acme." })
  actions.deleteFont.mockResolvedValue({ ok: true, message: "Deleted Lora." })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
  vi.clearAllMocks()
})

describe("<FontsScreen> header", () => {
  it("has the page header with Add Google Font as the primary action and Upload files beside it", () => {
    renderScreen()
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Fonts")
    expect(screen.getByRole("button", { name: "Add Google Font" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Upload files" })).toBeTruthy()
  })
})

describe("<FontsScreen> list", () => {
  it("shows each Font with a sample line set in that Font and its weights", () => {
    renderScreen()
    const card = screen.getByRole("article", { name: "Lora" })
    const sample = within(card).getByText(/Sunny mornings/)
    expect(sample.style.fontFamily).toContain("admin-font-sample-1")

    const weights = within(card).getByRole("list", { name: "Weights" })
    expect(
      within(weights)
        .getAllByRole("listitem")
        .map((li) => li.textContent)
    ).toEqual(["400 Regular", "700 Bold"])
    expect(within(card).getByText("Serif")).toBeTruthy()
    expect(within(card).getByText("Google Fonts")).toBeTruthy()
  })

  it("loads the Fonts' own files for the samples, from the Site", () => {
    renderScreen()
    const css = document.querySelector("style")!.textContent!
    expect(css).toContain('font-family:"admin-font-sample-1"')
    expect(css).toContain("/api/font-files/file/Lora-400.woff2")
    expect(css).not.toMatch(/https?:/)
  })

  it("shows a lock and what uses a Font that is in use, and won't delete it", () => {
    renderScreen()
    const card = screen.getByRole("article", { name: "Roboto Slab" })
    expect(within(card).getByText("In use")).toBeTruthy()
    expect(
      within(card).getByText("Used by the Theme (heading font)")
    ).toBeTruthy()
    const button = within(card).getByRole("button", {
      name: "Delete Roboto Slab",
    }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    // The reason is text on the page, not only a tooltip.
    const reason = within(card).getByText(/can't be deleted/)
    expect(button.getAttribute("aria-describedby")).toBe(reason.id)
  })

  it("does not lock a Font nothing uses", () => {
    renderScreen()
    const card = screen.getByRole("article", { name: "Lora" })
    expect(within(card).queryByText("In use")).toBeNull()
    expect(
      (
        within(card).getByRole("button", {
          name: "Delete Lora",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
  })

  it("lists the built-in fonts apart, read-only, with samples", () => {
    renderScreen({ builtInClassName: "next-font-vars" })
    const group = screen.getByRole("region", { name: "Built-in fonts" })
    expect(group.className).toContain("next-font-vars")
    const cards = within(group).getAllByRole("article")
    expect(cards).toHaveLength(6)
    const newsreader = within(group).getByRole("article", {
      name: "Newsreader",
    })
    expect(
      within(newsreader).getByText(/Sunny mornings/).style.fontFamily
    ).toBe("var(--font-classic-display)")
    expect(within(group).queryByRole("button")).toBeNull()
  })
})

describe("<FontsScreen> empty", () => {
  it("offers Add Google Font and Upload files when there are no Fonts", () => {
    renderScreen({ rows: [] })
    const empty = screen.getByRole("region", { name: "Your fonts" })
    expect(screen.getByText("No Fonts added yet")).toBeTruthy()
    expect(
      within(empty).getByRole("button", { name: "Add Google Font" })
    ).toBeTruthy()
    expect(
      within(empty).getByRole("button", { name: "Upload files" })
    ).toBeTruthy()
    // The built-in fonts are still listed.
    expect(screen.getByRole("region", { name: "Built-in fonts" })).toBeTruthy()
  })
})

describe("deleting a Font", () => {
  it("asks first, names what depends on the Font, then deletes and confirms with a toast", async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole("button", { name: "Delete Lora" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/Delete Font “Lora”\?/)).toBeTruthy()
    expect(within(dialog).getByText("Nothing else uses it.")).toBeTruthy()
    expect(actions.deleteFont).not.toHaveBeenCalled()

    await user.click(
      within(dialog).getByRole("button", { name: "Delete Font" })
    )

    await waitFor(() => expect(actions.deleteFont).toHaveBeenCalledWith(1))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Deleted Lora.")
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
  })

  it("names the earlier Theme versions that use the Font, and what restoring them will do", async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(
      screen.getByRole("button", { name: "Delete Newsreader Slab" })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).queryByText("Nothing else uses it.")).toBeNull()
    expect(within(dialog).getByText("Used by 2 Theme versions.")).toBeTruthy()
    expect(
      within(dialog).getByText("Theme version: saved Mar 1, 2026, 10:05 AM UTC")
    ).toBeTruthy()
    expect(
      within(dialog).getByText(/restoring one .* the Classic font instead/i)
    ).toBeTruthy()
  })

  it("keeps the dialog open and shows the server's refusal inline", async () => {
    actions.deleteFont.mockResolvedValue({
      ok: false,
      message: "Lora can't be deleted. Used by the Theme (body font).",
    })
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole("button", { name: "Delete Lora" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Font" })
    )

    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "Used by the Theme (body font)"
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("leaves the Font alone when cancelled", async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole("button", { name: "Delete Lora" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(actions.deleteFont).not.toHaveBeenCalled()
  })
})
