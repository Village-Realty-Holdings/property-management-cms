// @vitest-environment jsdom
import { act, cleanup, renderHook, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PageBlock } from "../../site/blocks/types"
import { BRIDGE_CHANNEL, type CanvasDocument } from "./bridge"
import { EditorProvider, useEditor } from "./EditorProvider"
import type { EditorDocument, Region } from "./state"
import { useCanvasBridge } from "./useCanvasBridge"

const block = (id: string, heading = id) => ({
  id,
  blockType: "hero" as const,
  heading,
})
const pageDoc = (...ids: string[]): EditorDocument =>
  ({
    kind: "page",
    title: "Home",
    path: "/",
    layout: { mode: "default" },
    blocks: ids.map((id) => block(id)),
    seo: { title: "", description: "", image: null },
  }) as unknown as EditorDocument
const layoutDoc = (): EditorDocument =>
  ({
    kind: "layout",
    name: "L",
    paths: [],
    isDefault: false,
    header: [{ id: "h1", blockType: "utilityStrip", text: "Hi" }],
    footer: [],
  }) as unknown as EditorDocument

const hero = (heading: string) =>
  ({ id: "b1", blockType: "hero", heading }) as PageBlock

const documentOf = (heading: string): CanvasDocument => ({
  mode: "page",
  page: [hero(heading)],
  header: [],
  footer: [],
  theme: null,
  selectedId: null,
})

const sent = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((call) => call[0])

const documentMessage = (document: CanvasDocument) => ({
  channel: BRIDGE_CHANNEL,
  type: "document",
  document,
})

let iframe: HTMLIFrameElement
let postMessage: ReturnType<typeof vi.spyOn>

/** The canvas announcing itself, from `source`, as the browser delivers it. */
function canvasReady(
  over: Partial<MessageEventInit> = {},
  data: unknown = { channel: BRIDGE_CHANNEL, type: "ready" }
) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data,
        origin: window.location.origin,
        source: iframe.contentWindow,
        ...over,
      })
    )
  })
}

beforeEach(() => {
  iframe = window.document.createElement("iframe")
  window.document.body.append(iframe)
  postMessage = vi.spyOn(iframe.contentWindow!, "postMessage")
})
afterEach(() => {
  cleanup()
  iframe.remove()
  vi.restoreAllMocks()
})

const setup = (
  initial: CanvasDocument,
  options: {
    doc?: EditorDocument
    onInsertRequest?: (region: Region, index: number) => void
  } = {}
) =>
  renderHook(
    ({ document }) => {
      useCanvasBridge({ current: iframe }, document)
      return useEditor()
    },
    {
      initialProps: { document: initial },
      wrapper: ({ children }: { children: ReactNode }) => (
        <EditorProvider
          initial={options.doc ?? pageDoc("b1")}
          onInsertRequest={options.onInsertRequest}
        >
          {children}
        </EditorProvider>
      ),
    }
  )

describe("useCanvasBridge", () => {
  it("posts the document once the canvas is ready", () => {
    setup(documentOf("One"))
    expect(postMessage).not.toHaveBeenCalled()

    canvasReady()
    expect(sent(postMessage)).toEqual([documentMessage(documentOf("One"))])
    expect(postMessage).toHaveBeenCalledWith(
      expect.anything(),
      window.location.origin
    )
  })

  it("posts the document again on every change", () => {
    const { rerender } = setup(documentOf("One"))
    canvasReady()
    rerender({ document: documentOf("Two") })
    rerender({ document: documentOf("Three") })
    expect(sent(postMessage)).toEqual([
      documentMessage(documentOf("One")),
      documentMessage(documentOf("Two")),
      documentMessage(documentOf("Three")),
    ])
  })

  it("does not post before the canvas is ready, then sends only the latest", () => {
    const { rerender } = setup(documentOf("One"))
    rerender({ document: documentOf("Two") })
    expect(postMessage).not.toHaveBeenCalled()
    canvasReady()
    expect(sent(postMessage)).toEqual([documentMessage(documentOf("Two"))])
  })

  it("posts the current document again when the canvas reloads and is ready again", () => {
    setup(documentOf("One"))
    canvasReady()
    canvasReady()
    expect(postMessage).toHaveBeenCalledTimes(2)
  })

  it("ignores ready from another origin, another window or another shape", () => {
    setup(documentOf("One"))
    canvasReady({ origin: "https://evil.example" })
    canvasReady({ source: window })
    canvasReady({ source: null })
    canvasReady({}, { channel: "other", type: "ready" })
    canvasReady({}, { channel: BRIDGE_CHANNEL, type: "hello" })
    expect(postMessage).not.toHaveBeenCalled()
  })

  it("stops listening when the editor closes", () => {
    const { unmount } = setup(documentOf("One"))
    unmount()
    canvasReady()
    expect(postMessage).not.toHaveBeenCalled()
  })

  it("posts the selected Block with the document, and again when it changes", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    canvasReady()
    act(() => result.current.select("b2"))
    expect(sent(postMessage)).toEqual([
      documentMessage(documentOf("One")),
      documentMessage({ ...documentOf("One"), selectedId: "b2" }),
    ])
    act(() => result.current.deselect())
    expect(sent(postMessage).at(-1)).toEqual(documentMessage(documentOf("One")))
  })
})

