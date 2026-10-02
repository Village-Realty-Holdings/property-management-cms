// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { CanvasRequest } from "../../admin/editor/bridge"
import type { Region } from "../../admin/editor/state"
import { Blocks, type PageBlock } from "../blocks"
import { fixturesFor } from "../fixtures"
import { RegionBlocks } from "../regions"
import type { HeaderBlock, FooterBlock } from "../regions"
import { CanvasOverlay } from "./overlay"

const fixtures = fixturesFor(undefined)
const brand = {
  name: "Brand",
  tagline: null,
  logo: null,
  phone: null,
  email: null,
  address: null,
  social: [],
} as never

const hero = (id: string, heading: string) =>
  ({ id, blockType: "hero", heading }) as PageBlock
const page = [hero("b1", "First"), hero("b2", "Second"), hero("b3", "Third")]
const header = [
  { id: "h1", blockType: "utilityStrip", text: "Strip words" },
] as HeaderBlock[]
const footer = [
  { id: "f1", blockType: "legalBar", text: "Copyright words" },
] as FooterBlock[]

function setup({
  editable = ["page"],
  selectedId = null,
  blocks = page,
}: {
  editable?: Region[]
  selectedId?: string | null
  blocks?: PageBlock[]
} = {}) {
  const send = vi.fn<(request: CanvasRequest) => void>()
  const ui = (selected: string | null) => (
    <>
      <RegionBlocks
        region="header"
        blocks={header}
        context={{ brand, fixtures, editing: true }}
      />
      <main>
        <Blocks blocks={blocks} fixtures={fixtures} editing />
      </main>
      <RegionBlocks
        region="footer"
        blocks={footer}
        context={{ brand, fixtures, editing: true }}
      />
      <CanvasOverlay editable={editable} selectedId={selected} send={send} />
    </>
  )
  const view = render(ui(selectedId))
  return {
    send,
    ...view,
    select: (id: string | null) => view.rerender(ui(id)),
  }
}

const heading = (name: string) => screen.getByRole("heading", { name })
const hover = (element: Element) => fireEvent.mouseOver(element)
const toolbar = () => screen.queryByRole("toolbar", { name: "Block toolbar" })
const plusButtons = () =>
  screen.queryAllByRole("button", { name: /^Add Block/ })
/** Gives each Block a box in a stack, by id: its top and height. */
function stack(
  container: HTMLElement,
  boxes: Record<string, [number, number]>
) {
  for (const [id, [top, height]] of Object.entries(boxes)) {
    const own = container.querySelector(
      `[data-block-id=${id}] > :first-child`
    ) as HTMLElement
    own.getBoundingClientRect = () => new DOMRect(0, top, 900, height)
  }
  act(() => {
    window.dispatchEvent(new Event("resize"))
  })
}

afterEach(cleanup)

