// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { catalogueEntries } from "../../blocks/catalogue"
import type { ContainerBlock as ContainerBlockData } from "../../payload-types"
import { compileUiCss } from "../../test/uiCss"
import { Block } from "."
import { sampleFor } from "./samples"
import { container, sectionY } from "./types"

afterEach(cleanup)

/**
 * Container Blocks, Phase 6: a Block that fits a narrow column lays itself
 * out by the room it has, with the `fit-*` breakpoints: the viewport's width
 * on the Page, as `sm:` to `xl:` did, so it looks there as it always has,
 * and its cell's width inside a Container (ADR-0007).
 */

const breakpoints = [
  ["fit-sm", "40rem"],
  ["fit-md", "48rem"],
  ["fit-lg", "64rem"],
  ["fit-xl", "80rem"],
] as const

const escape = (name: string) => name.replace(/[:!]/g, "\\$&")

/** The rule Tailwind writes for the class `name`, nested as it compiles it. */
function ruleOf(css: string, name: string) {
  const start = css.indexOf(`.${escape(name)} {`)
  expect(start, name).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf("\n  }\n", start))
}

describe("the fit-* breakpoints", () => {
  it.each(breakpoints)(
    "%s is the viewport's width on the Page and the cell's inside a Container, from %s",
    async (variant, width) => {
      const css = await compileUiCss([`${variant}:grid-cols-2`])
      const rule = ruleOf(css, `${variant}:grid-cols-2`)
      // Outside the mark, the viewport's width, as `sm:` to `xl:` query it.
      expect(rule.replace(/\s+/g, " ")).toContain(
        `&:not(:where([data-container] *)) { @media (width >= ${width}) { grid-template-columns`
      )
      // Under it, the nearest container's: the Block's cell.
      expect(rule.replace(/\s+/g, " ")).toContain(
        `:where([data-container]) & { @container (width >= ${width}) { grid-template-columns`
      )
    }
  )

  it("are written out from narrow to wide, so a wider one wins", async () => {
    const names = breakpoints.map(([variant]) => `${variant}:grid-cols-2`)
    const css = await compileUiCss([...names].reverse())
    const at = names.map((name) => css.indexOf(`.${escape(name)} {`))
    expect(at.every((index) => index > -1)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })
})

/** A Container of `columns` holding `block` in each column. */
const columnsOf = (
  block: unknown,
  columns: "1" | "2" | "3"
): ContainerBlockData => ({
  blockType: "container",
  columns,
  gap: "medium",
  align: "top",
  width: "page",
  background: "default",
  children: Array(Number(columns)).fill(block),
})

/**
 * Classes that take the viewport's width: `sm:`, `md:`, `lg:`, `xl:`,
 * `2xl:` and their `max-` forms, anywhere in a class's variants.
 */
const viewportClass = /(^|:)(max-)?(sm|md|lg|xl|2xl):/

/**
 * What may still read the viewport: a band's padding on the band and the
 * page-width box's on the box, which a Container takes away, and a text
 * field's font size from the shared controls, which changes no layout.
 */
const wrappers = [sectionY, container].map((list) => list.split(" "))
const controls = ["md:text-sm"]

function viewportClasses(root: Element) {
  return [...root.querySelectorAll("*")].flatMap((element) => {
    const names = [...element.classList]
    const wrapper = wrappers.find((list) =>
      list.every((name) => names.includes(name))
    )
    return names.filter(
      (name) =>
        viewportClass.test(name) &&
        !wrapper?.includes(name) &&
        !controls.includes(name)
    )
  })
}

const narrow = catalogueEntries.filter((entry) => entry.fitsNarrow)

/** The other ways a Block lays itself out than its sample's. */
const otherVariants: Record<string, Record<string, unknown>[]> = {
  imageText: [{ imageSide: "right" }],
  amenities: [{ variant: "icons" }],
}

describe("a Block that fits a narrow column", () => {
  it.each(narrow.map((entry) => [entry.label, entry] as const))(
    "%s lays itself out by the room it has, not the viewport's width",
    (_label, entry) => {
      const samples = [
        sampleFor(entry.blockType),
        ...(otherVariants[entry.blockType] ?? []).map((over) => ({
          ...sampleFor(entry.blockType),
          ...over,
        })),
      ]
      for (const block of samples.flatMap((sample) => [
        sample,
        columnsOf(sample, "3"),
      ])) {
        const { container: root } = render(
          <Block block={block} index={1} editing={false} />
        )
        expect(viewportClasses(root)).toEqual([])
        cleanup()
      }
    }
  )
})

/** Classes that take a container's width: `@sm:` to `@7xl:`, and `@max-` forms. */
const containerClass = /(^|:)@(max-)?(3xs|2xs|xs|sm|md|lg|xl|[2-7]xl):/

describe("a Block on the Page", () => {
  // The Container's own columns are counted against its width, by design.
  const blocks = narrow.filter((entry) => entry.blockType !== "container")

  it.each(blocks.map((entry) => [entry.label, entry] as const))(
    "%s switches where the viewport's breakpoints are, with fit-*, not by a container query of its own",
    (_label, entry) => {
      const { container: root } = render(
        <Block block={sampleFor(entry.blockType)} index={1} editing={false} />
      )
      const found = [...root.querySelectorAll("*")].flatMap((element) =>
        [...element.classList].filter((name) => containerClass.test(name))
      )
      expect(found).toEqual([])
    }
  )
})
