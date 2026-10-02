// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import type { BlockValues } from "../pageForm"
import { EditorProvider, useEditor } from "./EditorProvider"
import { blockHint, moveForDrop, OutlinePanel } from "./OutlinePanel"
import type { EditorDocument, PageDocument } from "./state"

const hero = (id: string, heading: string): BlockValues => ({
  id,
  blockType: "hero",
  heading,
  subheading: "",
  image: null,
  cta: { label: "", href: "" },
})
const text = (id: string, markdown: string): BlockValues => ({
  id,
  blockType: "richText",
  markdown,
})
const cta = (id: string, heading: string): BlockValues => ({
  id,
  blockType: "callToAction",
  heading,
  body: "",
  button: { label: "", href: "" },
  style: "primary",
})

const pageDoc = (): EditorDocument => ({
  kind: "page",
  title: "Home",
  path: "/",
  layout: { mode: "default" },
  blocks: [
    hero("b1", "Earn more from your home"),
    text("b2", "# About us\n\nWe look after homes."),
    cta("b3", "Get in touch"),
  ],
  seo: { title: "", description: "", image: null },
})

const layoutDoc = (): EditorDocument => ({
  kind: "layout",
  name: "Main",
  paths: ["/"],
  isDefault: true,
  header: [hero("h1", "Welcome"), text("h2", "Sale on now")],
  footer: [text("f1", "Contact us")],
})

const themeDoc = (): EditorDocument => ({
  kind: "theme",
  inputs: {} as never,
})

/** Shows what the editor holds, so a test can see what the Outline changed. */
function Probe() {
  const { doc, selectedId, canUndo } = useEditor()
  const order = (blocks: BlockValues[]) => blocks.map((b) => b.id).join(",")
  return (
    <>
      <output aria-label="page order">
        {doc.kind === "page" ? order(doc.blocks) : ""}
      </output>
      <output aria-label="header order">
        {doc.kind === "layout" ? order(doc.header) : ""}
      </output>
      <output aria-label="selected">{selectedId ?? "none"}</output>
      <output aria-label="can undo">{String(canUndo)}</output>
    </>
  )
}

function mount(
  doc: EditorDocument,
  props: Partial<Parameters<typeof OutlinePanel>[0]> = {}
) {
  return render(
    <EditorProvider initial={doc}>
      <OutlinePanel {...props} />
      <Probe />
    </EditorProvider>
  )
}

afterEach(cleanup)

const value = (name: string) => screen.getByLabelText(name).textContent
const group = (name: string) => screen.getByRole("group", { name })
const itemNames = (scope: HTMLElement) =>
  within(scope)
    .queryAllByRole("treeitem")
    .map((el) => el.getAttribute("aria-label"))

describe("the tree", () => {
  it("shows the Header, Page and Footer groups, in that order", () => {
    mount(pageDoc())
    const headings = screen
      .getAllByRole("heading")
      .map((heading) => heading.textContent)
    expect(headings).toEqual(["Header", "Page", "Footer"])
  })

  it("lists the Page's Blocks by catalogue label, in order, with a text hint", () => {
    mount(pageDoc())
    const page = group("Page")
    expect(itemNames(page)).toEqual(["Hero", "Rich text", "Call to action"])
    const [first, second] = within(page).getAllByRole("treeitem")
    expect(first!.textContent).toContain("Earn more from your home")
    expect(second!.textContent).toContain("About us")
  })

  it("lists a Layout's Header and Footer Blocks, and leaves the Page unavailable", () => {
    mount(layoutDoc())
    expect(itemNames(group("Header"))).toEqual(["Hero", "Rich text"])
    expect(itemNames(group("Footer"))).toEqual(["Rich text"])
    expect(itemNames(group("Page"))).toEqual([])
  })

  it("says so when a region has no Blocks", () => {
    mount({ ...(pageDoc() as PageDocument), blocks: [] })
    expect(within(group("Page")).getByText(/No Blocks yet/)).toBeTruthy()
  })

  it("has nothing to list in Theme mode", () => {
    mount(themeDoc())
    expect(screen.queryAllByRole("treeitem")).toEqual([])
    expect(screen.getByText(/no Blocks/i)).toBeTruthy()
  })
})

