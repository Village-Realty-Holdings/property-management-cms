// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const actions = vi.hoisted(() => ({ updateMedia: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../actions/media", () => actions)
vi.mock("sonner", () => ({ toast }))

import { MediaEditSheet, type MediaDetails } from "./MediaEditSheet"

const image: MediaDetails = {
  id: 7,
  filename: "lobby.jpg",
  url: "/api/media/file/lobby.jpg",
  alt: "A sunlit lobby",
  caption: "Noon",
  credit: "© Jane Doe",
  author: "Jane Doe",
  sourceUrl: "https://unsplash.com/photos/abc",
  licence: "Unsplash License",
}

beforeEach(() => {
  actions.updateMedia.mockResolvedValue({
    ok: true,
    message: "Saved lobby.jpg.",
  })
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
  vi.clearAllMocks()
})

async function open(media: MediaDetails = image) {
  const user = userEvent.setup()
  render(<MediaEditSheet media={media} />)
  await user.click(screen.getByRole("button", { name: "Edit lobby.jpg" }))
  await screen.findByRole("dialog", { name: "Edit image" })
  return user
}

describe("<MediaEditSheet>", () => {
  it("opens a labelled dialog with the image's details filled in", async () => {
    await open()
    const value = (label: string) =>
      (screen.getByLabelText(label) as HTMLInputElement).value
    expect(value("Alt text")).toBe("A sunlit lobby")
    expect(value("Caption")).toBe("Noon")
    expect(value("Credit")).toBe("© Jane Doe")
    expect(value("Author")).toBe("Jane Doe")
    expect(value("Source URL")).toBe("https://unsplash.com/photos/abc")
    expect(value("Licence")).toBe("Unsplash License")
  })

  it("starts blank for an image with no caption, credit or attribution", async () => {
    await open({ id: 7, filename: "lobby.jpg", alt: "A lobby" })
    expect((screen.getByLabelText("Caption") as HTMLInputElement).value).toBe(
      ""
    )
    expect((screen.getByLabelText("Licence") as HTMLInputElement).value).toBe(
      ""
    )
  })

  it("sends what was edited for that image, then toasts and closes", async () => {
    const user = await open()
    const alt = screen.getByLabelText("Alt text")
    await user.clear(alt)
    await user.type(alt, "The lobby at noon")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(actions.updateMedia).toHaveBeenCalled())
    const [id, data] = actions.updateMedia.mock.calls[0] as [number, FormData]
    expect(id).toBe(7)
    expect(data.get("alt")).toBe("The lobby at noon")
    expect(data.get("caption")).toBe("Noon")
    expect(data.get("sourceUrl")).toBe("https://unsplash.com/photos/abc")

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Saved lobby.jpg.")
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("shows field errors beside their fields, and keeps the sheet and what was typed", async () => {
    actions.updateMedia.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: {
        alt: "Describe the image in alt text.",
        "attribution.sourceUrl":
          "Enter a full web address that starts with https://",
      },
    })
    const user = await open()
    const url = screen.getByLabelText("Source URL")
    await user.clear(url)
    await user.type(url, "unsplash.com")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(
      await screen.findByText("Describe the image in alt text.")
    ).toBeTruthy()
    expect(screen.getByText(/starts with https/)).toBeTruthy()
    expect(screen.getByLabelText("Alt text").getAttribute("aria-invalid")).toBe(
      "true"
    )
    expect(screen.getByRole("dialog", { name: "Edit image" })).toBeTruthy()
    expect(
      (screen.getByLabelText("Source URL") as HTMLInputElement).value
    ).toBe("unsplash.com")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("closes on Cancel without saving", async () => {
    const user = await open()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(actions.updateMedia).not.toHaveBeenCalled()
  })
})
