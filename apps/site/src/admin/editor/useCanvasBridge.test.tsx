// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PageBlock } from "../../site/blocks/types"
import { BRIDGE_CHANNEL, type CanvasDocument } from "./bridge"
import { useCanvasBridge } from "./useCanvasBridge"

const hero = (heading: string) =>
  ({ id: "b1", blockType: "hero", heading }) as PageBlock

const documentOf = (heading: string): CanvasDocument => ({
  mode: "page",
  page: [hero(heading)],
  header: [],
  footer: [],
  theme: null,
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

const setup = (initial: CanvasDocument) =>
  renderHook(({ document }) => useCanvasBridge({ current: iframe }, document), {
    initialProps: { document: initial },
  })

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
})