describe("CanvasOverlay hover", () => {
  it("labels the Block under the pointer with its name from the catalogue", () => {
    setup()
    expect(screen.queryByText("Hero")).toBeNull()
    hover(heading("Second"))
    expect(screen.getByText("Hero")).toBeTruthy()
  })

  it("outlines the Block it labels, and moves to the next Block the pointer enters", () => {
    const { container } = setup({
      blocks: [
        hero("b1", "First"),
        {
          id: "b2",
          blockType: "callToAction",
          heading: "Book now",
        } as PageBlock,
      ],
    })
    hover(heading("First"))
    expect(
      container.querySelectorAll("[data-canvas-outline=hover]")
    ).toHaveLength(1)
    expect(screen.getByText("Hero")).toBeTruthy()

    hover(container.querySelector("[data-block-id=b2]")!.firstElementChild!)
    expect(screen.queryByText("Hero")).toBeNull()
    expect(screen.getByText("Call to action")).toBeTruthy()
  })

  it("clears the label when the pointer leaves the canvas", () => {
    setup()
    hover(heading("First"))
    fireEvent.mouseOut(heading("First"), { relatedTarget: null })
    expect(screen.queryByText("Hero")).toBeNull()
  })

  it("keeps the label while the pointer is on the overlay's own buttons", () => {
    setup()
    hover(heading("Second"))
    const plus = plusButtons()[0]!
    hover(plus)
    fireEvent.mouseOut(heading("Second"), { relatedTarget: plus })
    expect(screen.getByText("Hero")).toBeTruthy()
  })

  it("labels a region Block with its name from the region catalogue", () => {
    const { container } = setup({ editable: ["header", "footer"] })
    hover(container.querySelector("[data-block-id=h1]")!.firstElementChild!)
    expect(screen.getByText("Utility strip")).toBeTruthy()
    hover(container.querySelector("[data-block-id=f1]")!.firstElementChild!)
    expect(screen.getByText("Legal bar")).toBeTruthy()
  })

  it("does not label a Block of a locked region", () => {
    const { container } = setup({ editable: ["header", "footer"] })
    hover(heading("Second"))
    expect(screen.queryByText("Hero")).toBeNull()
    expect(container.querySelector("[data-canvas-outline]")).toBeNull()
    expect(plusButtons()).toHaveLength(0)
  })

  it("does not label anything when no region is editable (Theme mode)", () => {
    const { container } = setup({ editable: [] })
    hover(heading("Second"))
    hover(container.querySelector("[data-block-id=h1]")!.firstElementChild!)
    expect(container.querySelector("[data-canvas-outline]")).toBeNull()
  })

  it("does not label what is outside any Block", () => {
    const { container } = setup()
    hover(container.querySelector("main")!)
    expect(container.querySelector("[data-canvas-outline]")).toBeNull()
  })
})

describe("CanvasOverlay selecting", () => {
  it("asks the Admin to select the Block that is clicked", () => {
    const { send } = setup()
    fireEvent.click(heading("Second"))
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "select", id: "b2" })
  })

  it("selects from anywhere inside the Block", () => {
    const { send, container } = setup()
    fireEvent.click(container.querySelector("[data-block-id=b3] section")!)
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "select", id: "b3" })
  })

  it("asks to select a Layout Block in Layout mode", () => {
    const { send, container } = setup({ editable: ["header", "footer"] })
    fireEvent.click(
      container.querySelector("[data-block-id=h1]")!.firstElementChild!
    )
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "select", id: "h1" })
  })

  it("ignores clicks on Page Blocks in Layout mode", () => {
    const { send } = setup({ editable: ["header", "footer"] })
    fireEvent.click(heading("Second"))
    expect(send).not.toHaveBeenCalled()
  })

  it("ignores clicks on region Blocks in Page mode", () => {
    const { send, container } = setup({ editable: ["page"] })
    fireEvent.click(
      container.querySelector("[data-block-id=h1]")!.firstElementChild!
    )
    fireEvent.click(
      container.querySelector("[data-block-id=f1]")!.firstElementChild!
    )
    expect(send).not.toHaveBeenCalled()
  })

  it("ignores every click when no region is editable", () => {
    const { send } = setup({ editable: [] })
    fireEvent.click(heading("Second"))
    expect(send).not.toHaveBeenCalled()
  })

  it("ignores a click that is not on a Block", () => {
    const { send, container } = setup()
    fireEvent.click(container.querySelector("main")!)
    expect(send).not.toHaveBeenCalled()
  })

  it("does not select a Block that has no id", () => {
    const { send } = setup({
      blocks: [{ blockType: "hero", heading: "No id" } as PageBlock],
    })
    fireEvent.click(heading("No id"))
    expect(send).not.toHaveBeenCalled()
  })

  it("does not act on its own controls as if they were Blocks", () => {
    const { send } = setup({ selectedId: "b2" })
    fireEvent.click(toolbar()!)
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }))
    expect(send).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "select" })
    )
  })

  it("stops listening when it unmounts", () => {
    const { send, unmount } = setup()
    unmount()
    fireEvent.click(document.body)
    expect(send).not.toHaveBeenCalled()
  })
})

