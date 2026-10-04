// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import type { Brand } from "../brand"
import { fixturesFor } from "../fixtures"
import { RegionBlocks } from "../regions/RegionBlocks"
import type { FooterBlock, HeaderBlock } from "../regions/types"
import { renderBlock } from "./registry"
import { sampleFor } from "./samples"
import type { BlockContext, PageBlock } from "./types"

afterEach(cleanup)

const context: BlockContext = {
  index: 0,
  fixtures: fixturesFor(undefined),
  editing: false,
}

const draw = (block: PageBlock, ctx: BlockContext = context) =>
  render(<>{renderBlock(block, ctx)}</>).container

const cta = (over: object) =>
  ({ ...sampleFor("callToAction"), ...over }) as PageBlock

describe("a Block's style", () => {
  it("is nothing around a Block with the usual backgrounds and automatic text", () => {
    for (const background of ["default", "muted", "primary", "dark"]) {
      const container = draw(cta({ background, textColour: "auto" }))
      expect(
        container.querySelector("[data-block-style]"),
        background
      ).toBeNull()
      cleanup()
    }
  })

  it("paints the Accent and Third backgrounds, and says so around the Block", () => {
    for (const [background, fill] of [
      ["accent", "bg-accent"],
      ["third", "bg-third"],
    ] as const) {
      const container = draw({
        ...sampleFor("richText"),
        background,
      } as PageBlock)
      const wrapper = container.querySelector("[data-block-style]")!
      expect(wrapper.getAttribute("data-surface")).toBe(background)
      expect(wrapper.className).toBe("contents")
      expect(wrapper.querySelector("section")!.className).toContain(fill)
      cleanup()
    }
  })

  it("carries a text colour that is set, on any background", () => {
    const container = draw(cta({ background: "primary", textColour: "white" }))
    const wrapper = container.querySelector("[data-block-style]")!
    expect(wrapper.getAttribute("data-text")).toBe("white")
    expect(wrapper.hasAttribute("data-surface")).toBe(false)
    cleanup()
    const dark = draw(cta({ background: "accent", textColour: "dark" }))
    const both = dark.querySelector("[data-block-style]")!
    expect(both.getAttribute("data-text")).toBe("dark")
    expect(both.getAttribute("data-surface")).toBe("accent")
  })

  it("in a Container, keeps a Block's text colour and leaves its background to the Container", () => {
    const container = draw({
      ...sampleFor("container"),
      background: "third",
      textColour: "auto",
      children: [
        { ...sampleFor("richText"), background: "accent", textColour: "white" },
      ],
    } as PageBlock)
    const [outer, inner] = [...container.querySelectorAll("[data-block-style]")]
    expect(outer!.getAttribute("data-surface")).toBe("third")
    expect(inner!.getAttribute("data-surface")).toBeNull()
    expect(inner!.getAttribute("data-text")).toBe("white")
  })

  it("takes no room around a Block that draws nothing", () => {
    const container = draw({
      ...sampleFor("callToAction"),
      heading: "",
      background: "accent",
      textColour: "white",
    } as PageBlock)
    // The wrapper is `display: contents`: with nothing in it, nothing shows,
    // and a Container's cell that holds only it is hidden.
    const wrapper = container.querySelector("[data-block-style]")!
    expect(wrapper.className).toBe("contents")
    expect(wrapper.childElementCount).toBe(0)
    expect(container.textContent).toBe("")
  })
})

describe("a Header or Footer Block's style", () => {
  const brand: Brand = {
    name: "Warren Beach",
    tagline: null,
    logo: null,
    phone: "+44 20 7946 0000",
    email: null,
    address: null,
    social: [],
  }
  const regionContext = {
    fixtures: fixturesFor(undefined),
    editing: false,
    brand,
  }
  const header = (blocks: HeaderBlock[]) =>
    render(
      <RegionBlocks region="header" blocks={blocks} context={regionContext} />
    ).container
  const footer = (blocks: FooterBlock[]) =>
    render(
      <RegionBlocks region="footer" blocks={blocks} context={regionContext} />
    ).container

  it("leaves the Utility strip on the primary colour by default", () => {
    const container = header([{ blockType: "utilityStrip", showPhone: true }])
    expect(container.querySelector("[data-block-style]")).toBeNull()
    expect(
      container.querySelector("header")!.firstElementChild!.className
    ).toBe("bg-primary text-primary-foreground")
  })

  it("gives the Utility strip another of the Theme's colours, and white text", () => {
    const container = header([
      {
        blockType: "utilityStrip",
        showPhone: true,
        background: "third",
        textColour: "white",
      },
    ])
    const wrapper = container.querySelector("[data-block-style]")!
    expect(wrapper.getAttribute("data-surface")).toBe("third")
    expect(wrapper.getAttribute("data-text")).toBe("white")
    expect(wrapper.firstElementChild!.className).toContain("bg-third")
  })

  it("lets the Legal bar and the Footer columns paint a band of their own", () => {
    const container = footer([
      { blockType: "legalBar", text: "© Us", background: "dark" },
      {
        blockType: "footerColumns",
        columns: [{ heading: "Hours", content: "hours", hours: "9–5" }],
        background: "primary",
        textColour: "white",
      },
    ])
    const [legal, columns] = [...container.querySelector("footer")!.children]
    expect(legal!.className).toContain("bg-surface-dark")
    expect(columns!.getAttribute("data-text")).toBe("white")
    expect(columns!.firstElementChild!.className).toContain("bg-primary")
  })

  it("paints nothing of its own on the Default background", () => {
    const container = footer([{ blockType: "legalBar", text: "© Us" }])
    const bar = container.querySelector("footer")!.firstElementChild!
    expect(bar.className).not.toMatch(/\bbg-/)
  })
})

describe("the stylesheet's part", () => {
  // The tests run from apps/site.
  const css = readFileSync(
    join(process.cwd(), "../../packages/ui/src/styles/globals.css"),
    "utf8"
  )

  it("gives the surface's text colour to text, links, rings and rules inside it", () => {
    for (const rule of [
      '[data-surface="accent"]',
      '[data-surface="third"]',
      '[data-text="white"]',
      '[data-text="dark"]',
    ]) {
      expect(css, rule).toContain(rule)
    }
    const block = css.slice(css.indexOf("[data-text] {"))
    for (const variable of [
      "--foreground",
      "--muted-foreground",
      "--link",
      "--ring",
    ]) {
      expect(block.slice(0, block.indexOf("}")), variable).toContain(
        `${variable}: var(--block-text)`
      )
    }
  })

  it("gives a card inside its own readable colours back", () => {
    expect(css).toContain(
      ":is([data-surface], [data-text]) :is(.bg-card, .bg-background, .bg-popover)"
    )
    expect(css).toContain("--base-foreground: var(--foreground);")
  })
})
