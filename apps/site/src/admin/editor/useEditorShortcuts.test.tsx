// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest"

import { BRIDGE_CHANNEL } from "./bridge"
import { EditorProvider, useEditor } from "./EditorProvider"
import type { EditorDocument } from "./state"
import { useEditorShortcuts } from "./useEditorShortcuts"

const pageDoc = (): EditorDocument =>
  ({
    kind: "page",
    title: "Home",
    path: "/",
    layout: { mode: "default" },
    blocks: [
      { id: "a", blockType: "hero", heading: "A" },
      { id: "b", blockType: "hero", heading: "B" },
    ],
    seo: { title: "", description: "", image: null },
  }) as unknown as EditorDocument

const wrapper = ({ children }: { children: ReactNode }) => (
  <EditorProvider initial={pageDoc()}>{children}</EditorProvider>
)

let onSave: Mock<() => void>
let onPick: Mock<() => void>
let canvas: Window
let iframe: HTMLIFrameElement

function setup(over: { canSave?: boolean } = {}) {
  return renderHook(
    () => {
      useEditorShortcuts({
        onSave,
        canSave: over.canSave ?? true,
        onPickPage: onPick,
        canvasWindow: () => canvas,
      })
      return useEditor()
    },
    { wrapper }
  )
}

/** Presses `key` on `target`, as the browser delivers it. Returns the event. */
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

/** The canvas forwarding a key over the bridge. */
function fromCanvas(
  data: Record<string, unknown>,
  over: Partial<MessageEventInit> = {}
) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { channel: BRIDGE_CHANNEL, type: "key", ...data },
        origin: window.location.origin,
        source: canvas,
        ...over,
      })
    )
  })
}

const ids = (editor: ReturnType<typeof useEditor>) =>
  (editor.doc as unknown as { blocks: { id: string }[] }).blocks.map(
    (block) => block.id
  )

