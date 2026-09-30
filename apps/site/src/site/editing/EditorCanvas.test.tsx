// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BRIDGE_CHANNEL, type CanvasDocument } from "../../admin/editor/bridge"
import { combineFonts } from "../../fonts/available"
import { CLASSIC, HARBOUR } from "../../theme"
import { resolveBrand } from "../brand"
import { fixturesFor } from "../fixtures"
import { EditorCanvas } from "./EditorCanvas"

const brand = resolveBrand(null)
const fixtures = fixturesFor(undefined)

const hero = (heading: string, id = "b1") =>
  ({ id, blockType: "hero", heading }) as CanvasDocument["page"][number]

const documentOf = (over: Partial<CanvasDocument> = {}): CanvasDocument => ({
  mode: "page",
  page: [hero("First heading")],
  header: [],
  footer: [],
  theme: null,
  ...over,
})

/**
 * Delivers a message the way the browser does. jsdom has no parent frame, so
 * `window.parent` is the window itself and the canvas treats it as the Admin.
 */
function deliver(document: unknown, over: Partial<MessageEventInit> = {}) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { channel: BRIDGE_CHANNEL, type: "document", document },
        origin: window.location.origin,
        source: window,
        ...over,
      })
    )
  })
}

const themeCss = () =>
  window.document.getElementById("editor-theme")?.textContent ?? null

let posted: unknown[]
const record = (event: MessageEvent) => posted.push(event.data)

beforeEach(() => {
  posted = []
  window.addEventListener("message", record)
})
afterEach(() => {
  window.removeEventListener("message", record)
  cleanup()
  vi.useRealTimers()
})

describe("EditorCanvas", () => {
  it("tells the Admin it is ready, and shows nothing until a document comes", async () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    await act(async () => {})
    expect(posted).toContainEqual({ channel: BRIDGE_CHANNEL, type: "ready" })
    expect(screen.queryByRole("heading")).toBeNull()
  })

  it("renders the Blocks of a posted document, and re-renders on the next", () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    deliver(documentOf())
    expect(screen.getByRole("heading", { name: "First heading" })).toBeTruthy()

    deliver(documentOf({ page: [hero("Edited heading")] }))
    expect(screen.queryByRole("heading", { name: "First heading" })).toBeNull()
    expect(screen.getByRole("heading", { name: "Edited heading" })).toBeTruthy()
  })

  it("renders in editing mode, so plain text names its field", () => {
    const { container } = render(
      <EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />
    )
    deliver(documentOf())
    const heading = container.querySelector("[data-editable-field=heading]")
    expect(heading?.textContent).toBe("First heading")
  })

  it("renders the Header and Footer Blocks from the document", () => {
    const { container } = render(
      <EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />
    )
    deliver(
      documentOf({
        header: [
          { id: "h1", blockType: "utilityStrip", text: "Strip words" },
        ] as CanvasDocument["header"],
        footer: [
          { id: "f1", blockType: "legalBar" },
        ] as CanvasDocument["footer"],
      })
    )
    expect(container.querySelector("header")?.textContent).toContain(
      "Strip words"
    )
    expect(container.querySelector("footer")).not.toBeNull()
  })

  it("ignores documents from another origin or another window", () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    deliver(documentOf())
    deliver(documentOf({ page: [hero("Evil")] }), {
      origin: "https://evil.example",
    })
    deliver(documentOf({ page: [hero("Stranger")] }), { source: null })
    expect(screen.getByRole("heading", { name: "First heading" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Evil" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Stranger" })).toBeNull()
  })

  it("keeps the last good document when a malformed one arrives", () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    deliver(documentOf())
    deliver({ mode: "page", page: "nope" })
    expect(screen.getByRole("heading", { name: "First heading" })).toBeTruthy()
  })

  it("applies unsaved Theme inputs as tokens at :root, and removes them with the Theme", () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    deliver(documentOf())
    expect(themeCss()).toBeNull()

    deliver(documentOf({ mode: "theme", theme: HARBOUR.inputs }))
    expect(themeCss()).toContain(":root{")
    expect(themeCss()).toContain(`--primary:${HARBOUR.inputs.primary};`)

    deliver(
      documentOf({
        mode: "theme",
        theme: { ...HARBOUR.inputs, primary: "#123456" },
      })
    )
    expect(themeCss()).toContain("--primary:#123456;")

    deliver(documentOf({ mode: "page", theme: null }))
    expect(themeCss()).toBeNull()
  })

  it("derives the Theme with the Site's stored fonts", () => {
    const fonts = combineFonts([
      {
        id: 7,
        family: "Roboto Slab",
        kind: "slab",
        files: [{ weight: 400, style: "normal", url: "/f/rs.woff2" }],
      },
    ])
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={fonts} />)
    deliver(
      documentOf({
        mode: "theme",
        theme: { ...CLASSIC.inputs, headingFont: "font:7" },
      })
    )
    expect(themeCss()).toContain('@font-face{font-family:"Roboto Slab";')
    expect(themeCss()).toMatch(/--font-display:[^;]*Roboto Slab/)
  })

  it("locks the Layout beside a Page, and the Page beside a Layout", () => {
    const { container } = render(
      <EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />
    )
    const doc = documentOf({
      footer: [{ id: "f1", blockType: "legalBar" }] as CanvasDocument["footer"],
    })
    deliver(doc)
    expect(container.querySelector("footer")?.closest("[inert]")).not.toBeNull()
    expect(container.querySelector("main")?.hasAttribute("inert")).toBe(false)

    deliver({ ...doc, mode: "layout" })
    expect(container.querySelector("footer")?.closest("[inert]")).toBeNull()
    expect(container.querySelector("main")?.hasAttribute("inert")).toBe(true)

    deliver({ ...doc, mode: "theme" })
    expect(container.querySelector("[inert]")).toBeNull()
  })

  it("does not navigate when a link is clicked", () => {
    const { container } = render(
      <EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />
    )
    deliver(
      documentOf({
        page: [
          {
            id: "b1",
            blockType: "callToAction",
            heading: "Go",
            button: { label: "Book", href: "/book" },
          },
        ] as CanvasDocument["page"],
      })
    )
    const link = container.querySelector("a[href]") as HTMLAnchorElement
    expect(link).not.toBeNull()
    const event = new MouseEvent("click", { bubbles: true, cancelable: true })
    act(() => {
      link.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  })
})

describe("EditorCanvas announcing itself", () => {
  it("keeps announcing until a document comes, then stops", () => {
    vi.useFakeTimers()
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    const readies = () =>
      posted.filter((m) => (m as { type?: string }).type === "ready").length
    act(() => {
      vi.advanceTimersByTime(1_100)
    })
    expect(readies()).toBeGreaterThan(1)

    deliver(documentOf())
    const before = readies()
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(readies()).toBe(before)
  })
})
