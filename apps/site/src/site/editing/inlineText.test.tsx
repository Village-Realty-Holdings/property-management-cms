// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { $getRoot, type LexicalEditor, type TextNode } from "lexical"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { CanvasRequest } from "../../admin/editor/bridge"
import { fixturesFor } from "../fixtures"
import { EditableText } from "../blocks/Editable"
import type { BlockContext } from "../blocks/types"
import { RichText } from "../RichText"
import { CanvasSendContext } from "./canvasSend"
import { RichTextEditing } from "./RichTextEditing"
import {
  applyLink,
  canEditInPlace,
  createHeadlessEditor,
  loadContent,
  readContent,
  toggleFormat,
  toggleList,
} from "./richTextModel"

afterEach(cleanup)

// jsdom has no layout: a selection's box is a point.
Range.prototype.getBoundingClientRect ??= () => new DOMRect(0, 100, 0, 0)

const context = (overrides: Partial<BlockContext> = {}): BlockContext => ({
  index: 2,
  fixtures: fixturesFor(undefined),
  editing: true,
  ...overrides,
})

// ── Plain text, in place ─────────────────────────────────────────────────────

function renderText(
  ui: {
    field?: string
    multiline?: boolean
    text?: string
    editing?: boolean
  } = {},
  wrap: (node: React.ReactNode) => React.ReactNode = (node) => node
) {
  const send = vi.fn<(request: CanvasRequest) => void>()
  const view = render(
    <CanvasSendContext.Provider value={send}>
      {wrap(
        <EditableText
          as="h2"
          field={ui.field ?? "heading"}
          multiline={ui.multiline}
          context={context({ editing: ui.editing ?? true })}
        >
          {ui.text ?? "Welcome"}
        </EditableText>
      )}
    </CanvasSendContext.Provider>
  )
  const heading = view.container.querySelector("h2") as HTMLElement
  return { send, heading, ...view }
}

const type = (el: HTMLElement, text: string) => {
  el.textContent = text
  fireEvent.input(el)
}