describe("selecting", () => {
  it("selects the Block and tells the caller, so the canvas can scroll to it", async () => {
    const onSelectBlock = vi.fn()
    mount(pageDoc(), { onSelectBlock })
    await userEvent.click(screen.getByRole("treeitem", { name: "Rich text" }))
    expect(value("selected")).toBe("b2")
    expect(onSelectBlock).toHaveBeenCalledWith("b2")
    expect(
      screen
        .getByRole("treeitem", { name: "Rich text" })
        .getAttribute("aria-selected")
    ).toBe("true")
  })

  it("scrolls the selected row into view when the Block is selected elsewhere", () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    function Pick() {
      const { select } = useEditor()
      return <button onClick={() => select("b3")}>pick b3</button>
    }
    render(
      <EditorProvider initial={pageDoc()}>
        <OutlinePanel />
        <Pick />
      </EditorProvider>
    )
    expect(scroll).not.toHaveBeenCalled()
    act(() => screen.getByText("pick b3").click())
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toBe(
      screen.getByRole("treeitem", { name: "Call to action" })
    )
    // @ts-expect-error -- jsdom has none.
    delete Element.prototype.scrollIntoView
  })

  it("selects with Enter and moves between rows with the arrow keys", async () => {
    mount(pageDoc())
    screen.getByRole("treeitem", { name: "Hero" }).focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(document.activeElement).toBe(
      screen.getByRole("treeitem", { name: "Rich text" })
    )
    await userEvent.keyboard("{Enter}")
    expect(value("selected")).toBe("b2")
    await userEvent.keyboard("{ArrowUp}{ArrowUp}")
    expect(document.activeElement).toBe(
      screen.getByRole("treeitem", { name: "Hero" })
    )
  })
})

describe("reordering with the keyboard", () => {
  it("moves a Block up and down with its buttons, as undoable steps", async () => {
    mount(pageDoc())
    expect(value("can undo")).toBe("false")
    await userEvent.click(
      screen.getByRole("button", { name: "Move Hero down" })
    )
    expect(value("page order")).toBe("b2,b1,b3")
    await userEvent.click(
      screen.getByRole("button", { name: "Move Call to action up" })
    )
    expect(value("page order")).toBe("b2,b3,b1")
    expect(value("can undo")).toBe("true")
  })

  it("cannot move the first Block up or the last Block down", () => {
    mount(pageDoc())
    const up = screen.getByRole("button", { name: "Move Hero up" })
    const down = screen.getByRole("button", {
      name: "Move Call to action down",
    })
    expect((up as HTMLButtonElement).disabled).toBe(true)
    expect((down as HTMLButtonElement).disabled).toBe(true)
  })

  it("moves Blocks within their own region", async () => {
    mount(layoutDoc())
    await userEvent.click(
      within(group("Header")).getByRole("button", { name: "Move Hero down" })
    )
    expect(value("header order")).toBe("h2,h1")
  })

  it("keeps focus on the button that was used, and announces the move", async () => {
    mount(pageDoc())
    await userEvent.click(
      screen.getByRole("button", { name: "Move Rich text down" })
    )
    expect(value("page order")).toBe("b1,b3,b2")
    // It is last now, so "down" is off and focus goes to "up".
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Move Rich text up" })
    )
    expect(screen.getByText("Rich text moved to position 3 of 3.")).toBeTruthy()
  })

  it("keeps focus on the same button while it can still be used", async () => {
    mount(pageDoc())
    await userEvent.click(
      screen.getByRole("button", { name: "Move Hero down" })
    )
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Move Hero down" })
    )
  })
})

