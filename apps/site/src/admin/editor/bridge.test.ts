import { describe, expect, it, vi } from "vitest"

import { CLASSIC, HARBOUR } from "../../theme"
import type { PageBlock } from "../../site/blocks/types"
import type { FooterBlock, HeaderBlock } from "../../site/regions/types"
import {
  BRIDGE_CHANNEL,
  canvasDocument,
  postDocumentToCanvas,
  postReadyToParent,
  readCanvasMessage,
  readParentMessage,
  type CanvasDocument,
} from "./bridge"
import type { LayoutDocument, PageDocument, ThemeDocument } from "./state"

const ORIGIN = "https://site.example"

const hero = (heading: string, id = "b1"): PageBlock => ({
  id,
  blockType: "hero",
  heading,
})
const strip: HeaderBlock = { id: "h1", blockType: "utilityStrip", text: "Hi" }

const DOCUMENT: CanvasDocument = {
  mode: "page",
  page: [hero("Hello")],
  header: [strip],
  footer: [],
  theme: null,
}

/** A window stand-in: identity is all the checks look at, and postMessage is spied. */
const fakeWindow = () => ({ postMessage: vi.fn() }) as unknown as Window

const message = (document: unknown = DOCUMENT) => ({
  channel: BRIDGE_CHANNEL,
  type: "document",
  document,
})

describe("readParentMessage (the canvas reads the Admin)", () => {
  const parent = fakeWindow()
  const read = (
    data: unknown,
    event: { origin?: string; source?: MessageEventSource | null } = {}
  ) =>
    readParentMessage(
      { data, origin: ORIGIN, source: parent as MessageEventSource, ...event },
      { origin: ORIGIN, parent }
    )

  it("accepts a document from the parent window on the same origin", () => {
    expect(read(message())).toEqual(DOCUMENT)
  })

  it("ignores a message from another origin", () => {
    expect(read(message(), { origin: "https://evil.example" })).toBeNull()
  })

  it("ignores a message from a window that is not the parent", () => {
    expect(read(message(), { source: fakeWindow() })).toBeNull()
    expect(read(message(), { source: null })).toBeNull()
  })

  it("ignores a message that is not ours", () => {
    expect(read({ ...message(), channel: "other" })).toBeNull()
    expect(read({ type: "document", document: DOCUMENT })).toBeNull()
    expect(read("document")).toBeNull()
    expect(read(null)).toBeNull()
    expect(read({ channel: BRIDGE_CHANNEL, type: "ready" })).toBeNull()
  })

  it.each([
    ["an unknown mode", { ...DOCUMENT, mode: "draft" }],
    ["page not a list", { ...DOCUMENT, page: {} }],
    ["header not a list", { ...DOCUMENT, header: null }],
    ["a Block that is not an object", { ...DOCUMENT, footer: ["x"] }],
    ["a Block with no type", { ...DOCUMENT, page: [{ heading: "x" }] }],
    ["theme a string", { ...DOCUMENT, theme: "classic" }],
  ])("ignores a document with %s", (_name, document) => {
    expect(read(message(document))).toBeNull()
  })

  it("ignores a missing document", () => {
    expect(read({ channel: BRIDGE_CHANNEL, type: "document" })).toBeNull()
  })

  it("carries the unsaved Theme inputs, made safe to derive from", () => {
    const theme = { ...HARBOUR.inputs, primary: "not a colour" }
    const got = read(message({ ...DOCUMENT, mode: "theme", theme }))
    expect(got?.theme).toEqual({
      ...HARBOUR.inputs,
      primary: CLASSIC.inputs.primary,
    })
  })

  it("keeps a Block's own fields as sent", () => {
    const page = [{ ...hero("Hi"), cta: { label: "Go", href: "/x" } }]
    expect(read(message({ ...DOCUMENT, page }))?.page).toEqual(page)
  })
})

describe("readCanvasMessage (the Admin reads the canvas)", () => {
  const frame = fakeWindow()
  const ready = { channel: BRIDGE_CHANNEL, type: "ready" }
  const read = (
    data: unknown,
    event: { origin?: string; source?: MessageEventSource | null } = {}
  ) =>
    readCanvasMessage(
      { data, origin: ORIGIN, source: frame as MessageEventSource, ...event },
      { origin: ORIGIN, frame }
    )

  it("accepts ready from the canvas window on the same origin", () => {
    expect(read(ready)).toEqual({ type: "ready" })
  })

  it("ignores a message from another origin", () => {
    expect(read(ready, { origin: "https://evil.example" })).toBeNull()
  })

  it("ignores a message from another window", () => {
    expect(read(ready, { source: fakeWindow() })).toBeNull()
  })

  it("ignores a canvas that has not loaded yet", () => {
    expect(
      readCanvasMessage(
        { data: ready, origin: ORIGIN, source: frame as MessageEventSource },
        { origin: ORIGIN, frame: null }
      )
    ).toBeNull()
  })

  it("ignores messages that are not ours or not known", () => {
    expect(read({ ...ready, channel: "other" })).toBeNull()
    expect(read({ channel: BRIDGE_CHANNEL, type: "nope" })).toBeNull()
    expect(read(message())).toBeNull()
    expect(read(undefined)).toBeNull()
  })
})

describe("posting", () => {
  it("posts a document to the canvas, addressed to its origin only", () => {
    const frame = fakeWindow()
    postDocumentToCanvas(frame, ORIGIN, DOCUMENT)
    expect(frame.postMessage).toHaveBeenCalledWith(message(), ORIGIN)
  })

  it("posts ready to the parent, addressed to its origin only", () => {
    const parent = fakeWindow()
    postReadyToParent(parent, ORIGIN)
    expect(parent.postMessage).toHaveBeenCalledWith(
      { channel: BRIDGE_CHANNEL, type: "ready" },
      ORIGIN
    )
  })

  it("never addresses a message to any origin", () => {
    const frame = fakeWindow()
    expect(() => postDocumentToCanvas(frame, "*", DOCUMENT)).toThrow()
    expect(() => postDocumentToCanvas(frame, "null", DOCUMENT)).toThrow()
    expect(() => postReadyToParent(frame, "*")).toThrow()
  })
})

describe("canvasDocument", () => {
  const around = {
    page: [hero("Saved page")],
    header: [strip],
    footer: [{ id: "f1", blockType: "legalBar", text: "(c)" }] as FooterBlock[],
  }

  it("a Page shows its own Blocks between the Layout it resolves to", () => {
    const doc: PageDocument = {
      kind: "page",
      title: "T",
      path: "/t",
      layout: { mode: "default" },
      blocks: [{ id: "n1", blockType: "richText", markdown: "Hi" }],
      seo: { title: "", description: "", image: null },
    }
    expect(canvasDocument(doc, around)).toEqual({
      mode: "page",
      page: doc.blocks,
      header: around.header,
      footer: around.footer,
      theme: null,
    })
  })

  it("a Layout shows its own Header and Footer around a sample Page", () => {
    const doc: LayoutDocument = {
      kind: "layout",
      name: "L",
      paths: [],
      isDefault: false,
      header: [],
      footer: [],
    }
    expect(canvasDocument(doc, around)).toEqual({
      mode: "layout",
      page: around.page,
      header: [],
      footer: [],
      theme: null,
    })
  })

  it("the Theme shows its unsaved inputs on a Page in its Layout", () => {
    const doc: ThemeDocument = { kind: "theme", inputs: HARBOUR.inputs }
    expect(canvasDocument(doc, around)).toEqual({
      mode: "theme",
      ...around,
      theme: HARBOUR.inputs,
    })
  })
})