describe("CanvasOverlay scrolling to the selection", () => {
  const scrolls = () => {
    const spy = vi.fn()
    Element.prototype.scrollIntoView = spy
    return spy
  }
  afterEach(() => {
    // @ts-expect-error -- jsdom has none; each test installs its own.
    delete Element.prototype.scrollIntoView
  })

  it("brings a Block that becomes selected into view, as little as it takes", () => {
    const spy = scrolls()
    const { select, container } = setup()
    expect(spy).not.toHaveBeenCalled()
    select("b3")
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.contexts[0]).toBe(
      container.querySelector("[data-block-id=b3]")
    )
    expect(spy.mock.calls[0]![0]).toMatchObject({ block: "nearest" })
  })

  it("scrolls when the selection moves to another Block, and not when it is cleared", () => {
    const spy = scrolls()
    const { select } = setup({ selectedId: "b1" })
    expect(spy).toHaveBeenCalledTimes(1)
    select("b2")
    expect(spy).toHaveBeenCalledTimes(2)
    select(null)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it("does not scroll to a Block of a locked region or one that is gone", () => {
    const spy = scrolls()
    const { select } = setup()
    select("h1")
    select("nope")
    expect(spy).not.toHaveBeenCalled()
  })
})

describe("CanvasOverlay Block toolbar", () => {
  it("shows a toolbar of named buttons on the selected Block only", () => {
    const { select } = setup()
    expect(toolbar()).toBeNull()

    select("b2")
    const bar = within(toolbar()!)
    for (const name of ["Move up", "Move down", "Duplicate", "Delete"]) {
      expect(bar.getByRole("button", { name })).toBeTruthy()
    }
    expect(screen.getAllByRole("toolbar")).toHaveLength(1)

    select(null)
    expect(toolbar()).toBeNull()
  })

  it("outlines and labels the selected Block", () => {
    const { container } = setup({ selectedId: "b3" })
    expect(
      container.querySelectorAll("[data-canvas-outline=selected]")
    ).toHaveLength(1)
    expect(screen.getByText("Hero")).toBeTruthy()
  })

  it("asks the Admin to move, duplicate and delete that Block", () => {
    const { send } = setup({ selectedId: "b2" })
    fireEvent.click(screen.getByRole("button", { name: "Move up" }))
    fireEvent.click(screen.getByRole("button", { name: "Move down" }))
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(send.mock.calls.map(([request]) => request)).toEqual([
      { type: "move", id: "b2", direction: "up" },
      { type: "move", id: "b2", direction: "down" },
      { type: "duplicate", id: "b2" },
      { type: "delete", id: "b2" },
    ])
  })

  it("cannot move the first Block up, or the last one down", () => {
    const first = setup({ selectedId: "b1" })
    const up = screen.getByRole("button", { name: "Move up" })
    expect((up as HTMLButtonElement).disabled).toBe(true)
    expect(
      (screen.getByRole("button", { name: "Move down" }) as HTMLButtonElement)
        .disabled
    ).toBe(false)
    fireEvent.click(up)
    expect(first.send).not.toHaveBeenCalled()
    first.unmount()

    setup({ selectedId: "b3" })
    expect(
      (screen.getByRole("button", { name: "Move down" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it("moves a region Block within its own region", () => {
    const { send } = setup({
      editable: ["header", "footer"],
      selectedId: "f1",
    })
    // The only Block of the Footer: nowhere to go either way.
    expect(
      (screen.getByRole("button", { name: "Move up" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    expect(
      (screen.getByRole("button", { name: "Move down" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(send).toHaveBeenCalledWith({ type: "delete", id: "f1" })
  })

  it("shows no toolbar for a Block of a locked region, or one that is gone", () => {
    const locked = setup({ editable: ["header", "footer"], selectedId: "b2" })
    expect(toolbar()).toBeNull()
    locked.unmount()

    setup({ selectedId: "gone" })
    expect(toolbar()).toBeNull()
  })

  it("follows the selection to the Block it moves to", () => {
    const { select } = setup({ selectedId: "b2" })
    select("b3")
    expect(
      (screen.getByRole("button", { name: "Move down" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })
})

describe("CanvasOverlay +", () => {
  it("offers a + above and below the hovered Block", () => {
    setup()
    expect(plusButtons()).toHaveLength(0)
    hover(heading("Second"))
    expect(
      plusButtons().map((button) => button.getAttribute("aria-label"))
    ).toEqual(["Add Block above", "Add Block below"])
  })

  it("asks the Admin for an insert at the place the + is", () => {
    const { send } = setup()
    hover(heading("Second"))
    fireEvent.click(screen.getByRole("button", { name: "Add Block above" }))
    fireEvent.click(screen.getByRole("button", { name: "Add Block below" }))
    expect(send.mock.calls.map(([request]) => request)).toEqual([
      { type: "insert-request", region: "page", index: 1 },
      { type: "insert-request", region: "page", index: 2 },
    ])
  })

  it("names the place in a region's own list", () => {
    const { send, container } = setup({ editable: ["header", "footer"] })
    hover(container.querySelector("[data-block-id=f1]")!.firstElementChild!)
    fireEvent.click(screen.getByRole("button", { name: "Add Block below" }))
    expect(send).toHaveBeenCalledWith({
      type: "insert-request",
      region: "footer",
      index: 1,
    })
  })

  it("offers them on the selected Block too, when the pointer is elsewhere", () => {
    setup({ selectedId: "b1" })
    expect(plusButtons()).toHaveLength(2)
  })

  it("does not offer a second + where two Blocks meet", () => {
    const { container } = setup({ selectedId: "b1" })
    stack(container, { b1: [0, 100], b2: [100, 100], b3: [200, 100] })
    hover(heading("Second"))
    // Above b1 (0), between b1 and b2 (1), below b2 (2).
    expect(plusButtons()).toHaveLength(3)
  })

  it("offers a + on an empty Page, named from its visible words first", () => {
    const { send } = setup({ blocks: [] })
    const add = screen.getByRole("button", { name: "Add a Block to the Page" })
    expect(add.textContent?.trim()).toBe("Add a Block")
    fireEvent.click(add)
    expect(send).toHaveBeenCalledWith({
      type: "insert-request",
      region: "page",
      index: 0,
    })
  })

  it("offers none on an empty Page that cannot be edited", () => {
    setup({ blocks: [], editable: ["header"] })
    expect(plusButtons()).toHaveLength(0)
    expect(screen.queryByRole("button", { name: /^Add a Block/ })).toBeNull()
  })
})

describe("CanvasOverlay placement", () => {
  it("draws the outline over the Block's own box", () => {
    const { container } = setup()
    const section = container.querySelector(
      "[data-block-id=b2] > :first-child"
    ) as HTMLElement
    section.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 200,
        width: 300,
        height: 120,
        right: 310,
        bottom: 320,
        x: 10,
        y: 200,
        toJSON() {},
      }) as DOMRect
    act(() => {
      window.dispatchEvent(new Event("resize"))
    })
    hover(heading("Second"))
    const outline = container.querySelector(
      "[data-canvas-outline=hover]"
    ) as HTMLElement
    expect(outline.style.left).toBe("10px")
    expect(outline.style.top).toBe("200px")
    expect(outline.style.width).toBe("300px")
    expect(outline.style.height).toBe("120px")
  })
})

describe("CanvasOverlay in Containers", () => {
  const button = (id: string, label: string) =>
    ({
      id,
      blockType: "button",
      link: { label, href: "/contact" },
      style: "primary",
      align: "start",
    }) as unknown as PageBlock
  const containerOf = (id: string, children: PageBlock[], columns = "1") =>
    ({
      id,
      blockType: "container",
      columns,
      gap: "medium",
      align: "top",
      width: "page",
      background: "default",
      children,
    }) as unknown as PageBlock
  const tree = [
    hero("b1", "First"),
    containerOf("c1", [
      button("x", "Outer button"),
      containerOf("c2", [button("y", "Inner button"), button("z", "Last")]),
    ]),
    hero("b3", "Third"),
  ]
  const link = (name: string) => screen.getByRole("link", { name })
  const disabled = (name: string) =>
    (screen.getByRole("button", { name }) as HTMLButtonElement).disabled

  it("selects the innermost Block that is clicked", () => {
    const { send } = setup({ blocks: tree })
    fireEvent.click(link("Inner button"))
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "select", id: "y" })
    send.mockClear()
    fireEvent.click(link("Outer button"))
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "select", id: "x" })
  })

  it("selects a Container from its own part, outside the Blocks it holds", () => {
    const { send, container } = setup({ blocks: tree })
    fireEvent.click(container.querySelector("[data-block-id=c2] > *")!)
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "select", id: "c2" })
  })

  it("labels a Block in a Container with its path from the Page", () => {
    setup({ blocks: tree })
    hover(link("Inner button"))
    expect(screen.getByText("Container › Container › Button")).toBeTruthy()
    hover(link("Outer button"))
    expect(screen.getByText("Container › Button")).toBeTruthy()
  })

  it("labels the selected Block with its path too", () => {
    setup({ blocks: tree, selectedId: "c2" })
    expect(screen.getByText("Container › Container")).toBeTruthy()
  })

  it("moves a Block within its own Container: first and last are in that list", () => {
    const { send, select } = setup({ blocks: tree, selectedId: "y" })
    expect(disabled("Move up")).toBe(true)
    expect(disabled("Move down")).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Move down" }))
    expect(send).toHaveBeenCalledWith({
      type: "move",
      id: "y",
      direction: "down",
    })

    select("z")
    expect(disabled("Move up")).toBe(false)
    expect(disabled("Move down")).toBe(true)

    select("c2")
    expect(disabled("Move up")).toBe(false)
    expect(disabled("Move down")).toBe(true)
  })

  it("offers a + above and below a Block in a stack, which asks for a Block in its Container", () => {
    const { send } = setup({ blocks: tree })
    hover(link("Inner button"))
    expect(
      plusButtons().map((button) => button.getAttribute("aria-label"))
    ).toEqual(["Add Block above", "Add Block below"])
    fireEvent.click(screen.getByRole("button", { name: "Add Block above" }))
    fireEvent.click(screen.getByRole("button", { name: "Add Block below" }))
    expect(send.mock.calls.map(([request]) => request)).toEqual([
      { type: "insert-request", region: "page", index: 0, parentId: "c2" },
      { type: "insert-request", region: "page", index: 1, parentId: "c2" },
    ])
  })

  it("keeps a + of a Container's Block apart from the Page's at the same place", () => {
    const { container } = setup({ blocks: tree, selectedId: "b1" })
    stack(container, { b1: [0, 100], c1: [140, 300], x: [180, 60] })
    hover(link("Outer button"))
    // b1's two, and the Button's two: index 0 and 1 of c1 are not the Page's.
    expect(plusButtons()).toHaveLength(4)
  })

  it("offers a + before and after a Block beside another, at its sides", () => {
    const { send, container } = setup({
      blocks: [
        containerOf("c1", [button("x", "Left"), button("y", "Right")], "2"),
      ],
    })
    const place = (id: string, left: number) => {
      const section = container.querySelector(
        `[data-block-id=${id}] > :first-child`
      ) as HTMLElement
      section.getBoundingClientRect = () => new DOMRect(left, 100, 200, 80)
    }
    place("x", 0)
    place("y", 240)
    act(() => {
      window.dispatchEvent(new Event("resize"))
    })
    hover(link("Right"))
    const [before, after] = plusButtons()
    expect(before!.getAttribute("aria-label")).toBe("Add Block before")
    expect(after!.getAttribute("aria-label")).toBe("Add Block after")
    expect(before!.style.left).toBe("240px")
    expect(after!.style.left).toBe("440px")
    expect(before!.style.top).toBe("140px")
    fireEvent.click(after!)
    expect(send).toHaveBeenCalledWith({
      type: "insert-request",
      region: "page",
      index: 2,
      parentId: "c1",
    })
  })

  describe("a Container and a Block in it whose edges meet", () => {
    // outer > inner > [A, B], with no room between a Container's edge and
    // its Blocks', as a Container with no background draws them.
    const nested = [
      containerOf("outer", [
        containerOf("inner", [button("a", "A"), button("b", "B")]),
      ]),
    ]
    const layOut = (container: HTMLElement) =>
      stack(container, {
        outer: [100, 200],
        inner: [100, 200],
        a: [100, 80],
        b: [180, 120],
      })
    const at = (button: HTMLElement) =>
      `${button.style.left},${button.style.top}`

    it("offers the hovered Block's + where it meets the selected Container's", () => {
      const { send, container } = setup({ blocks: nested, selectedId: "inner" })
      layOut(container)
      hover(link("A"))
      const places = plusButtons().map(at)
      expect(new Set(places).size).toBe(places.length)
      const above = screen.getAllByRole("button", { name: "Add Block above" })
      expect(above).toHaveLength(1)
      fireEvent.click(above[0]!)
      expect(send).toHaveBeenLastCalledWith({
        type: "insert-request",
        region: "page",
        index: 0,
        parentId: "inner",
      })
    })

    it("offers the hovered Container's + where it meets its selected Block's", () => {
      const { send, container } = setup({ blocks: nested, selectedId: "a" })
      layOut(container)
      hover(container.querySelector("[data-block-id=inner] > *")!)
      const places = plusButtons().map(at)
      expect(new Set(places).size).toBe(places.length)
      fireEvent.click(screen.getByRole("button", { name: "Add Block above" }))
      expect(send).toHaveBeenLastCalledWith({
        type: "insert-request",
        region: "page",
        index: 0,
        parentId: "outer",
      })
    })

    it("offers the hovered Container's + over the selected one it fills", () => {
      const { send, container } = setup({ blocks: nested, selectedId: "outer" })
      layOut(container)
      hover(container.querySelector("[data-block-id=inner] > *")!)
      expect(plusButtons()).toHaveLength(2)
      fireEvent.click(screen.getByRole("button", { name: "Add Block below" }))
      expect(send).toHaveBeenLastCalledWith({
        type: "insert-request",
        region: "page",
        index: 1,
        parentId: "outer",
      })
    })
  })

  it("offers Add a Block in an empty Container, at any depth", () => {
    const { send } = setup({
      blocks: [
        containerOf("c1", [button("x", "One"), containerOf("inner", [])]),
        containerOf("top", []),
      ],
    })
    // Named from its visible words first, so they can be spoken to it.
    const adds = screen.getAllByRole("button", {
      name: "Add a Block to this Container",
    })
    expect(adds).toHaveLength(2)
    expect(adds[0]!.textContent?.trim()).toBe("Add a Block")
    fireEvent.click(adds[0]!)
    fireEvent.click(adds[1]!)
    expect(send.mock.calls.map(([request]) => request)).toEqual([
      { type: "insert-request", region: "page", index: 0, parentId: "inner" },
      { type: "insert-request", region: "page", index: 0, parentId: "top" },
    ])
  })

  it("offers none in an empty Container that cannot be edited", () => {
    setup({ blocks: [containerOf("c1", [])], editable: ["header"] })
    expect(screen.queryByRole("button", { name: /^Add a Block/ })).toBeNull()
  })

  it("scrolls to a Block in a Container that becomes selected", () => {
    const spy = vi.fn()
    Element.prototype.scrollIntoView = spy
    try {
      const { container } = setup({ blocks: tree, selectedId: "z" })
      expect(spy.mock.contexts[0]).toBe(
        container.querySelector("[data-block-id=z]")
      )
    } finally {
      // @ts-expect-error -- jsdom has none.
      delete Element.prototype.scrollIntoView
    }
  })
})