describe("locked regions", () => {
  it("shows a Page's Layout Blocks, but they cannot be selected or moved", async () => {
    mount(pageDoc(), {
      inherited: { header: [hero("h1", "Welcome")], footer: [] },
    })
    const header = group("Header")
    const [row] = within(header).getAllByRole("treeitem")
    expect(row!.getAttribute("aria-disabled")).toBe("true")
    expect(within(header).queryAllByRole("button")).toEqual([])
    await userEvent.click(row!)
    expect(value("selected")).toBe("none")
    expect(within(header).getByText(/From the Layout/)).toBeTruthy()
  })

  it("shows the Footer as locked even when the Layout gave none", () => {
    mount(pageDoc())
    expect(within(group("Footer")).getByText(/From the Layout/)).toBeTruthy()
    expect(within(group("Footer")).queryAllByRole("button")).toEqual([])
  })

  it("locks the Page group in Layout mode", () => {
    mount(layoutDoc())
    const page = group("Page")
    expect(within(page).getByText(/Each Page has its own Blocks/)).toBeTruthy()
    expect(within(page).queryAllByRole("button")).toEqual([])
  })

  it("leaves the Layout's regions movable in Layout mode", () => {
    mount(layoutDoc())
    expect(
      within(group("Header")).getByRole("button", { name: "Move Hero down" })
    ).toBeTruthy()
  })
})

describe("drag and drop", () => {
  const blocks = [hero("a", "A"), text("b", "B"), cta("c", "C")]

  it("moves the dragged Block to where it was dropped", () => {
    expect(moveForDrop(blocks, "a", "c")).toEqual({ from: 0, to: 2 })
    expect(moveForDrop(blocks, "c", "a")).toEqual({ from: 2, to: 0 })
  })

  it("does nothing for a drop on itself, outside the list or from elsewhere", () => {
    expect(moveForDrop(blocks, "a", "a")).toBeNull()
    expect(moveForDrop(blocks, "a", null)).toBeNull()
    expect(moveForDrop(blocks, "a", "elsewhere")).toBeNull()
    expect(moveForDrop(blocks, "elsewhere", "a")).toBeNull()
  })
})

describe("the text hint", () => {
  it("uses the heading, else the first words of the text", () => {
    expect(blockHint(hero("x", "  Big news "))).toBe("Big news")
    expect(blockHint(text("x", "## Hello **world**\n\nmore"))).toBe(
      "Hello world"
    )
    expect(blockHint(text("x", ""))).toBe("")
  })

  it("copes with a Block whose optional heading is empty (null when stored)", () => {
    const stored = { ...hero("x", ""), heading: null } as unknown as BlockValues
    expect(blockHint(stored)).toBe("")
  })

  it("is cut short when long", () => {
    expect(blockHint(hero("x", "a".repeat(100))).length).toBeLessThanOrEqual(60)
  })
})

describe("adding a Block with +", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => {}
  })
  const plus = (region: string) =>
    screen.queryByRole("button", { name: `Add a Block to the ${region}` })

  it("has one + for each region the open document owns", () => {
    mount(pageDoc())
    expect(plus("Page")).toBeTruthy()
    expect(plus("Header")).toBeNull()
    expect(plus("Footer")).toBeNull()
    cleanup()
    mount(layoutDoc())
    expect(plus("Header")).toBeTruthy()
    expect(plus("Footer")).toBeTruthy()
    expect(plus("Page")).toBeNull()
    cleanup()
    mount(themeDoc())
    expect(screen.queryByRole("button", { name: /^Add a Block/ })).toBeNull()
  })

  it("opens the Block picker, then adds the chosen Block to the end and selects it", async () => {
    const user = userEvent.setup()
    mount(pageDoc())
    await user.click(plus("Page")!)
    await user.click(screen.getByRole("option", { name: /^FAQ\b/ }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(itemNames(group("Page"))).toEqual([
      "Hero",
      "Rich text",
      "Call to action",
      "FAQ",
    ])
    const order = value("page order")!.split(",")
    expect(value("selected")).toBe(order[3])
    expect(value("can undo")).toBe("true")
  })

  it("adds to an empty region", async () => {
    const user = userEvent.setup()
    mount({ ...(pageDoc() as PageDocument), blocks: [] })
    await user.click(plus("Page")!)
    await user.click(screen.getByRole("option", { name: /^Hero\b/ }))
    expect(itemNames(group("Page"))).toEqual(["Hero"])
  })

  it("offers a Header only its own Blocks", async () => {
    const user = userEvent.setup()
    mount(layoutDoc())
    await user.click(plus("Header")!)
    expect(screen.getAllByRole("option")).toHaveLength(4)
    expect(screen.queryByRole("option", { name: /^Hero\b/ })).toBeNull()
    await user.click(screen.getByRole("option", { name: /^Utility strip\b/ }))
    expect(value("header order")!.split(",")).toHaveLength(3)
  })
})