beforeEach(() => {
  onSave = vi.fn<() => void>()
  onPick = vi.fn<() => void>()
  iframe = document.createElement("iframe")
  document.body.append(iframe)
  canvas = iframe.contentWindow!
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("useEditorShortcuts", () => {
  describe("in the Admin", () => {
    it("Ctrl-K asks for the Page picker, and stops the browser's own", () => {
      setup()
      const event = press("k", { ctrlKey: true })
      expect(onPick).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })

    it("Cmd works as Ctrl does", () => {
      setup()
      press("k", { metaKey: true })
      press("s", { metaKey: true })
      expect(onPick).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it("Ctrl-S saves, and stops the browser's save dialog", () => {
      setup()
      const event = press("s", { ctrlKey: true })
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })

    it("Ctrl-S does not save what cannot be saved, but still stops the dialog", () => {
      setup({ canSave: false })
      const event = press("s", { ctrlKey: true })
      expect(onSave).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(true)
    })

    it("Ctrl-S saves even while typing in an input", () => {
      setup()
      const input = document.createElement("input")
      document.body.append(input)
      press("s", { ctrlKey: true }, input)
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it("Ctrl-Z undoes and Ctrl-Shift-Z redoes", () => {
      const { result } = setup()
      act(() => result.current.removeBlock("a"))
      expect(ids(result.current)).toEqual(["b"])

      const undo = press("z", { ctrlKey: true })
      expect(ids(result.current)).toEqual(["a", "b"])
      expect(undo.defaultPrevented).toBe(true)

      press("Z", { ctrlKey: true, shiftKey: true })
      expect(ids(result.current)).toEqual(["b"])
    })

    it("Esc deselects", () => {
      const { result } = setup()
      act(() => result.current.select("a"))
      expect(result.current.selectedId).toBe("a")
      press("Escape")
      expect(result.current.selectedId).toBeNull()
    })

    it("Delete removes the selected Block, and is one undo step", () => {
      const { result } = setup()
      act(() => result.current.select("a"))
      press("Delete")
      expect(ids(result.current)).toEqual(["b"])
      press("z", { ctrlKey: true })
      expect(ids(result.current)).toEqual(["a", "b"])
    })

    it("Delete with nothing selected does nothing", () => {
      const { result } = setup()
      press("Delete")
      expect(ids(result.current)).toEqual(["a", "b"])
    })

    it("Delete works with focus on a button, like an Outline row", () => {
      const { result } = setup()
      const button = document.createElement("button")
      document.body.append(button)
      act(() => result.current.select("a"))
      press("Delete", {}, button)
      expect(ids(result.current)).toEqual(["b"])
    })

    it("leaves other keys and other modifiers alone", () => {
      const { result } = setup()
      act(() => result.current.select("a"))
      const others = [
        press("a"),
        press("s", { ctrlKey: true, shiftKey: true }),
        press("s", { ctrlKey: true, altKey: true }),
        press("Delete", { shiftKey: true }),
        press("Backspace"),
      ]
      expect(others.every((event) => !event.defaultPrevented)).toBe(true)
      expect(onSave).not.toHaveBeenCalled()
      expect(ids(result.current)).toEqual(["a", "b"])
      expect(result.current.selectedId).toBe("a")
    })
  })

  describe("while typing", () => {
    const typingTargets: [string, () => HTMLElement][] = [
      ["an input", () => document.createElement("input")],
      ["a textarea", () => document.createElement("textarea")],
      [
        "an in-place text edit",
        () => {
          const element = document.createElement("div")
          element.setAttribute("contenteditable", "true")
          return element
        },
      ],
      [
        "a text box role",
        () => {
          const element = document.createElement("div")
          element.setAttribute("role", "textbox")
          return element
        },
      ],
    ]

    it.each(typingTargets)("Delete and Esc do nothing in %s", (_, make) => {
      const { result } = setup()
      const target = make()
      document.body.append(target)
      act(() => result.current.select("a"))

      press("Delete", {}, target)
      press("Escape", {}, target)
      expect(ids(result.current)).toEqual(["a", "b"])
      expect(result.current.selectedId).toBe("a")
    })
  })

  describe("in an open dialog", () => {
    it("Delete and Esc are the dialog's, not the editor's", () => {
      const { result } = setup()
      const dialog = document.createElement("div")
      dialog.setAttribute("role", "dialog")
      const button = document.createElement("button")
      dialog.append(button)
      document.body.append(dialog)
      act(() => result.current.select("a"))

      press("Delete", {}, button)
      press("Escape", {}, button)
      press("z", { ctrlKey: true }, button)
      expect(ids(result.current)).toEqual(["a", "b"])
      expect(result.current.selectedId).toBe("a")
    })
  })

  describe("forwarded from the canvas", () => {
    it("runs each shortcut the canvas sends", () => {
      const { result } = setup()
      act(() => result.current.select("a"))

      fromCanvas({ key: "Delete", mod: false, shift: false })
      expect(ids(result.current)).toEqual(["b"])
      fromCanvas({ key: "z", mod: true, shift: false })
      expect(ids(result.current)).toEqual(["a", "b"])
      fromCanvas({ key: "z", mod: true, shift: true })
      expect(ids(result.current)).toEqual(["b"])
      fromCanvas({ key: "z", mod: true, shift: false })

      fromCanvas({ key: "s", mod: true, shift: false })
      expect(onSave).toHaveBeenCalledTimes(1)
      fromCanvas({ key: "k", mod: true, shift: false })
      expect(onPick).toHaveBeenCalledTimes(1)

      act(() => result.current.select("b"))
      fromCanvas({ key: "Escape", mod: false, shift: false })
      expect(result.current.selectedId).toBeNull()
    })

    it("does not save what cannot be saved", () => {
      setup({ canSave: false })
      fromCanvas({ key: "s", mod: true, shift: false })
      expect(onSave).not.toHaveBeenCalled()
    })

    it("ignores a message from any other window or origin", () => {
      const { result } = setup()
      act(() => result.current.select("a"))
      fromCanvas(
        { key: "Delete", mod: false, shift: false },
        { source: window }
      )
      fromCanvas(
        { key: "Delete", mod: false, shift: false },
        { origin: "https://evil.example" }
      )
      expect(ids(result.current)).toEqual(["a", "b"])
    })

    it("ignores keys that are not shortcuts", () => {
      const { result } = setup()
      act(() => result.current.select("a"))
      fromCanvas({ key: "Backspace", mod: false, shift: false })
      fromCanvas({ key: "q", mod: true, shift: false })
      fromCanvas({ key: 7, mod: true, shift: false })
      expect(ids(result.current)).toEqual(["a", "b"])
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  it("stops listening when unmounted", () => {
    const { unmount } = setup()
    unmount()
    press("s", { ctrlKey: true })
    fromCanvas({ key: "s", mod: true, shift: false })
    expect(onSave).not.toHaveBeenCalled()
  })
})