describe("<EditableText> in the Visual Editor", () => {
  it("is editable as plain text only in editing mode", () => {
    const { heading } = renderText()
    expect(heading.getAttribute("contenteditable")).toBe("plaintext-only")

    cleanup()
    const site = renderText({ editing: false })
    expect(site.heading.hasAttribute("contenteditable")).toBe(false)
  })

  it("sends each input as an edit-text, naming the Block, the field and the value", () => {
    const { heading, send } = renderText({ field: "cta.label" })
    fireEvent.focus(heading)
    type(heading, "Welcome a")
    type(heading, "Welcome aboard")
    expect(send.mock.calls.map(([request]) => request)).toEqual([
      {
        type: "edit-text",
        region: "page",
        index: 2,
        fieldPath: "cta.label",
        value: "Welcome a",
      },
      {
        type: "edit-text",
        region: "page",
        index: 2,
        fieldPath: "cta.label",
        value: "Welcome aboard",
      },
    ])
  })

  it("names a region Block by its place in the region", () => {
    const { heading, send } = renderText({}, (node) => (
      <div data-block-region="footer" data-block-index="1">
        {node}
      </div>
    ))
    type(heading, "Changed")
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ region: "footer", index: 1 })
    )
  })

  it("keeps a single line on one line", () => {
    const { heading, send } = renderText()
    type(heading, "Two\nlines\n  here")
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "Two lines here" })
    )
  })

  it("keeps the line breaks of a multi-line text", () => {
    const { heading, send } = renderText({ multiline: true })
    type(heading, "One\nTwo")
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "One\nTwo" })
    )
  })

  it("keeps the line break of an address edited in place", () => {
    const { heading, send } = renderText({
      field: "address",
      multiline: true,
      text: "12 High Street\nBath",
    })
    fireEvent.focus(heading)
    type(heading, "12 High Street\nBath!")
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "12 High Street\nBath!" })
    )
  })

  it("leaves the line breaks a single-line field already held", () => {
    const { heading, send } = renderText({ text: "One\nTwo" })
    fireEvent.focus(heading)
    type(heading, "One\nTwo!")
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "One\nTwo!" })
    )
    // A break typed or pasted in this edit still becomes a space.
    type(heading, "One\nTwo!\nmore")
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "One\nTwo! more" })
    )
    type(heading, "One\nTwo!\n more\nx")
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "One\nTwo! more x" })
    )
  })

  it("commits on Enter: it ends the edit and adds no line break", () => {
    const { heading } = renderText()
    const blur = vi.spyOn(heading, "blur")
    fireEvent.focus(heading)
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    })
    heading.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(true)
    expect(blur).toHaveBeenCalled()
  })

  it("lets Enter add a line in a multi-line text", () => {
    const { heading } = renderText({ multiline: true })
    heading.focus()
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    })
    heading.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(false)
  })

  it("reverts on Esc: the text it had when the edit started", () => {
    const { heading, send } = renderText()
    const blur = vi.spyOn(heading, "blur")
    fireEvent.focus(heading)
    type(heading, "Something else")
    send.mockClear()

    const esc = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
    heading.dispatchEvent(esc)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: "edit-text", value: "Welcome" })
    )
    expect(blur).toHaveBeenCalled()
    expect(heading.textContent).toBe("Welcome")
  })

  it("draws the text afresh from what the Admin holds when the edit ends", () => {
    const { heading, container } = renderText()
    fireEvent.focus(heading)
    type(heading, "Typed")
    fireEvent.blur(heading)
    expect(container.querySelector("h2")?.textContent).toBe("Welcome")
  })

  it("keeps Delete and Backspace to itself, so they do not remove the Block", () => {
    const { heading, container } = renderText()
    const seen = vi.fn()
    container.ownerDocument.addEventListener("keydown", seen)
    for (const key of ["Delete", "Backspace"]) {
      heading.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
      )
    }
    container.ownerDocument.removeEventListener("keydown", seen)
    expect(seen).not.toHaveBeenCalled()
  })

  it("sends nothing outside the Visual Editor's canvas", () => {
    const view = render(
      <EditableText as="h2" field="heading" context={context()}>
        Hi
      </EditableText>
    )
    const heading = view.container.querySelector("h2") as HTMLElement
    expect(() => type(heading, "Hello")).not.toThrow()
  })
})

// ── Rich text: Lexical JSON ──────────────────────────────────────────────────

const textNode = (text: string, format = 0) => ({
  type: "text",
  version: 1,
  text,
  detail: 0,
  format,
  mode: "normal",
  style: "",
})
const paragraph = (...children: object[]) => ({
  type: "paragraph",
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  children,
})
const doc = (...children: object[]) => ({
  root: {
    type: "root",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    children,
  },
})

type Json = {
  type?: string
  text?: string
  format?: number | string
  listType?: string
  tag?: string
  fields?: { url?: string; newTab?: boolean; linkType?: string }
  url?: unknown
  children?: Json[]
}

/** The JSON's nodes of one type, in document order. */
function nodesOf(content: unknown, type: string): Json[] {
  const found: Json[] = []
  const walk = (node: Json) => {
    if (node.type === type) found.push(node)
    node.children?.forEach(walk)
  }
  walk((content as { root: Json }).root)
  return found
}

/** An editor showing `text`, with `from` to `to` of it selected. */
function editorWith(
  text: string,
  from = 0,
  to = text.length,
  content: unknown = doc(paragraph(textNode(text)))
): LexicalEditor {
  const editor = createHeadlessEditor()
  loadContent(editor, content)
  select(editor, from, to)
  return editor
}

function select(editor: LexicalEditor, from: number, to: number) {
  editor.update(
    () => {
      const first = $getRoot().getFirstDescendant() as TextNode
      first.select(from, to)
    },
    { discrete: true }
  )
}

