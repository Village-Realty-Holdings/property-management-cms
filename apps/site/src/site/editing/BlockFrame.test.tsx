// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Block, Blocks, type PageBlock } from "../blocks"
import { fixturesFor } from "../fixtures"
import { RegionBlocks } from "../regions"
import type { FooterBlock, HeaderBlock } from "../regions"

const fixtures = fixturesFor(undefined)
const brand = { name: "Brand" } as never
const context = (editing: boolean) => ({ brand, fixtures, editing })

const hero = (id: string | undefined, heading: string) =>
  ({ id, blockType: "hero", heading }) as PageBlock

const frames = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-block-id]")].map((frame) => [
    frame.getAttribute("data-block-id"),
    frame.getAttribute("data-block-region"),
    frame.getAttribute("data-block-index"),
  ])

afterEach(cleanup)

describe("Blocks in editing mode", () => {
  it("wraps each Block with its id, type, region and place", () => {
    const { container } = render(
      <Blocks
        blocks={[hero("a", "One"), hero("b", "Two")]}
        fixtures={fixtures}
        editing
      />
    )
    expect(frames(container)).toEqual([
      ["a", "page", "0"],
      ["b", "page", "1"],
    ])
    expect(
      container
        .querySelector("[data-block-id=a]")!
        .getAttribute("data-block-type")
    ).toBe("hero")
  })

  it("adds no box: the Block lays out as it does on the Site", () => {
    const { container } = render(
      <Blocks blocks={[hero("a", "One")]} fixtures={fixtures} editing />
    )
    expect(
      (container.querySelector("[data-block-id]") as HTMLElement).style.display
    ).toBe("contents")
  })

  it("leaves the Site's markup as it is when not editing", () => {
    const { container } = render(
      <Blocks blocks={[hero("a", "One")]} fixtures={fixtures} />
    )
    expect(container.querySelector("[data-block-id]")).toBeNull()
    expect(container.querySelector("[data-block-region]")).toBeNull()
  })

  it("wraps a single Block too, and a Block with no id has no id to select by", () => {
    const { container } = render(
      <Block
        block={hero(undefined, "One")}
        index={4}
        fixtures={fixtures}
        editing
      />
    )
    const frame = container.querySelector("[data-block-region=page]")!
    expect(frame.getAttribute("data-block-index")).toBe("4")
    expect(frame.hasAttribute("data-block-id")).toBe(false)
  })

  it("draws nothing for a Block the Site does not have", () => {
    const { container } = render(
      <Blocks
        blocks={[{ id: "x", blockType: "gone" } as unknown as PageBlock]}
        fixtures={fixtures}
        editing
      />
    )
    expect(container.innerHTML).toBe("")
  })
})

describe("region Blocks in editing mode", () => {
  const header = [
    { id: "h1", blockType: "utilityStrip", text: "One" },
    { id: "h2", blockType: "utilityStrip", text: "Two" },
  ] as HeaderBlock[]
  const footer = [
    { id: "f1", blockType: "legalBar", text: "Legal" },
  ] as FooterBlock[]

  it("wraps each with its id, region and place in the region's own list", () => {
    const { container } = render(
      <>
        <RegionBlocks region="header" blocks={header} context={context(true)} />
        <RegionBlocks region="footer" blocks={footer} context={context(true)} />
      </>
    )
    expect(frames(container)).toEqual([
      ["h1", "header", "0"],
      ["h2", "header", "1"],
      ["f1", "footer", "0"],
    ])
  })

  it("keeps the place in the list when a Block is left out", () => {
    const { container } = render(
      <RegionBlocks
        region="header"
        blocks={
          [
            { id: "x", blockType: "legalBar", text: "Not a Header Block" },
            { id: "h1", blockType: "utilityStrip", text: "One" },
          ] as unknown as HeaderBlock[]
        }
        context={context(true)}
      />
    )
    expect(frames(container)).toEqual([["h1", "header", "1"]])
  })

  it("adds nothing when not editing", () => {
    const { container } = render(
      <RegionBlocks region="header" blocks={header} context={context(false)} />
    )
    expect(container.querySelector("[data-block-id]")).toBeNull()
  })
})
