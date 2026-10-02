// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import { catalogueEntries } from "../../blocks/catalogue"
import type { ContainerBlock as ContainerBlockData } from "../../payload-types"
import { Blocks } from "."
import { sampleFor } from "./samples"
import { blockId, isFirstOnPage, placeOf, type PageBlock } from "./types"

afterEach(cleanup)

type Child = NonNullable<ContainerBlockData["children"]>[number]

const containerOf = (children: unknown[]): ContainerBlockData => ({
  blockType: "container",
  columns: "1",
  gap: "medium",
  align: "top",
  width: "page",
  background: "default",
  children: children as Child[],
})

/** Every Block's sample but the Container's. */
const everyBlock = (): PageBlock[] =>
  catalogueEntries
    .filter((entry) => entry.blockType !== "container")
    .map((entry) => sampleFor(entry.blockType))

/** Every Block on the Page, and again at each of the three depths. */
const atEveryDepth = (): PageBlock[] => [
  ...everyBlock(),
  containerOf([
    ...everyBlock(),
    containerOf([...everyBlock(), containerOf(everyBlock())]),
  ]),
]

describe("a Block's place", () => {
  const at = (index: number, within?: number[]) => ({ index, within })

  it("names its ids by its path from the Page down", () => {
    expect(blockId(at(1), "heading")).toBe("block-1-heading")
    expect(blockId(at(2, [1, 0]), "heading")).toBe("block-1-0-2-heading")
    expect(blockId(at(2000), "newsletter-email")).toBe(
      "block-2000-newsletter-email"
    )
  })

  it("is first on the Page only as the Page's own first Block", () => {
    expect(isFirstOnPage(at(0))).toBe(true)
    expect(isFirstOnPage(at(1))).toBe(false)
    expect(isFirstOnPage(at(0, [0]))).toBe(false)
    expect(isFirstOnPage(at(0, [0, 0, 0]))).toBe(false)
  })

  it("is told to people counting from 1", () => {
    expect(placeOf(at(1))).toBe("2")
    expect(placeOf(at(2, [1, 0]))).toBe("2.1.3")
  })
})

describe("a Page with the same Blocks at three depths", () => {
  it("has no duplicate ids, and every id an element points at exists once", async () => {
    const { container } = render(<Blocks blocks={atEveryDepth()} />)
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id)
    expect(ids.length).toBeGreaterThan(80)
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(repeated).toEqual([])
    // The Container comes after every other Block, at each depth.
    const c = everyBlock().length
    expect(ids).toContain("block-3-heading")
    expect(ids).toContain(`block-${c}-3-heading`)
    expect(ids).toContain(`block-${c}-${c}-3-heading`)
    expect(ids).toContain(`block-${c}-${c}-${c}-3-heading`)
    for (const attribute of ["aria-labelledby", "aria-controls", "for"]) {
      for (const el of container.querySelectorAll(`[${attribute}]`)) {
        for (const id of el.getAttribute(attribute)!.split(" ")) {
          expect(
            ids.filter((found) => found === id),
            id
          ).toHaveLength(1)
        }
      }
    }
  })

  it("passes axe, with every region named apart from the others", async () => {
    const { container } = render(<Blocks blocks={atEveryDepth()} />)
    const results = await axe.run(container, {
      runOnly: {
        type: "tag",
        values: [
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22aa",
          "best-practice",
        ],
      },
      rules: {
        // jsdom has no layout: contrast is the browser tests'.
        "color-contrast": { enabled: false },
        // The fragment has no <main> or page around it.
        region: { enabled: false },
        "page-has-heading-one": { enabled: false },
        // The same sample four times repeats its heading: the ids are the point.
        "landmark-unique": { enabled: false },
        "heading-order": { enabled: false },
      },
    })
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.html.slice(0, 120)),
      }))
    ).toEqual([])
  }, 60_000)

  it("keeps the h1 for the Page's first Block only", () => {
    const hero = sampleFor("hero")
    const { container } = render(
      <Blocks blocks={[hero, containerOf([hero, containerOf([hero])]), hero]} />
    )
    const headings = [...container.querySelectorAll("h1, h2")].filter((h) =>
      h.id.endsWith("-heading")
    )
    expect(headings.map((h) => `${h.tagName} ${h.id}`)).toEqual([
      "H1 block-0-heading",
      "H2 block-1-0-heading",
      "H2 block-1-1-0-heading",
      "H2 block-2-heading",
    ])
  })

  it("names a Rich text with no heading by its place", () => {
    const text = {
      ...sampleFor("richText"),
      content: {
        root: {
          type: "root",
          version: 1,
          children: [
            {
              type: "paragraph",
              version: 1,
              children: [{ type: "text", version: 1, text: "Plain." }],
            },
          ],
        },
      },
    } as unknown as PageBlock
    const { container } = render(
      <Blocks blocks={[text, containerOf([text, containerOf([text])])]} />
    )
    expect(
      [...container.querySelectorAll("section")].map((section) =>
        section.getAttribute("aria-label")
      )
    ).toEqual(["Section 1", "Section 2.1", "Section 2.2.1"])
  })
})
