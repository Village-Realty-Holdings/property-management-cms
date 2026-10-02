// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import { catalogueEntries } from "../../blocks/catalogue"
import { backgrounds } from "../../fields/background"
import type { ContainerBlock as ContainerBlockData } from "../../payload-types"
import { compileUiCss } from "../../test/uiCss"
import { Block } from "."
import { sampleFor } from "./samples"
import { embeddedBand, embeddedBox, sectionY } from "./types"

afterEach(cleanup)

type Child = NonNullable<ContainerBlockData["children"]>[number]

/** A Container holding `children`, a stack unless `over` says otherwise. */
const containerOf = (
  children: unknown[],
  over: Partial<ContainerBlockData> = {}
): ContainerBlockData => ({
  blockType: "container",
  columns: "1",
  gap: "medium",
  align: "top",
  width: "page",
  background: "default",
  ...over,
  children: children as Child[],
})

const draw = (block: ContainerBlockData, editing = false) =>
  render(<Block block={block} index={1} editing={editing} />).container

const markOf = (root: Element) => root.querySelector("[data-container]")!
const gridOf = (root: Element) => markOf(root).firstElementChild!

/** WCAG 2.2 AA violations; contrast is left to the browser (e2e/7-container-blocks). */
async function violations(element: HTMLElement) {
  const results = await axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: { "color-contrast": { enabled: false } },
  })
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.html),
  }))
}

/** Whether a Rich text under `root` draws its links in the surface's text colour. */
const linksInherit = (root: Element) =>
  root.querySelector("[class*='[&_a]:text-inherit']") !== null

const richText = sampleFor("richText")
const ownerBand = sampleFor("ownerBand")
const hero = { ...sampleFor("hero"), image: null }

describe("<ContainerBlock>", () => {
  it("renders nothing on the Site when it holds no Blocks", () => {
    expect(draw(containerOf([])).innerHTML).toBe("")
    expect(draw({ ...containerOf([]), children: null }).innerHTML).toBe("")
  })

  it("is a placeholder in the Visual Editor when it holds no Blocks", () => {
    const root = draw(containerOf([]), true)
    expect(root.textContent).toContain("Add a Block")
    expect(root.querySelector("[data-block-type]")).not.toBeNull()
  })

  it("is a band like a Block's section: its background, the Theme's padding, the page-width box", () => {
    const band = draw(
      containerOf([richText], { background: "muted" })
    ).firstElementChild!
    expect(band.className).toContain("bg-muted")
    for (const name of sectionY.split(" "))
      expect(band.className).toContain(name)
    expect(band.firstElementChild!.className).toContain("max-w-7xl")
  })

  it("marks the Blocks it holds, and nothing outside its own box", () => {
    const root = draw(containerOf([richText]))
    const mark = markOf(root)
    expect(mark.parentElement!.className).toContain("max-w-7xl")
    expect(mark.querySelector("section")).not.toBeNull()
    expect(root.querySelectorAll("[data-container]")).toHaveLength(1)
  })

  it.each([
    ["1", []],
    ["2", ["@sm:grid-cols-2"]],
    ["3", ["@sm:grid-cols-2", "@3xl:grid-cols-3"]],
    ["4", ["@sm:grid-cols-2", "@5xl:grid-cols-4"]],
  ] as const)(
    "%s columns are one on a phone, counted against its own width",
    (count, classes) => {
      const root = draw(containerOf([richText, ownerBand], { columns: count }))
      expect(markOf(root).className).toContain("@container")
      const grid = gridOf(root)
      expect(
        grid.className.split(" ").filter((c) => c.includes("cols"))
      ).toEqual(["grid-cols-1", ...classes])
      expect(grid.children).toHaveLength(2)
    }
  )

  it("sets the gap from the Theme's density, and the cells' vertical alignment", () => {
    const classOf = (over: Partial<ContainerBlockData>) =>
      gridOf(draw(containerOf([richText], over))).className
    expect(classOf({ gap: "small" })).toContain("(--section-y)*0.4")
    expect(classOf({ gap: "medium" })).toContain("(--section-y)*0.8")
    expect(classOf({ gap: "large" })).toContain("(--section-y)*1.2")
    expect(classOf({ align: "top" })).toContain("items-start")
    expect(classOf({ align: "centre" })).toContain("items-center")
    expect(classOf({ align: "stretch" })).toContain("items-stretch")
  })

  it("holds its Blocks at reading width when asked", () => {
    expect(markOf(draw(containerOf([richText]))).className).not.toContain(
      "max-w"
    )
    expect(
      markOf(draw(containerOf([richText], { width: "reading" }))).className
    ).toContain("max-w-3xl")
  })

  it("gives each Block a cell that can't be pushed wider, and that takes no room when the Block renders nothing", () => {
    const empty = { ...sampleFor("callToAction"), heading: " " }
    const cells = [...gridOf(draw(containerOf([richText, empty]))).children]
    expect(cells).toHaveLength(2)
    for (const cell of cells) {
      expect(cell.className).toContain("min-w-0")
      expect(cell.className).toContain("empty:hidden")
      expect(cell.className).toContain("@container")
    }
    expect(cells[1]!.innerHTML).toBe("")
  })

  it.each(backgrounds)(
    "on the %s background, draws its Blocks' text, links and buttons for that surface",
    (background) => {
      const root = draw(
        containerOf([richText, ownerBand, hero], { background })
      )
      const coloured = background === "primary" || background === "dark"
      // Rich text links take the surface's text colour on a coloured one.
      expect(linksInherit(root)).toBe(coloured)
      // A button's focus ring is the surface's, or the page's own.
      const rings = [...root.querySelectorAll("a[class*='inline-flex']")].map(
        (a) =>
          a.className.includes("ring-offset-primary")
            ? "primary"
            : a.className.includes("ring-offset-surface-dark")
              ? "dark"
              : "page"
      )
      expect(rings).toEqual(Array(2).fill(coloured ? background : "page"))
    }
  )

  it("ignores the background of a Block it holds", () => {
    const root = draw(
      containerOf([{ ...richText, background: "dark" }], {
        background: "muted",
      })
    )
    const section = root.querySelector("section")!
    expect(section.className).toContain("bg-muted")
    expect(section.className).not.toContain("surface-dark")
    expect(linksInherit(section)).toBe(false)
  })

  it("inside another Container paints only a background of its own, as a card, and passes the surface on", () => {
    const inner = (background: ContainerBlockData["background"]) =>
      containerOf([richText], { background })
    const root = draw(
      containerOf([inner("default"), inner("muted")], { background: "dark" })
    )
    const [plain, painted] = [...gridOf(root).children].map(
      (cell) => cell.firstElementChild!
    )
    expect(plain!.className).toBe("")
    expect(linksInherit(plain!)).toBe(true)
    expect(painted!.className).toContain("bg-muted")
    expect(painted!.className).toContain("rounded-(--card-radius)")
    expect(painted!.className).not.toContain("--section-y")
    expect(linksInherit(painted!)).toBe(false)
    // Only the outer Container holds the page-width box.
    expect(root.innerHTML.match(/max-w-7xl/g)).toHaveLength(
      1 + root.querySelectorAll("section").length
    )
  })

  it("shows its Blocks in the Visual Editor as the Site draws them: not editable there yet", () => {
    const block = containerOf([sampleFor("callToAction")])
    const site = draw(block).innerHTML
    cleanup()
    const frame = draw(block, true).firstElementChild!
    expect(frame.getAttribute("data-block-type")).toBe("container")
    expect(frame.innerHTML).toBe(site)
    expect(frame.querySelector("[data-editable-field]")).toBeNull()
  })
})