describe("useCanvasBridge: what the canvas asks for", () => {
  const ask = (request: object, over: Partial<MessageEventInit> = {}) =>
    canvasReady(over, { channel: BRIDGE_CHANNEL, ...request })
  const ids = (editor: { doc: EditorDocument }) =>
    (editor.doc as unknown as { blocks: { id: string }[] }).blocks.map(
      (b) => b.id
    )

  it("selects the Block that was clicked", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    ask({ type: "select", id: "b2" })
    expect(result.current.selectedId).toBe("b2")
  })

  it("ignores a select for a Block the document does not have", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1") })
    ask({ type: "select", id: "gone" })
    expect(result.current.selectedId).toBeNull()
  })

  it("moves a Block up and down, one undo step each", () => {
    const { result } = setup(documentOf("One"), {
      doc: pageDoc("b1", "b2", "b3"),
    })
    ask({ type: "move", id: "b2", direction: "up" })
    expect(ids(result.current)).toEqual(["b2", "b1", "b3"])
    ask({ type: "move", id: "b2", direction: "down" })
    expect(ids(result.current)).toEqual(["b1", "b2", "b3"])
    act(() => result.current.undo())
    expect(ids(result.current)).toEqual(["b2", "b1", "b3"])
  })

  it("does not move the first Block up or the last one down", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    ask({ type: "move", id: "b1", direction: "up" })
    ask({ type: "move", id: "b2", direction: "down" })
    expect(ids(result.current)).toEqual(["b1", "b2"])
    expect(result.current.canUndo).toBe(false)
  })

  it("duplicates a Block, and the copy is selected", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    ask({ type: "duplicate", id: "b1" })
    expect(ids(result.current)).toHaveLength(3)
    expect(ids(result.current)[0]).toBe("b1")
    expect(result.current.selectedId).toBe(ids(result.current)[1])
  })

  it("deletes a Block, and Undo brings it back", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    ask({ type: "delete", id: "b1" })
    expect(ids(result.current)).toEqual(["b2"])
    act(() => result.current.undo())
    expect(ids(result.current)).toEqual(["b1", "b2"])
  })

  it("ignores a request for a Block of a region the document does not have", () => {
    // A Layout's document has no Page Blocks.
    const { result } = setup(documentOf("One"), { doc: layoutDoc() })
    ask({ type: "delete", id: "b1" })
    ask({ type: "select", id: "b1" })
    expect(result.current.selectedId).toBeNull()
    expect(result.current.canUndo).toBe(false)
  })

  it("asks the editor for an insert at the place the canvas named", () => {
    const onInsertRequest = vi.fn()
    setup(documentOf("One"), { doc: pageDoc("b1", "b2"), onInsertRequest })
    ask({ type: "insert-request", region: "page", index: 1 })
    expect(onInsertRequest).toHaveBeenCalledWith("page", 1)
    ask({ type: "insert-request", region: "page", index: 2 })
    expect(onInsertRequest).toHaveBeenLastCalledWith("page", 2)
  })

  it("does not ask for an insert in a region the document lacks, or past its end", () => {
    const onInsertRequest = vi.fn()
    setup(documentOf("One"), { doc: pageDoc("b1"), onInsertRequest })
    ask({ type: "insert-request", region: "header", index: 0 })
    ask({ type: "insert-request", region: "page", index: 5 })
    expect(onInsertRequest).not.toHaveBeenCalled()
  })

  it("opens the Block picker on insert-request, changing nothing until a Block is chosen", () => {
    Element.prototype.scrollIntoView ??= () => {}
    const { result } = setup(documentOf("One"))
    expect(screen.queryByRole("dialog")).toBeNull()
    ask({ type: "insert-request", region: "page", index: 0 })
    expect(screen.getByRole("dialog", { name: /Block/ })).toBeTruthy()
    expect(result.current.canUndo).toBe(false)
  })

  it("ignores requests from another origin, another window or of another shape", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    ask({ type: "delete", id: "b1" }, { origin: "https://evil.example" })
    ask({ type: "delete", id: "b1" }, { source: window })
    ask({ type: "delete", id: "b1" }, { source: null })
    ask({ type: "delete" })
    canvasReady({}, { channel: "other", type: "delete", id: "b1" })
    expect(ids(result.current)).toEqual(["b1", "b2"])
  })
})

