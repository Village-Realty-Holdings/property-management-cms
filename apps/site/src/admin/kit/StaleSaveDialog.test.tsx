// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { setTimeZone } from "../../test/timeZone"

// The time is shown in the machine's zone: pin it.
setTimeZone("UTC")

import type { SaveConflict } from "../staleSave"
import { StaleSaveDialog, type StaleSaveDialogProps } from "./StaleSaveDialog"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

const AT = "2026-10-04T14:32:00.000Z"
const conflict = (over: Partial<SaveConflict> = {}): SaveConflict => ({
  kind: "page",
  by: "Sam Taylor",
  byYou: false,
  at: AT,
  ...over,
})

function show(over: Partial<StaleSaveDialogProps> = {}) {
  const props: StaleSaveDialogProps = {
    conflict: conflict(),
    onReload: vi.fn(),
    onSaveAnyway: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...over,
  }
  render(<StaleSaveDialog {...props} />)
  return props
}

describe("<StaleSaveDialog>", () => {
  it("is closed when there is no conflict", () => {
    show({ conflict: null })
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("names the Page, who saved it and when, and what History keeps", () => {
    show()
    expect(
      screen.getByText("This Page changed since you opened it")
    ).toBeTruthy()
    const text = screen.getByRole("alertdialog").textContent
    expect(text).toContain("Sam Taylor saved it at Oct 4, 2026, 2:32 PM UTC.")
    expect(text).toContain(
      "Reload to see that version; your unsaved changes here will be lost. Save anyway to replace it with yours."
    )
    expect(text).toContain("The version you replace stays in History.")
  })

  it("says so when the same User saved in another tab", () => {
    show({ conflict: conflict({ byYou: true }) })
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "You saved it in another tab at Oct 4, 2026, 2:32 PM UTC."
    )
  })

  it("says when, not who, for the Brand, and has no History sentence", () => {
    show({ conflict: conflict({ kind: "brand", by: null }) })
    expect(
      screen.getByText("The Brand changed since you opened it")
    ).toBeTruthy()
    const text = screen.getByRole("alertdialog").textContent
    expect(text).toContain("It was saved at Oct 4, 2026, 2:32 PM UTC.")
    expect(text).not.toContain("History")
  })

  it("mentions History for a Layout", () => {
    show({ conflict: conflict({ kind: "layout" }) })
    expect(
      screen.getByText("This Layout changed since you opened it")
    ).toBeTruthy()
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "stays in History"
    )
  })

  it("reloads on Reload", () => {
    const props = show()
    fireEvent.click(screen.getByRole("button", { name: "Reload" }))
    expect(props.onReload).toHaveBeenCalledTimes(1)
  })

  it("keeps editing on Escape", async () => {
    const props = show()
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" })
    await waitFor(() => expect(props.onClose).toHaveBeenCalled())
  })

  it("shows Saving… and disables both buttons while Save anyway runs", async () => {
    let finish!: () => void
    const onSaveAnyway = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    show({ onSaveAnyway })
    fireEvent.click(screen.getByRole("button", { name: "Save anyway" }))
    const saving = await screen.findByRole("button", { name: "Saving…" })
    expect((saving as HTMLButtonElement).disabled).toBe(true)
    expect(
      (screen.getByRole("button", { name: "Reload" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    finish()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save anyway" })).toBeTruthy()
    )
  })

  it("shows the message and stays open when Save anyway fails", async () => {
    const props = show({
      onSaveAnyway: vi
        .fn()
        .mockResolvedValue({ ok: false, message: "Give the Page a title." }),
    })
    fireEvent.click(screen.getByRole("button", { name: "Save anyway" }))
    expect(await screen.findByText("Give the Page a title.")).toBeTruthy()
    expect(props.onClose).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toBeTruthy()
  })

  it("makes Save anyway destructive for the Brand and SEO, which keep nothing", () => {
    show({ conflict: conflict({ kind: "seo", by: null }) })
    const button = screen.getByRole("button", { name: "Save anyway" })
    expect(button.className).toContain("destructive")
  })

  it("keeps Save anyway the default look where History keeps the old version", () => {
    show()
    const button = screen.getByRole("button", { name: "Save anyway" })
    expect(button.className).not.toContain("bg-destructive")
  })
})
