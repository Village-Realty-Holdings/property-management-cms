import { describe, expect, it, vi } from "vitest"

import { CLASSIC, HARBOUR } from "../../theme"
import type { PageBlock } from "../../site/blocks/types"
import type { FooterBlock, HeaderBlock } from "../../site/regions/types"
import {
  acceptsTextEdit,
  BRIDGE_CHANNEL,
  canvasDocument,
  editableRegions,
  postDocumentToCanvas,
  postReadyToParent,
  postToParent,
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
  selectedId: null,
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

  it("carries the selected Block's id, and reads a missing or odd one as none", () => {
    expect(read(message({ ...DOCUMENT, selectedId: "b1" }))?.selectedId).toBe(
      "b1"
    )
    const without: Partial<CanvasDocument> = { ...DOCUMENT }
    delete without.selectedId
    expect(read(message(without))?.selectedId).toBeNull()
    expect(read(message({ ...DOCUMENT, selectedId: 4 }))?.selectedId).toBeNull()
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

  it.each([
    [{ type: "select", id: "b1" }],
    [{ type: "duplicate", id: "b1" }],
    [{ type: "delete", id: "b1" }],
    [{ type: "move", id: "b1", direction: "up" }],
    [{ type: "move", id: "b1", direction: "down" }],
    [{ type: "insert-request", region: "page", index: 0 }],
    [{ type: "insert-request", region: "footer", index: 3 }],
  ])("accepts the request %j", (request) => {
    expect(read({ channel: BRIDGE_CHANNEL, ...request })).toEqual(request)
  })

  it.each([
    ["select without an id", { type: "select" }],
    ["select with an empty id", { type: "select", id: "" }],
    ["delete with a number for an id", { type: "delete", id: 4 }],
    ["move without a direction", { type: "move", id: "b1" }],
    ["move sideways", { type: "move", id: "b1", direction: "left" }],
    [
      "insert in an unknown region",
      { type: "insert-request", region: "x", index: 0 },
    ],
    [
      "insert at a negative index",
      { type: "insert-request", region: "page", index: -1 },
    ],
    [
      "insert at a fractional index",
      { type: "insert-request", region: "page", index: 0.5 },
    ],
    ["insert with no index", { type: "insert-request", region: "page" }],
  ])("ignores a request that is malformed: %s", (_name, request) => {
    expect(read({ channel: BRIDGE_CHANNEL, ...request })).toBeNull()
  })

  it("ignores a request from another origin or window", () => {
    const request = { channel: BRIDGE_CHANNEL, type: "select", id: "b1" }
    expect(read(request, { origin: "https://evil.example" })).toBeNull()
    expect(read(request, { source: fakeWindow() })).toBeNull()
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

  it("posts a request to the parent, addressed to its origin only", () => {
    const parent = fakeWindow()
    postToParent(parent, ORIGIN, { type: "select", id: "b1" })
    expect(parent.postMessage).toHaveBeenCalledWith(
      { channel: BRIDGE_CHANNEL, type: "select", id: "b1" },
      ORIGIN
    )
    expect(() =>
      postToParent(parent, "*", { type: "delete", id: "b1" })
    ).toThrow()
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

describe("editableRegions", () => {
  it("a Page's Blocks are editable in Page mode, the Layout's in Layout mode, none in Theme mode", () => {
    expect(editableRegions("page")).toEqual(["page"])
    expect(editableRegions("layout")).toEqual(["header", "footer"])
    expect(editableRegions("theme")).toEqual([])
  })
})

describe("edit-text", () => {
  const frame = fakeWindow()
  const read = (data: unknown) =>
    readCanvasMessage(
      { data, origin: ORIGIN, source: frame as MessageEventSource },
      { origin: ORIGIN, frame }
    )
  const text = (t: string) => ({ type: "text", text: t })
  const paragraph = (...children: object[]) => ({ type: "paragraph", children })
  const lexical = (...children: object[]) => ({
    root: { type: "root", children },
  })
  const link = (url: unknown) => ({
    type: "link",
    fields: { url },
    children: [text("x")],
  })

  it.each([
    [{ type: "edit-text", id: "b1", fieldPath: "heading", value: "Hi" }],
    [{ type: "edit-text", id: "f1", fieldPath: "cta.label", value: "" }],
    [{ type: "edit-text", id: "b2", fieldPath: "items.3.title", value: "A" }],
    [
      {
        type: "edit-text",
        id: "new-4",
        fieldPath: "content",
        value: lexical(paragraph(text("Hi"))),
      },
    ],
  ])("accepts %j", (request) => {
    expect(read({ channel: BRIDGE_CHANNEL, ...request })).toEqual(request)
  })

  const base = { id: "b1", fieldPath: "a", value: "v" }
  it.each([
    ["no Block", { ...base, id: undefined }],
    ["an empty id", { ...base, id: "" }],
    ["a number for an id", { ...base, id: 4 }],
    ["no field", { ...base, fieldPath: undefined }],
    ["an empty field", { ...base, fieldPath: "" }],
    ["an empty path segment", { ...base, fieldPath: "a..b" }],
    ["a path that is not a path", { ...base, fieldPath: "a b/c" }],
    ["a Block's type", { ...base, fieldPath: "blockType" }],
    ["a Block's id", { ...base, fieldPath: "id" }],
    ["an item's id", { ...base, fieldPath: "items.0.id" }],
    ["a number for a value", { ...base, value: 4 }],
    ["an array for a value", { ...base, value: [] }],
    ["no value", { ...base, value: undefined }],
  ])("ignores an edit with %s", (_name, request) => {
    expect(
      read({ channel: BRIDGE_CHANNEL, type: "edit-text", ...request })
    ).toBeNull()
  })

  describe("what an edit may set", () => {
    it("a text takes a text, and a Lexical document takes a Lexical document", () => {
      expect(acceptsTextEdit("Old", "New")).toBe(true)
      expect(acceptsTextEdit("Old", lexical())).toBe(false)
      expect(acceptsTextEdit(lexical(), "New")).toBe(false)
      expect(acceptsTextEdit(lexical(), lexical(paragraph(text("Hi"))))).toBe(
        true
      )
    })

    it("sets only a field that is there", () => {
      expect(acceptsTextEdit(undefined, "New")).toBe(false)
      expect(acceptsTextEdit(null, "New")).toBe(false)
      expect(acceptsTextEdit(4, "New")).toBe(false)
    })

    it("takes a document only when it is one", () => {
      expect(acceptsTextEdit(lexical(), { root: { type: "x" } })).toBe(false)
      expect(acceptsTextEdit(lexical(), { root: { type: "root" } })).toBe(false)
      expect(acceptsTextEdit(lexical(), { nope: 1 })).toBe(false)
      expect(acceptsTextEdit(lexical(), lexical({ children: [] }))).toBe(false)
    })

    it("takes links that are URLs, Site paths, mail or phone, and no others", () => {
      for (const url of [
        "https://a.example/x",
        "/about",
        "#top",
        "mailto:a@b.co",
        "tel:+1555",
      ]) {
        expect(
          acceptsTextEdit(lexical(), lexical(paragraph(link(url)))),
          url
        ).toBe(true)
      }
      for (const url of [
        "javascript:alert(1)",
        "//evil.example",
        "",
        4,
        undefined,
      ]) {
        expect(
          acceptsTextEdit(lexical(), lexical(paragraph(link(url)))),
          String(url)
        ).toBe(false)
      }
    })
  })
})

describe("key (a shortcut pressed in the canvas)", () => {
  const frame = fakeWindow()
  const read = (data: Record<string, unknown>) =>
    readCanvasMessage(
      {
        data: { channel: BRIDGE_CHANNEL, type: "key", ...data },
        origin: ORIGIN,
        source: frame as MessageEventSource,
      },
      { origin: ORIGIN, frame }
    )

  it("accepts the keys that are shortcuts", () => {
    expect(read({ key: "Delete", mod: false, shift: false })).toEqual({
      type: "key",
      key: "Delete",
      mod: false,
      shift: false,
    })
    expect(read({ key: "Z", mod: true, shift: true })).toEqual({
      type: "key",
      key: "Z",
      mod: true,
      shift: true,
    })
  })

  it("ignores any other key, and a malformed one", () => {
    expect(read({ key: "a", mod: false, shift: false })).toBeNull()
    expect(read({ key: "q", mod: true, shift: false })).toBeNull()
    expect(read({ key: 4, mod: true, shift: false })).toBeNull()
    expect(read({ mod: true })).toBeNull()
  })
})
