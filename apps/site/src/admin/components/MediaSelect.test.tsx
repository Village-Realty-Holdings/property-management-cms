// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const actions = vi.hoisted(() => ({ uploadMedia: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))

vi.mock("../actions/media", () => actions)
vi.mock("sonner", () => ({ toast }))

import { FormField } from "./FormBits"
import { MediaSelect, type MediaOption } from "./MediaSelect"

const media: MediaOption[] = [
  { id: 7, label: "Beach (beach.jpg)", url: "/media/beach.jpg" },
  { id: 8, label: "Pool (pool.jpg)", url: "/media/pool.jpg" },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const onChange = vi.fn()

function Field({
  initial = null,
  id = "logo",
  label = "Logo",
}: {
  initial?: number | null
  id?: string
  label?: string
}) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <FormField id={id} label={label}>
      <MediaSelect
        id={id}
        value={value}
        options={media}
        onChange={(next) => {
          onChange(next)
          setValue(next)
        }}
      />
    </FormField>
  )
}

const open = async (
  user: ReturnType<typeof userEvent.setup>,
  label = "Logo"
) => {
  await user.click(screen.getByLabelText(label))
  return screen.findByRole("dialog")
}

const png = () => new File(["x"], "sunset.png", { type: "image/png" })

describe("<MediaSelect>", () => {
  it("shows the chosen image, or an invitation to choose one", () => {
    render(<Field />)
    expect(screen.getByLabelText("Logo").textContent).toBe("Choose image")
    cleanup()
    render(<Field initial={7} />)
    expect(screen.getByLabelText("Logo").textContent).toBe("Beach (beach.jpg)")
  })

  it("picks an image from the library dialog and closes it", async () => {
    const user = userEvent.setup()
    render(<Field />)
    const dialog = await open(user)
    await user.click(within(dialog).getByRole("button", { name: /Pool/ }))

    expect(onChange).toHaveBeenCalledWith(8)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByLabelText("Logo").textContent).toBe("Pool (pool.jpg)")
  })

  it("marks the current choice in the library", async () => {
    const user = userEvent.setup()
    render(<Field initial={7} />)
    const dialog = await open(user)
    expect(
      within(dialog)
        .getByRole("button", { name: /Beach/ })
        .getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("filters the library by search", async () => {
    const user = userEvent.setup()
    render(<Field />)
    const dialog = await open(user)
    await user.type(within(dialog).getByLabelText("Search images"), "pool")
    expect(within(dialog).queryByRole("button", { name: /Beach/ })).toBeNull()
    expect(within(dialog).getByRole("button", { name: /Pool/ })).toBeTruthy()

    await user.type(within(dialog).getByLabelText("Search images"), "zzz")
    expect(within(dialog).getByText("No images match “poolzzz”.")).toBeTruthy()
  })

  it("removes the image", async () => {
    const user = userEvent.setup()
    render(<Field initial={7} />)
    await user.click(screen.getByRole("button", { name: "Remove image" }))
    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.queryByRole("button", { name: "Remove image" })).toBeNull()
  })

  it("uploads an image with its alt text and chooses it", async () => {
    actions.uploadMedia.mockResolvedValue({
      ok: true,
      message: "Uploaded sunset.png.",
      media: { id: 9, label: "Sunset (sunset.png)", url: "/media/sunset.png" },
    })
    const user = userEvent.setup()
    render(<Field />)
    const dialog = await open(user)
    await user.upload(within(dialog).getByLabelText("Image to upload"), png())
    await user.type(within(dialog).getByLabelText("Alt text"), "Sunset")
    await user.click(within(dialog).getByRole("button", { name: "Upload" }))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(9))
    const formData = actions.uploadMedia.mock.calls[0]![1] as FormData
    expect(formData.get("alt")).toBe("Sunset")
    expect((formData.get("file") as File).name).toBe("sunset.png")
    expect(toast.success).toHaveBeenCalledWith("Uploaded sunset.png.")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByLabelText("Logo").textContent).toBe(
      "Sunset (sunset.png)"
    )
  })

  it("offers an uploaded image in the screen's other pickers", async () => {
    actions.uploadMedia.mockResolvedValue({
      ok: true,
      media: { id: 10, label: "Dune (dune.png)", url: "/media/dune.png" },
    })
    const user = userEvent.setup()
    render(
      <>
        <Field />
        <Field id="share" label="Share image" />
      </>
    )
    let dialog = await open(user)
    await user.upload(within(dialog).getByLabelText("Image to upload"), png())
    await user.type(within(dialog).getByLabelText("Alt text"), "Dune")
    await user.click(within(dialog).getByRole("button", { name: "Upload" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    dialog = await open(user, "Share image")
    expect(within(dialog).getByRole("button", { name: /Dune/ })).toBeTruthy()
  })

  it("shows a failed upload in the dialog and keeps it open", async () => {
    actions.uploadMedia.mockResolvedValue({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { alt: "This field is required." },
    })
    const user = userEvent.setup()
    render(<Field />)
    const dialog = await open(user)
    await user.upload(within(dialog).getByLabelText("Image to upload"), png())
    await user.type(within(dialog).getByLabelText("Alt text"), " ")
    await user.click(within(dialog).getByRole("button", { name: "Upload" }))

    expect(
      await within(dialog).findByText("This field is required.")
    ).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("takes a dropped image, and refuses a file that is not one", async () => {
    const user = userEvent.setup()
    render(<Field />)
    const dialog = await open(user)
    const library =
      within(dialog).getByText("Choose an image").parentElement!.parentElement!

    fireEvent.drop(library, {
      dataTransfer: {
        files: [new File(["x"], "notes.pdf", { type: "application/pdf" })],
      },
    })
    expect(within(dialog).getByRole("alert").textContent).toContain(
      "Choose a JPEG, PNG, WebP, AVIF or SVG image."
    )

    fireEvent.drop(library, { dataTransfer: { files: [png()] } })
    expect(await within(dialog).findByLabelText("Alt text")).toBeTruthy()
    expect(within(dialog).getByText("sunset.png")).toBeTruthy()
  })
})