describe("useCanvasBridge: text edited in place", () => {
  const ask = (request: object) =>
    canvasReady({}, { channel: BRIDGE_CHANNEL, ...request })
  const edit = (over: object) =>
    ask({
      type: "edit-text",
      region: "page",
      index: 1,
      fieldPath: "heading",
      value: "Hello",
      ...over,
    })
  const headings = (editor: { doc: EditorDocument }) =>
    (editor.doc as unknown as { blocks: { heading: string }[] }).blocks.map(
      (b) => b.heading
    )
  const lexical = (text: string) => ({
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text, format: 0 }] },
      ],
    },
  })

  it("sets the field of the Block it names", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    edit({})
    expect(headings(result.current)).toEqual(["b1", "Hello"])
  })

  it("makes a run of typing one undo step", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1", "b2") })
    edit({ value: "H" })
    edit({ value: "He" })
    edit({ value: "Hello" })
    expect(headings(result.current)).toEqual(["b1", "Hello"])
    act(() => result.current.undo())
    expect(headings(result.current)).toEqual(["b1", "b2"])
    expect(result.current.canUndo).toBe(false)
  })

  it("edits a Layout's Header and Footer Blocks by their place in the region", () => {
    const { result } = setup(documentOf("One"), { doc: layoutDoc() })
    edit({ region: "header", index: 0, fieldPath: "text", value: "Changed" })
    expect(
      (result.current.doc as unknown as { header: { text: string }[] })
        .header[0]?.text
    ).toBe("Changed")
  })

  it("ignores an edit for a Block or a region the document does not have", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1") })
    edit({ index: 4 })
    edit({ region: "header", index: 0 })
    expect(headings(result.current)).toEqual(["b1"])
    expect(result.current.canUndo).toBe(false)
  })

  it("ignores an edit of a field the Block does not have, or of another kind", () => {
    const { result } = setup(documentOf("One"), { doc: pageDoc("b1") })
    edit({ index: 0, fieldPath: "nope" })
    edit({ index: 0, fieldPath: "blockType" })
    edit({ index: 0, fieldPath: "heading", value: lexical("x") })
    edit({ index: 0, fieldPath: "__proto__.polluted" })
    expect(headings(result.current)).toEqual(["b1"])
    expect(result.current.canUndo).toBe(false)
  })

  it("takes rich text as Lexical JSON for a rich text field only", () => {
    const { result } = setup(documentOf("One"), {
      doc: {
        ...(pageDoc("b1") as object),
        blocks: [{ id: "r1", blockType: "richText", content: lexical("Old") }],
      } as unknown as EditorDocument,
    })
    edit({ index: 0, fieldPath: "content", value: lexical("New") })
    expect(
      (
        result.current.doc as unknown as {
          blocks: { content: ReturnType<typeof lexical> }[]
        }
      ).blocks[0]?.content
    ).toEqual(lexical("New"))

    edit({ index: 0, fieldPath: "content", value: "a string" })
    edit({
      index: 0,
      fieldPath: "content",
      value: {
        root: {
          type: "root",
          children: [
            {
              type: "link",
              fields: { url: "javascript:alert(1)" },
              children: [],
            },
          ],
        },
      },
    })
    expect(
      (
        result.current.doc as unknown as {
          blocks: { content: ReturnType<typeof lexical> }[]
        }
      ).blocks[0]?.content
    ).toEqual(lexical("New"))
  })

  it("ignores an edit in Theme mode, which has no Blocks", () => {
    const { result } = setup(documentOf("One"), {
      doc: {
        kind: "theme",
        inputs: {},
      } as unknown as EditorDocument,
    })
    edit({})
    expect(result.current.canUndo).toBe(false)
  })
})