describe("accessibility", () => {
  it.each([
    ["page", pageDoc],
    ["layout", layoutDoc],
    ["theme", themeDoc],
  ])("has no axe violations in %s mode", async (_, make) => {
    const { container } = mount(make(), {
      inherited: { header: [hero("lh", "Welcome")], footer: [] },
    })
    const results = await axe.run(
      { include: [container] },
      {
        // jsdom has no layout or paint, so contrast is checked in the browser.
        rules: { "color-contrast": { enabled: false } },
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      }
    )
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})

describe("Blocks in a Container", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => {}
  })
  const box = (id: string, children: BlockValues[], columns = "1") =>
    ({
      id,
      blockType: "container",
      columns,
      children,
    }) as unknown as BlockValues
  const nestedDoc = (): EditorDocument => ({
    ...(pageDoc() as PageDocument),
    blocks: [
      hero("b1", "Welcome"),
      box("c1", [text("t1", "Left"), box("c2", [cta("x1", "Book now")])], "2"),
    ],
  })
  const childOrder = () => value("child order")!.split(";").filter(Boolean)
  function ChildProbe() {
    const { doc } = useEditor()
    const walk = (blocks: BlockValues[]): string[] =>
      blocks.flatMap((b) => {
        const children = (b as { children?: BlockValues[] }).children
        return children
          ? [
              `${b.id}:${children.map((c) => c.id).join(",")}`,
              ...walk(children),
            ]
          : []
      })
    return (
      <output aria-label="child order">
        {doc.kind === "page" ? walk(doc.blocks).join(";") : ""}
      </output>
    )
  }
  const mountNested = (props: Parameters<typeof OutlinePanel>[0] = {}) =>
    render(
      <EditorProvider initial={nestedDoc()}>
        <OutlinePanel {...props} />
        <Probe />
        <ChildProbe />
      </EditorProvider>
    )

  it("lists a Container's Blocks under it, a level further in", () => {
    mountNested()
    const rows = within(group("Page")).getAllByRole("treeitem")
    expect(
      rows.map((row) => [
        row.getAttribute("aria-label"),
        row.getAttribute("aria-level"),
      ])
    ).toEqual([
      ["Hero", "1"],
      ["Container", "1"],
      ["Rich text", "2"],
      ["Container", "2"],
      ["Call to action", "3"],
    ])
  })

  it("selects a Block in a Container, with a click or from the keyboard", async () => {
    const onSelectBlock = vi.fn()
    mountNested({ onSelectBlock })
    await userEvent.click(
      screen.getByRole("treeitem", { name: "Call to action" })
    )
    expect(value("selected")).toBe("x1")
    expect(onSelectBlock).toHaveBeenCalledWith("x1")
    expect(
      screen
        .getByRole("treeitem", { name: "Call to action" })
        .getAttribute("tabindex")
    ).toBe("0")
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{Enter}")
    expect(value("selected")).toBe("t1")
  })

  it("moves a Block within its Container with its buttons", async () => {
    mountNested()
    await userEvent.click(
      screen.getByRole("button", { name: "Move Rich text down" })
    )
    expect(childOrder()).toEqual(["c1:c2,t1", "c2:x1"])
    expect(value("page order")).toBe("b1,c1")
    expect(
      (
        screen.getByRole("button", {
          name: "Move Call to action up",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  })

  it("adds a Block to a Container with its +, offering only what fits there", async () => {
    const user = userEvent.setup()
    mountNested()
    const plus = screen.getAllByRole("button", {
      name: "Add a Block to this Container",
    })
    expect(plus).toHaveLength(2)
    // The outer Container has columns: a Hero needs the page's width.
    await user.click(plus[0]!)
    expect(screen.queryByRole("option", { name: /^Hero\b/ })).toBeNull()
    await user.click(screen.getByRole("option", { name: /^Button\b/ }))
    const [outer] = childOrder()
    const added = outer!.split(":")[1]!.split(",")[2]!
    expect(outer).toMatch(/^c1:t1,c2,/)
    expect(value("selected")).toBe(added)
    expect(
      screen
        .getByRole("treeitem", { name: "Button" })
        .getAttribute("aria-level")
    ).toBe("2")
  })

  it("offers no Container in a Container three levels deep", async () => {
    const user = userEvent.setup()
    render(
      <EditorProvider
        initial={{
          ...(pageDoc() as PageDocument),
          blocks: [box("l1", [box("l2", [box("l3", [])])])],
        }}
      >
        <OutlinePanel />
      </EditorProvider>
    )
    const plus = screen.getAllByRole("button", {
      name: "Add a Block to this Container",
    })
    await user.click(plus[1]!)
    expect(screen.getByRole("option", { name: /^Container\b/ })).toBeTruthy()
    await user.keyboard("{Escape}")
    await user.click(plus[2]!)
    expect(screen.queryByRole("option", { name: /^Container\b/ })).toBeNull()
    expect(screen.getByRole("option", { name: /^Hero\b/ })).toBeTruthy()
  })

  it("removes a Block from its Container, as an undoable step", async () => {
    mountNested()
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Rich text" })
    )
    expect(childOrder()).toEqual(["c1:c2", "c2:x1"])
    expect(value("can undo")).toBe("true")
    // The Page's own Blocks keep the Outline they had: no Remove button.
    expect(screen.queryByRole("button", { name: "Remove Hero" })).toBeNull()
  })

  it("leaves the Outline open when a row's own buttons are used, so focus and the announcement stay", async () => {
    const user = userEvent.setup()
    // The editor opens the Block tab, unmounting the Outline, on a selection.
    const onSelectBlock = vi.fn()
    mountNested({ onSelectBlock })
    await user.click(screen.getByRole("button", { name: "Move Hero down" }))
    await user.click(
      screen.getByRole("button", { name: "Move Rich text down" })
    )
    await user.click(
      screen.getAllByRole("button", {
        name: "Add a Block to this Container",
      })[1]!
    )
    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button", { name: "Remove Rich text" }))
    expect(onSelectBlock).not.toHaveBeenCalled()
    expect(value("selected")).toBe("none")
    expect(document.activeElement).toBe(
      screen.getAllByRole("treeitem", { name: "Container" })[0]
    )
    expect(screen.getByText("Rich text removed.")).toBeTruthy()
  })

  it("collapses and expands a Container with its button, hiding its Blocks", async () => {
    mountNested()
    const outer = () =>
      screen.getAllByRole("treeitem", { name: "Container" })[0]!
    expect(outer().getAttribute("aria-expanded")).toBe("true")
    await userEvent.click(
      within(outer()).getByRole("button", { name: "Collapse Container" })
    )
    expect(outer().getAttribute("aria-expanded")).toBe("false")
    expect(itemNames(group("Page"))).toEqual(["Hero", "Container"])
    // Collapsing is not a selection, and not an edit.
    expect(value("selected")).toBe("none")
    expect(value("can undo")).toBe("false")
    await userEvent.click(
      within(outer()).getByRole("button", { name: "Expand Container" })
    )
    expect(itemNames(group("Page"))).toEqual([
      "Hero",
      "Container",
      "Rich text",
      "Container",
      "Call to action",
    ])
  })

  it("keeps an inner Container's state when its outer one opens again", async () => {
    mountNested()
    const [outer, inner] = screen.getAllByRole("button", {
      name: "Collapse Container",
    })
    await userEvent.click(inner!)
    await userEvent.click(outer!)
    await userEvent.click(
      screen.getByRole("button", { name: "Expand Container" })
    )
    expect(itemNames(group("Page"))).toEqual([
      "Hero",
      "Container",
      "Rich text",
      "Container",
    ])
  })

  it("has no toggle on an empty Container", () => {
    render(
      <EditorProvider
        initial={{ ...(pageDoc() as PageDocument), blocks: [box("e1", [])] }}
      >
        <OutlinePanel />
      </EditorProvider>
    )
    const row = screen.getByRole("treeitem", { name: "Container" })
    expect(row.hasAttribute("aria-expanded")).toBe(false)
    expect(within(row).queryByRole("button", { name: /Collapse|Expand/ })).toBe(
      null
    )
  })

  it("collapses, expands and walks in and out with the arrow keys", async () => {
    mountNested()
    const outer = () =>
      screen.getAllByRole("treeitem", { name: "Container" })[0]!
    outer().focus()
    // Right on an open Container goes to its first Block, Left back up.
    await userEvent.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(
      screen.getByRole("treeitem", { name: "Rich text" })
    )
    await userEvent.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(outer())
    // Left on an open Container closes it, Right opens it again.
    await userEvent.keyboard("{ArrowLeft}")
    expect(outer().getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(outer())
    await userEvent.keyboard("{ArrowRight}")
    expect(outer().getAttribute("aria-expanded")).toBe("true")
    expect(document.activeElement).toBe(outer())
    // Left from a deeper Block goes to its own Container.
    screen.getByRole("treeitem", { name: "Call to action" }).focus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(
      screen.getAllByRole("treeitem", { name: "Container" })[1]
    )
    // Home and End go to the first and the last row.
    await userEvent.keyboard("{End}")
    expect(document.activeElement).toBe(
      screen.getByRole("treeitem", { name: "Call to action" })
    )
    await userEvent.keyboard("{Home}")
    expect(document.activeElement).toBe(
      screen.getByRole("treeitem", { name: "Hero" })
    )
  })

  it("opens the Containers around a Block selected elsewhere, and scrolls to it", async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    function Pick() {
      const { select } = useEditor()
      return <button onClick={() => select("x1")}>pick x1</button>
    }
    render(
      <EditorProvider initial={nestedDoc()}>
        <OutlinePanel />
        <Pick />
      </EditorProvider>
    )
    await userEvent.click(
      screen.getAllByRole("button", { name: "Collapse Container" })[0]!
    )
    expect(screen.queryByRole("treeitem", { name: "Call to action" })).toBe(
      null
    )
    act(() => screen.getByText("pick x1").click())
    const row = screen.getByRole("treeitem", { name: "Call to action" })
    expect(row.getAttribute("aria-selected")).toBe("true")
    expect(row.getAttribute("tabindex")).toBe("0")
    expect(scroll.mock.contexts.at(-1)).toBe(row)
    // Collapsing another Container later does not scroll again.
    const calls = scroll.mock.calls.length
    await userEvent.click(
      screen.getAllByRole("button", { name: "Collapse Container" })[1]!
    )
    expect(scroll.mock.calls.length).toBe(calls)
    Element.prototype.scrollIntoView = () => {}
  })

  it("puts a hidden selected Block's tab stop on a row that shows", async () => {
    mountNested()
    await userEvent.click(
      screen.getByRole("treeitem", { name: "Call to action" })
    )
    await userEvent.click(
      screen.getAllByRole("button", { name: "Collapse Container" })[0]!
    )
    const tabbable = within(group("Page"))
      .getAllByRole("treeitem")
      .filter((row) => row.getAttribute("tabindex") === "0")
    expect(tabbable.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Container",
    ])
  })

  it("has no axe violations, open or collapsed", async () => {
    const { container } = mountNested()
    await userEvent.click(
      screen.getAllByRole("button", { name: "Collapse Container" })[1]!
    )
    const results = await axe.run(
      { include: [container] },
      {
        rules: { "color-contrast": { enabled: false } },
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      }
    )
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })

  it("has no axe violations", async () => {
    const { container } = mountNested()
    const results = await axe.run(
      { include: [container] },
      {
        rules: { "color-contrast": { enabled: false } },
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      }
    )
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})