/** The plain text of the editor's paragraphs, one line each. */
function linesOf(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((node) => node.getTextContent())
  )
}

describe("rich text as Lexical JSON", () => {
  it("round-trips a Page's content unchanged in meaning", () => {
    const content = doc(paragraph(textNode("Hello "), textNode("world", 1)), {
      type: "heading",
      tag: "h2",
      version: 1,
      direction: "ltr",
      format: "",
      indent: 0,
      children: [textNode("A heading")],
    })
    const editor = createHeadlessEditor()
    loadContent(editor, content)
    const back = readContent(editor)
    expect(nodesOf(back, "text").map((n) => [n.text, n.format])).toEqual([
      ["Hello ", 0],
      ["world", 1],
      ["A heading", 0],
    ])
    expect(nodesOf(back, "heading")[0]?.tag).toBe("h2")
  })

  it("starts empty content with one empty paragraph", () => {
    const editor = createHeadlessEditor()
    loadContent(editor, null)
    expect(nodesOf(readContent(editor), "paragraph")).toHaveLength(1)
  })

  it("bold and italic mark the selected text, and mark it off again", () => {
    const editor = editorWith("Plain words then bold", 17, 21)
    toggleFormat(editor, "bold")
    toggleFormat(editor, "italic")
    const marked = nodesOf(readContent(editor), "text")
    expect(marked.map((n) => [n.text, n.format])).toEqual([
      ["Plain words then ", 0],
      ["bold", 3],
    ])

    toggleFormat(editor, "bold")
    expect(
      nodesOf(readContent(editor), "text").map((n) => [n.text, n.format])
    ).toContainEqual(["bold", 2])
  })

  it("makes a link of the selected text, as Payload stores one", () => {
    const editor = editorWith("Read the terms", 9, 14)
    expect(applyLink(editor, "https://example.com/terms")).toBe(true)
    const [link] = nodesOf(readContent(editor), "link")
    expect(link?.fields).toEqual({
      linkType: "custom",
      newTab: false,
      url: "https://example.com/terms",
    })
    expect(link?.children?.[0]?.text).toBe("terms")
    expect(link).not.toHaveProperty("url")
  })

  it("links to a Site path, a mail address and a phone number", () => {
    for (const url of ["/about", "mailto:hi@example.com", "tel:+15551234"]) {
      const editor = editorWith("Contact us", 0, 7)
      expect(applyLink(editor, url)).toBe(true)
      expect(nodesOf(readContent(editor), "link")[0]?.fields?.url).toBe(url)
    }
  })

  it("refuses a link that is not a URL or a Site path, and changes nothing", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "//evil.example",
      "/\\evil.example",
      "not a url",
      "example.com",
    ]) {
      const editor = editorWith("Contact us", 0, 7)
      const result = applyLink(editor, url)
      expect(result, url).toEqual(expect.any(String))
      expect(nodesOf(readContent(editor), "link"), url).toHaveLength(0)
    }
  })

  it("removes a link with an empty URL", () => {
    const editor = editorWith("Read the terms", 9, 14)
    applyLink(editor, "/terms")
    // The caret inside the link's text.
    editor.update(
      () => {
        ;($getRoot().getLastDescendant() as TextNode).select(2, 2)
      },
      { discrete: true }
    )
    expect(applyLink(editor, "")).toBe(true)
    expect(nodesOf(readContent(editor), "link")).toHaveLength(0)
  })

  it("reads Payload's links back in, so an existing link stays a link", () => {
    const content = doc(
      paragraph(textNode("See "), {
        type: "link",
        version: 3,
        direction: "ltr",
        format: "",
        indent: 0,
        fields: { linkType: "custom", newTab: true, url: "https://a.example" },
        children: [textNode("this")],
      })
    )
    const editor = createHeadlessEditor()
    loadContent(editor, content)
    const [link] = nodesOf(readContent(editor), "link")
    expect(link?.fields).toEqual({
      linkType: "custom",
      newTab: true,
      url: "https://a.example",
    })
  })

  it("makes a bulleted list, a numbered list, and lifts the lines out again", () => {
    const editor = editorWith("First item")
    toggleList(editor, "bullet")
    let json = readContent(editor)
    expect(nodesOf(json, "list")[0]?.listType).toBe("bullet")
    expect(nodesOf(json, "listitem")).toHaveLength(1)

    toggleList(editor, "number")
    json = readContent(editor)
    expect(nodesOf(json, "list")[0]?.listType).toBe("number")

    toggleList(editor, "number")
    json = readContent(editor)
    expect(nodesOf(json, "list")).toHaveLength(0)
    expect(linesOf(editor)).toEqual(["First item"])
  })

  it("renders everything it writes, through the Site's own RichText", () => {
    const editor = editorWith("Plain words then bold")
    select(editor, 17, 21)
    toggleFormat(editor, "bold")
    select(editor, 6, 11)
    toggleFormat(editor, "italic")
    select(editor, 0, 5)
    applyLink(editor, "/plain")
    const { container } = render(<RichText data={readContent(editor)} />)
    expect(container.querySelector("strong")?.textContent).toBe("bold")
    expect(container.querySelector("em")?.textContent).toBe("words")
    const link = container.querySelector("a")
    expect(link?.getAttribute("href")).toBe("/plain")
    expect(link?.textContent).toBe("Plain")
  })

  it("renders lists it writes", () => {
    const editor = editorWith("One")
    toggleList(editor, "bullet")
    const { container } = render(<RichText data={readContent(editor)} />)
    expect(container.querySelector("ul > li")?.textContent).toBe("One")
  })

  it("edits only what it can keep whole", () => {
    expect(canEditInPlace(doc(paragraph(textNode("Hi"))))).toBe(true)
    expect(canEditInPlace(doc())).toBe(true)
    expect(canEditInPlace(null)).toBe(true)
    // A rule, a checklist, or a node it does not know: edit in the Block tab.
    expect(canEditInPlace(doc({ type: "horizontalrule", version: 1 }))).toBe(
      false
    )
    expect(
      canEditInPlace(
        doc({
          type: "list",
          listType: "check",
          version: 1,
          children: [],
        })
      )
    ).toBe(false)
    expect(canEditInPlace({ nope: true })).toBe(false)
  })
})

