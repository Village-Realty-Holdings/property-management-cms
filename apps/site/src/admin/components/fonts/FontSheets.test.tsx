// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
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

import { AddGoogleFontSheet } from "./AddGoogleFontSheet"
import { UploadFontsSheet } from "./UploadFontsSheet"

beforeEach(() => {
  actions.addGoogleFont.mockResolvedValue({ ok: true, message: "Added Lora." })
  actions.uploadFonts.mockResolvedValue({ ok: true, message: "Added Acme." })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
  vi.clearAllMocks()
})

const sent = (mock: typeof actions.addGoogleFont) =>
  mock.mock.calls[0]![1] as FormData

describe("<AddGoogleFontSheet>", () => {
  it("is a labelled dialog with the family, kind, weights and italics", () => {
    render(<AddGoogleFontSheet open onOpenChange={() => {}} />)
    const dialog = screen.getByRole("dialog", { name: "Add Google Font" })
    expect(dialog).toBeTruthy()
    expect(screen.getByLabelText("Font family")).toBeTruthy()
    expect(screen.getByLabelText("Kind")).toBeTruthy()
    const weights = screen.getAllByRole("checkbox", { name: /^\d{3} / })
    expect(weights.map((w) => (w as HTMLInputElement).value)).toEqual([
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
    ])
    // Regular and Bold are the usual pair, ticked to start with.
    expect(
      weights
        .filter((w) => (w as HTMLInputElement).checked)
        .map((w) => (w as HTMLInputElement).value)
    ).toEqual(["400", "700"])
    expect(
      screen.getByRole("checkbox", { name: "Include italics" })
    ).toBeTruthy()
  })

  it("sends what was entered, then toasts and closes", async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<AddGoogleFontSheet open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText("Font family"), "Lora")
    await user.selectOptions(screen.getByLabelText("Kind"), "serif")
    await user.click(screen.getByRole("checkbox", { name: /^700 / })) // untick
    await user.click(screen.getByRole("checkbox", { name: /^500 / }))
    await user.click(screen.getByRole("button", { name: "Add font" }))

    await waitFor(() => expect(actions.addGoogleFont).toHaveBeenCalled())
    const data = sent(actions.addGoogleFont)
    expect(data.get("family")).toBe("Lora")
    expect(data.get("kind")).toBe("serif")
    expect(data.getAll("weight")).toEqual(["400", "500"])
    expect(data.get("italic")).toBeNull()

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Added Lora.")
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("shows it is working while Google is being asked, and can't be sent twice", async () => {
    let finish!: (value: unknown) => void
    actions.addGoogleFont.mockReturnValue(new Promise((r) => (finish = r)))
    const user = userEvent.setup()
    render(<AddGoogleFontSheet open onOpenChange={() => {}} />)
    await user.type(screen.getByLabelText("Font family"), "Lora")
    await user.selectOptions(screen.getByLabelText("Kind"), "serif")
    await user.click(screen.getByRole("button", { name: "Add font" }))

    const busy = (await screen.findByRole("button", {
      name: "Adding…",
    })) as HTMLButtonElement
    expect(busy.disabled).toBe(true)
    finish({ ok: true, message: "Added Lora." })
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(actions.addGoogleFont).toHaveBeenCalledTimes(1)
  })

  it("shows a failure inline, keeps the dialog open and what was typed", async () => {
    actions.addGoogleFont.mockResolvedValue({
      ok: false,
      message: 'Google Fonts has no family called "Lorra".',
      fieldErrors: { family: 'Google Fonts has no family called "Lorra".' },
    })
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<AddGoogleFontSheet open onOpenChange={onOpenChange} />)
    await user.type(screen.getByLabelText("Font family"), "Lorra")
    await user.selectOptions(screen.getByLabelText("Kind"), "serif")
    await user.click(screen.getByRole("button", { name: "Add font" }))

    const alerts = await screen.findAllByRole("alert")
    expect(
      alerts.some((a) => a.textContent?.includes("no family called"))
    ).toBe(true)
    expect(
      (screen.getByLabelText("Font family") as HTMLInputElement).value
    ).toBe("Lorra")
    expect(
      screen.getByLabelText("Font family").getAttribute("aria-invalid")
    ).toBe("true")
    expect(toast.success).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    // The button is usable again.
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Add font" }) as HTMLButtonElement)
          .disabled
      ).toBe(false)
    )
  })

  it("shows an error thrown by the action inline too", async () => {
    actions.addGoogleFont.mockRejectedValue(new Error("Network down"))
    const user = userEvent.setup()
    render(<AddGoogleFontSheet open onOpenChange={() => {}} />)
    await user.type(screen.getByLabelText("Font family"), "Lora")
    await user.selectOptions(screen.getByLabelText("Kind"), "serif")
    await user.click(screen.getByRole("button", { name: "Add font" }))
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Something went wrong"
    )
  })
})

