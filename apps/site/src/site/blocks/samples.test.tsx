// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import { backgrounds } from "../../fields/background"
import { catalogueEntries } from "../../blocks/catalogue"
import { Block } from "."
import { iconNames } from "./icons"
import { blockRegistry } from "./registry"
import { samples, sampleFor } from "./samples"

afterEach(cleanup)

/** WCAG 2.2 AA violations in `element`. jsdom has no layout, so colour contrast is left to the browser tests (e2e/4-blocks). */
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

describe("the Block catalogue's samples", () => {
  it("has one sample and one component for every catalogue entry", () => {
    const types = catalogueEntries.map((entry) => entry.blockType).sort()
    expect(types.length).toBeGreaterThan(0)
    expect(Object.keys(samples).sort()).toEqual(types)
    expect(Object.keys(blockRegistry).sort()).toEqual(types)
  })

  it.each(catalogueEntries.map((entry) => [entry.label, entry] as const))(
    "%s renders from its sample, as a named region (a Container's are its Blocks), and passes axe",
    async (_label, entry) => {
      const sample = sampleFor(entry.blockType)
      expect(sample.blockType).toBe(entry.blockType)
      const { container } = render(<Block block={sample} index={1} />)
      if (entry.blockType === "container") {
        expect(container.firstElementChild!.tagName).toBe("DIV")
      } else {
        const section = container.querySelector("section")
        expect(section, "a Block is a <section>").not.toBeNull()
        expect(
          section!.getAttribute("aria-labelledby") ??
            section!.getAttribute("aria-label")
        ).toBeTruthy()
      }
      expect(container.textContent!.trim().length).toBeGreaterThan(20)
      expect(await violations(container)).toEqual([])
    }
  )

  it.each(
    catalogueEntries
      .filter((entry) => entry.takesBackground)
      .flatMap((entry) =>
        backgrounds.map(
          (background) => [entry.label, entry, background] as const
        )
      )
  )("%s on the %s background passes axe", async (_label, entry, background) => {
    const block = { ...sampleFor(entry.blockType), background }
    const { container } = render(<Block block={block} index={1} />)
    expect(await violations(container)).toEqual([])
  })

  it.each(
    catalogueEntries
      // Rich text is a Lexical editor in the canvas (see inlineText.test.tsx),
      // and so is the Rich text in the Container's sample: its Blocks are
      // framed in ContainerBlock.test.tsx and BlockFrame.test.tsx.
      .filter(
        (entry) =>
          entry.blockType !== "richText" && entry.blockType !== "container"
      )
      .map((entry) => [entry.label, entry] as const)
  )(
    "%s in the Visual Editor is the same markup plus its field names, in a frame",
    (_label, entry) => {
      const sample = sampleFor(entry.blockType)
      const site = render(<Block block={sample} index={1} />).container
      const siteHtml = site.innerHTML
      cleanup()
      const editing = render(<Block block={sample} index={1} editing />)
      // The canvas wraps each Block in a frame that adds no markup of its own.
      const frame = editing.container.firstElementChild!
      expect(frame.getAttribute("data-block-region")).toBe("page")
      expect(editing.container.children).toHaveLength(1)
      const stripped = frame.innerHTML.replace(
        / (?:data-(?:block-index|editable-field)|contenteditable)="[^"]*"/g,
        ""
      )
      expect(stripped).toBe(siteHtml)
    }
  )

  it.each([
    ["hero", ["eyebrow", "heading", "subheading", "cta.label"]],
    ["callToAction", ["heading", "body", "button.label"]],
  ] as const)(
    "%s marks its headings, short text and button label as editable",
    (blockType, fields) => {
      const { container } = render(
        <Block block={sampleFor(blockType)} index={1} editing />
      )
      const found = [...container.querySelectorAll("[data-editable-field]")]
      expect(found.map((el) => el.getAttribute("data-editable-field"))).toEqual(
        fields
      )
      for (const el of found) {
        expect(el.getAttribute("data-block-index")).toBe("1")
      }
    }
  )

  it("picks every icon in the samples from the curated list", () => {
    const icons: unknown[] = []
    JSON.stringify(samples, (key, value: unknown) => {
      if (key === "icon") icons.push(value)
      return value
    })
    expect(icons.length).toBeGreaterThan(10)
    for (const icon of icons) expect(iconNames).toContain(icon)
  })

  it("a Call to action in every style renders and passes axe", async () => {
    for (const style of ["primary", "secondary", "inverted", "dark"] as const) {
      const block = { ...sampleFor("callToAction"), style }
      const { container } = render(<Block block={block} index={1} />)
      expect(container.querySelector("section"), style).not.toBeNull()
      expect(await violations(container), style).toEqual([])
      cleanup()
    }
  })

  it("the Dark surface Call to action is drawn on the Theme's dark surface", () => {
    const block = { ...sampleFor("callToAction"), style: "dark" as const }
    const { container } = render(<Block block={block} index={1} />)
    expect(container.querySelector(".bg-surface-dark")).not.toBeNull()
  })

  it("a stored Block of a type the Site no longer has renders nothing", () => {
    const { container } = render(
      <Block
        block={
          { blockType: "gone" } as unknown as Parameters<
            typeof Block
          >[0]["block"]
        }
        index={0}
      />
    )
    expect(container.innerHTML).toBe("")
  })
})