// ── Rich text: the editor in the canvas ──────────────────────────────────────

describe("<RichTextEditing>", () => {
  const content = doc(paragraph(textNode("Some words here")))

  const mount = (over: Partial<Parameters<typeof RichTextEditing>[0]> = {}) => {
    const send = vi.fn<(request: CanvasRequest) => void>()
    const view = render(
      <CanvasSendContext.Provider value={send}>
        <div data-block-region="page" data-block-index="3">
          <RichTextEditing
            field="content"
            content={content}
            context={context({ index: 3 })}
            {...over}
          />
        </div>
      </CanvasSendContext.Provider>
    )
    return { send, ...view }
  }

  it("shows the content as editable text", async () => {
    mount()
    const box = await screen.findByRole("textbox")
    expect(box.textContent).toBe("Some words here")
    expect(box.getAttribute("contenteditable")).toBe("true")
  })

  /** Focuses the text and selects `from` to `to` of it, as the browser does. */
  async function selectWords(from: number, to: number) {
    const box = await screen.findByRole("textbox")
    act(() => box.focus())
    const text = box.querySelector("[data-lexical-text]")!.firstChild!
    const range = document.createRange()
    range.setStart(text, from)
    range.setEnd(text, to)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    act(() => {
      document.dispatchEvent(new Event("selectionchange"))
    })
    return box
  }

  it("offers the floating toolbar while it is being edited", async () => {
    mount()
    expect(screen.queryByRole("toolbar")).toBeNull()
    await selectWords(5, 10)
    const toolbar = await screen.findByRole("toolbar", {
      name: /text formatting/i,
    })
    for (const name of [
      "Bold",
      "Italic",
      "Link",
      "Bulleted list",
      "Numbered list",
    ]) {
      expect(within(toolbar).getByRole("button", { name })).toBeTruthy()
    }
  })

  it("sends the new Lexical JSON when a format is applied", async () => {
    const { send } = mount()
    await selectWords(5, 10)
    fireEvent.click(await screen.findByRole("button", { name: "Bold" }))
    await waitFor(() => expect(send).toHaveBeenCalled())
    const request = send.mock.calls.at(-1)![0]
    expect(request).toMatchObject({
      type: "edit-text",
      region: "page",
      index: 3,
      fieldPath: "content",
    })
    const value = (request as { value: unknown }).value
    expect(nodesOf(value, "text").map((n) => [n.text, n.format])).toEqual([
      ["Some ", 0],
      ["words", 1],
      [" here", 0],
    ])
    // What it sends is what the Site can render.
    const { container } = render(<RichText data={value} />)
    expect(container.querySelector("strong")?.textContent).toBe("words")
  })

  it("asks for a link's URL, and refuses a bad one in words", async () => {
    const { send } = mount()
    await selectWords(5, 10)
    fireEvent.click(await screen.findByRole("button", { name: "Link" }))
    const field = await screen.findByLabelText("Link URL")
    fireEvent.change(field, { target: { value: "javascript:alert(1)" } })
    fireEvent.submit(field.closest("form") as HTMLFormElement)
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it("links the selected text to a valid URL", async () => {
    const { send } = mount()
    await selectWords(5, 10)
    fireEvent.click(await screen.findByRole("button", { name: "Link" }))
    const field = await screen.findByLabelText("Link URL")
    fireEvent.change(field, { target: { value: "/words" } })
    fireEvent.submit(field.closest("form") as HTMLFormElement)
    await waitFor(() => expect(send).toHaveBeenCalled())
    const { value } = send.mock.calls.at(-1)![0] as { value: unknown }
    expect(nodesOf(value, "link")[0]?.fields?.url).toBe("/words")
  })

  it("leaves Link off when nothing is selected to link", async () => {
    mount()
    await selectWords(3, 3)
    expect(
      (await screen.findByRole("button", { name: "Link" })).getAttribute(
        "aria-disabled"
      )
    ).toBe("true")
  })

  it("shows content the Admin changed from elsewhere, but not its own echo", async () => {
    const { send, rerender } = mount()
    const again = (next: unknown) =>
      rerender(
        <CanvasSendContext.Provider value={send}>
          <div data-block-region="page" data-block-index="3">
            <RichTextEditing
              field="content"
              content={next}
              context={context({ index: 3 })}
            />
          </div>
        </CanvasSendContext.Provider>
      )
    await selectWords(5, 10)
    fireEvent.click(await screen.findByRole("button", { name: "Bold" }))
    await waitFor(() => expect(send).toHaveBeenCalled())
    const echoed = (send.mock.calls.at(-1)![0] as { value: unknown }).value
    send.mockClear()
    again(echoed)
    expect((await screen.findByRole("textbox")).textContent).toBe(
      "Some words here"
    )
    expect(send).not.toHaveBeenCalled()

    // An undo, or an edit in the Block tab.
    again(doc(paragraph(textNode("Something else"))))
    await waitFor(async () =>
      expect((await screen.findByRole("textbox")).textContent).toBe(
        "Something else"
      )
    )
    // Showing it is not an edit of it.
    expect(send).not.toHaveBeenCalled()
  })

  it("reaches the toolbar from the keyboard with Alt+F10, and moves between its buttons", async () => {
    mount()
    const box = await selectWords(5, 10)
    const toolbar = await screen.findByRole("toolbar")
    const name = () => document.activeElement?.getAttribute("aria-label")
    expect(box.getAttribute("aria-keyshortcuts")).toContain("Alt+F10")

    fireEvent.keyDown(box, { key: "F10", altKey: true })
    expect(name()).toBe("Bold")
    // The toolbar stays open while focus is in it.
    expect(screen.queryByRole("toolbar")).toBe(toolbar)

    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" })
    expect(name()).toBe("Italic")
    fireEvent.keyDown(document.activeElement!, { key: "End" })
    expect(name()).toBe("Numbered list")
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" })
    expect(name()).toBe("Bold")
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" })
    expect(name()).toBe("Numbered list")
    fireEvent.keyDown(document.activeElement!, { key: "Home" })
    expect(name()).toBe("Bold")

    // Only one button is in the Tab order at a time.
    const tabbable = within(toolbar)
      .getAllByRole("button")
      .filter((b) => b.tabIndex === 0)
    expect(tabbable.map((b) => b.getAttribute("aria-label"))).toEqual(["Bold"])
  })

  it("uses the toolbar's buttons from the keyboard", async () => {
    const { send } = mount()
    const box = await selectWords(5, 10)
    await screen.findByRole("toolbar")
    fireEvent.keyDown(box, { key: "F10", altKey: true })
    fireEvent.click(document.activeElement!)
    await waitFor(() => expect(send).toHaveBeenCalled())
    const { value } = send.mock.calls.at(-1)![0] as { value: unknown }
    expect(nodesOf(value, "text").map((n) => [n.text, n.format])).toEqual([
      ["Some ", 0],
      ["words", 1],
      [" here", 0],
    ])
  })

  it("returns to the text on Esc in the toolbar, and keeps the toolbar open", async () => {
    mount()
    const box = await selectWords(5, 10)
    await screen.findByRole("toolbar")
    fireEvent.keyDown(box, { key: "F10", altKey: true })
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Bold")
    fireEvent.keyDown(document.activeElement!, { key: "Escape" })
    await waitFor(() => expect(document.activeElement).toBe(box))
    expect(screen.queryByRole("toolbar")).not.toBeNull()
  })

  it("returns to the text on Tab in the toolbar, not to the end of the page", async () => {
    mount()
    const box = await selectWords(5, 10)
    await screen.findByRole("toolbar")
    fireEvent.keyDown(box, { key: "F10", altKey: true })
    fireEvent.keyDown(document.activeElement!, { key: "Tab" })
    await waitFor(() => expect(document.activeElement).toBe(box))
  })

  it("opens the link field with Ctrl+K, and Esc there returns to the text", async () => {
    const { send } = mount()
    const box = await selectWords(5, 10)
    await screen.findByRole("toolbar")
    fireEvent.keyDown(box, { key: "k", ctrlKey: true })
    const field = await screen.findByLabelText("Link URL")
    await waitFor(() => expect(document.activeElement).toBe(field))
    fireEvent.change(field, { target: { value: "/words" } })
    fireEvent.submit(field.closest("form") as HTMLFormElement)
    await waitFor(() => expect(send).toHaveBeenCalled())
    const { value } = send.mock.calls.at(-1)![0] as { value: unknown }
    expect(nodesOf(value, "link")[0]?.fields?.url).toBe("/words")

    fireEvent.keyDown(box, { key: "k", ctrlKey: true })
    const again = await screen.findByLabelText("Link URL")
    fireEvent.keyDown(again, { key: "Escape" })
    await waitFor(() => expect(document.activeElement).toBe(box))
    expect(screen.queryByLabelText("Link URL")).toBeNull()
  })

  it("does not open the link field with Ctrl+K when nothing is selected", async () => {
    mount()
    const box = await selectWords(3, 3)
    await screen.findByRole("toolbar")
    fireEvent.keyDown(box, { key: "k", ctrlKey: true })
    expect(screen.queryByLabelText("Link URL")).toBeNull()
  })
})