describe("<UploadFontsSheet>", () => {
  const file = (name: string) => new File(["wOF2...."], name)

  it("starts with one file row and adds and removes rows", async () => {
    const user = userEvent.setup()
    render(<UploadFontsSheet open onOpenChange={() => {}} />)
    expect(
      screen.getByRole("dialog", { name: "Upload font files" })
    ).toBeTruthy()
    expect(screen.getAllByLabelText(/^Font file \d/)).toHaveLength(1)

    await user.click(screen.getByRole("button", { name: "Add another file" }))
    expect(screen.getAllByLabelText(/^Font file \d/)).toHaveLength(2)

    await user.click(screen.getByRole("button", { name: "Remove file 2" }))
    expect(screen.getAllByLabelText(/^Font file \d/)).toHaveLength(1)
    // The last row can't be removed: a Font needs a file.
    expect(screen.queryByRole("button", { name: "Remove file 1" })).toBeNull()
  })

  it("sends the family, kind and each file with its weight and style, then toasts and closes", async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<UploadFontsSheet open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText("Font family"), "Acme")
    await user.selectOptions(screen.getByLabelText("Kind"), "sans")
    await user.upload(screen.getByLabelText("Font file 1"), file("a.woff2"))
    await user.click(screen.getByRole("button", { name: "Add another file" }))
    await user.upload(screen.getByLabelText("Font file 2"), file("b.woff2"))
    await user.selectOptions(screen.getByLabelText("Weight of file 2"), "700")
    await user.selectOptions(screen.getByLabelText("Style of file 2"), "italic")
    await user.click(screen.getByRole("button", { name: "Upload font" }))

    await waitFor(() => expect(actions.uploadFonts).toHaveBeenCalled())
    const data = sent(actions.uploadFonts)
    expect(data.get("family")).toBe("Acme")
    expect(data.get("kind")).toBe("sans")
    // One file field per row. (jsdom's FormData can't read the files
    // user-event puts on an input, so their names are checked server-side.)
    expect(data.getAll("file")).toHaveLength(2)
    expect(data.getAll("weight")).toEqual(["400", "700"])
    expect(data.getAll("style")).toEqual(["normal", "italic"])
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Added Acme.")
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("shows a file's problem beside that file, and the form's message on top", async () => {
    actions.uploadFonts.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: {
        "files.0.file": "Font files must be .woff2, .woff, .ttf or .otf.",
      },
    })
    const user = userEvent.setup()
    render(<UploadFontsSheet open onOpenChange={() => {}} />)
    await user.type(screen.getByLabelText("Font family"), "Acme")
    await user.selectOptions(screen.getByLabelText("Kind"), "sans")
    await user.upload(screen.getByLabelText("Font file 1"), file("a.woff2"))
    await user.click(screen.getByRole("button", { name: "Upload font" }))

    expect(
      (await screen.findAllByRole("alert")).map((a) => a.textContent).join(" ")
    ).toContain("Some fields need attention.")
    expect(screen.getByText(/must be \.woff2/)).toBeTruthy()
    expect(
      screen.getByLabelText("Font file 1").getAttribute("aria-invalid")
    ).toBe("true")
    expect(toast.success).not.toHaveBeenCalled()
  })
})