describe("a Block inside a Container", () => {
  const inside = catalogueEntries.filter(
    (entry) => entry.blockType !== "container"
  )

  it.each(inside.map((entry) => [entry.label, entry] as const))(
    "%s renders from its sample in a one-column Container, as a named region, and passes axe",
    async (_label, entry) => {
      const root = draw(containerOf([sampleFor(entry.blockType)]))
      const section = markOf(root).querySelector("section")
      expect(section).not.toBeNull()
      expect(
        section!.getAttribute("aria-labelledby") ??
          section!.getAttribute("aria-label")
      ).toBeTruthy()
      expect(await violations(root)).toEqual([])
    }
  )

  it.each(inside.map((entry) => [entry.label, entry] as const))(
    "%s gives up its band and its side padding: only the Container pads",
    (_label, entry) => {
      // A Hero's photo is its own: see the Heroes below. An Image is its image.
      const sample =
        entry.blockType === "image"
          ? sampleFor("image")
          : { ...sampleFor(entry.blockType), image: null }
      const root = draw(containerOf([sample]))
      const section = markOf(root).querySelector("section")!
      for (const name of embeddedBand.split(" "))
        expect(section.className).toContain(name)
      // Every page-width box under the mark drops its side padding.
      const boxes = [...markOf(root).querySelectorAll("[class*='max-w-7xl']")]
      expect(boxes.length).toBeGreaterThan(0)
      for (const box of boxes) expect(box.className).toContain(embeddedBox)
    }
  )

  it.each(["hero", "searchHero"] as const)(
    "a %s without a photo takes the Container's colours, and has no glow or padding of its own",
    (blockType) => {
      const sample = { ...sampleFor(blockType), image: null }
      const section = markOf(draw(containerOf([sample]))).querySelector(
        "section"
      )!
      expect(section.className).toContain("in-data-container:text-inherit!")
      expect(section.querySelector("[aria-hidden]")!.className).toContain(
        "in-data-container:hidden"
      )
      const box = section.querySelector("[class*='max-w-7xl']")!
      expect(box.className).toContain("in-data-container:py-0!")
    }
  )

  it.each(["hero", "searchHero"] as const)(
    "a %s with a photo keeps it, as a card with its own padding",
    (blockType) => {
      const section = markOf(
        draw(containerOf([sampleFor(blockType)]))
      ).querySelector("section")!
      expect(section.querySelector("img")).not.toBeNull()
      expect(section.className).toContain("bg-surface-dark")
      expect(section.className).not.toContain("bg-transparent")
      expect(section.className).toContain(
        "in-data-container:rounded-(--card-radius)"
      )
      const box = section.querySelector("[class*='max-w-7xl']")!
      expect(box.className).toContain("in-data-container:p-6!")
      expect(box.className).not.toContain("in-data-container:px-0!")
    }
  )

  it("the classes that take a band away apply under the mark only, over the breakpoint padding", async () => {
    const css = await compileUiCss([
      ...embeddedBand.split(" "),
      embeddedBox,
      ...sectionY.split(" "),
    ])
    const rule = (name: string) => {
      const start = css.indexOf(`.${name.replace(/[:!]/g, "\\$&")} {`)
      expect(start, name).toBeGreaterThan(-1)
      return css.slice(start, css.indexOf("\n  }\n", start))
    }
    for (const [name, declaration] of [
      ["in-data-container:py-0!", /padding-block: [^;]*0\) !important/],
      ["in-data-container:px-0!", /padding-inline: [^;]*0\) !important/],
      [
        "in-data-container:bg-transparent!",
        /background-color: transparent !important/,
      ],
    ] as const) {
      expect(rule(name)).toContain(":where(*[data-container]) &")
      expect(rule(name)).toMatch(declaration)
    }
  })
})
