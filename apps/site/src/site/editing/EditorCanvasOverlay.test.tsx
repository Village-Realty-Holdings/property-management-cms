// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { BRIDGE_CHANNEL, type CanvasDocument } from "../../admin/editor/bridge"
import { resolveBrand } from "../brand"
import { fixturesFor } from "../fixtures"
import { EditorCanvas } from "./EditorCanvas"

const brand = resolveBrand(null)
const fixtures = fixturesFor(undefined)

const hero = (heading: string, id: string) =>
  ({ id, blockType: "hero", heading }) as CanvasDocument["page"][number]

const two: CanvasDocument = {
  mode: "page",
  page: [hero("First heading", "b1"), hero("Second heading", "b2")],
  header: [
    { id: "h1", blockType: "utilityStrip", text: "Strip words" },
  ] as CanvasDocument["header"],
  footer: [],
  theme: null,
}

/**
 * The Admin posting a document. jsdom has no parent frame, so `window.parent`
 * is the window itself and the canvas treats it as the Admin.
 */
function deliver(document: CanvasDocument) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { channel: BRIDGE_CHANNEL, type: "document", document },
        origin: window.location.origin,
        source: window,
      })
    )
  })
}

let posted: { channel?: string; type?: string }[]
const record = (event: MessageEvent) => posted.push(event.data)
/** What the canvas asked of the Admin: not its `ready`, nor the documents posted to it. */
const requests = () =>
  posted.filter(
    (m) =>
      m.channel === BRIDGE_CHANNEL &&
      m.type !== "ready" &&
      m.type !== "document"
  )

const press = (element: Element | null) =>
  act(async () => (element as HTMLElement).click())

beforeEach(() => {
  posted = []
  window.addEventListener("message", record)
})
afterEach(() => {
  window.removeEventListener("message", record)
  cleanup()
})

describe("EditorCanvas overlay", () => {
  it("sends select to the Admin when a Block of the Page is clicked", async () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    deliver(two)
    await press(screen.getByRole("heading", { name: "Second heading" }))
    expect(requests()).toEqual([
      { channel: BRIDGE_CHANNEL, type: "select", id: "b2" },
    ])
  })

  it("shows the Block toolbar on the Block the document selects", () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    deliver({ ...two, selectedId: "b2" })
    expect(screen.getByRole("toolbar", { name: "Block toolbar" })).toBeTruthy()
    deliver({ ...two, selectedId: null })
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("sends a toolbar request to the Admin", async () => {
    render(<EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />)
    deliver({ ...two, selectedId: "b1" })
    await press(screen.getByRole("button", { name: "Delete" }))
    expect(requests()).toEqual([
      { channel: BRIDGE_CHANNEL, type: "delete", id: "b1" },
    ])
  })

  it("locks the Header in Page mode, the Page in Layout mode and everything in Theme mode", async () => {
    const { container } = render(
      <EditorCanvas brand={brand} fixtures={fixtures} fonts={[]} />
    )
    const strip = () => container.querySelector("[data-block-id=h1] > *")

    deliver(two)
    await press(strip())
    expect(requests()).toEqual([])

    deliver({ ...two, mode: "layout" })
    await press(screen.getByRole("heading", { name: "Second heading" }))
    expect(requests()).toEqual([])
    await press(strip())
    expect(requests()).toEqual([
      { channel: BRIDGE_CHANNEL, type: "select", id: "h1" },
    ])

    // Theme mode turns Block editing off, so no Block is framed at all.
    deliver({ ...two, mode: "theme" })
    expect(container.querySelector("[data-block-id]")).toBeNull()
    await press(screen.getByText("Strip words"))
    await press(screen.getByRole("heading", { name: "First heading" }))
    expect(requests()).toHaveLength(1)
  })
})
