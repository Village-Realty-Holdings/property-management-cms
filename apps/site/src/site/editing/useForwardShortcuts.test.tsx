// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest"

import type { CanvasRequest } from "../../admin/editor/bridge"

import { useForwardShortcuts } from "./useForwardShortcuts"

let send: Mock<(request: CanvasRequest) => void>

beforeEach(() => {
  send = vi.fn<(request: CanvasRequest) => void>()
  renderHook(() => useForwardShortcuts(send))
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document.body
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

describe("useForwardShortcuts", () => {
  it("sends each shortcut key to the Admin", () => {
    press("Escape")
    press("Delete")
    press("s", { ctrlKey: true })
    press("k", { metaKey: true })
    press("Z", { ctrlKey: true, shiftKey: true })
    expect(send.mock.calls.map((call) => call[0])).toEqual([
      { type: "key", key: "Escape", mod: false, shift: false },
      { type: "key", key: "Delete", mod: false, shift: false },
      { type: "key", key: "s", mod: true, shift: false },
      { type: "key", key: "k", mod: true, shift: false },
      { type: "key", key: "Z", mod: true, shift: true },
    ])
  })

  it("stops the browser's own Ctrl shortcuts in the canvas", () => {
    expect(press("s", { ctrlKey: true }).defaultPrevented).toBe(true)
    expect(press("z", { ctrlKey: true }).defaultPrevented).toBe(true)
    expect(press("k", { ctrlKey: true }).defaultPrevented).toBe(true)
  })

  it("sends nothing for other keys", () => {
    press("a")
    press("Backspace")
    press("q", { ctrlKey: true })
    press("s", { ctrlKey: true, altKey: true })
    expect(send).not.toHaveBeenCalled()
  })

  it("does not send Delete or Esc while text is being typed in place", () => {
    const edit = document.createElement("div")
    edit.setAttribute("contenteditable", "true")
    const input = document.createElement("input")
    document.body.append(edit, input)
    press("Delete", {}, edit)
    press("Escape", {}, edit)
    press("Delete", {}, input)
    expect(send).not.toHaveBeenCalled()
  })

  it("still sends the Ctrl shortcuts while typing in place", () => {
    const edit = document.createElement("div")
    edit.setAttribute("contenteditable", "true")
    document.body.append(edit)
    press("s", { ctrlKey: true }, edit)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("leaves undo and redo to the browser in a plain-text in-place edit", () => {
    const edit = document.createElement("span")
    edit.setAttribute("contenteditable", "plaintext-only")
    edit.setAttribute("data-editable-field", "title")
    document.body.append(edit)
    const undo = press("z", { ctrlKey: true }, edit)
    const redo = press("Z", { ctrlKey: true, shiftKey: true }, edit)
    const cmd = press("z", { metaKey: true }, edit)
    expect(send).not.toHaveBeenCalled()
    expect(undo.defaultPrevented).toBe(false)
    expect(redo.defaultPrevented).toBe(false)
    expect(cmd.defaultPrevented).toBe(false)
    // Other chords still go to the Admin from the same edit.
    press("s", { ctrlKey: true }, edit)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("forwards undo and redo from a rich text edit", () => {
    const field = document.createElement("div")
    field.setAttribute("data-editable-field", "body")
    const root = document.createElement("div")
    root.setAttribute("contenteditable", "true")
    root.setAttribute("data-lexical-editor", "true")
    field.append(root)
    document.body.append(field)
    const undo = press("z", { ctrlKey: true }, root)
    expect(undo.defaultPrevented).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("leaves a key another handler already took", () => {
    const button = document.createElement("button")
    document.body.append(button)
    button.addEventListener("keydown", (event) => event.preventDefault())
    press("Escape", {}, button)
    expect(send).not.toHaveBeenCalled()
  })
})
