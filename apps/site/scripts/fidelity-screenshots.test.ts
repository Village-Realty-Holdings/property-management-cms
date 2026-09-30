import { describe, expect, it } from "vitest"

import {
  blockShotFile,
  pairFile,
  pairHtml,
  pairTargets,
  parseArgs,
  referencePath,
} from "./fidelity-screenshots"

describe("parseArgs", () => {
  it("reads the mode and each Site's origin", () => {
    expect(
      parseArgs([
        "pairs",
        "--warren-beach",
        "http://localhost:3001",
        "--avada",
        "http://localhost:3002/",
      ])
    ).toEqual({
      mode: "pairs",
      origins: {
        "warren-beach": "http://localhost:3001",
        avada: "http://localhost:3002",
      },
    })
  })

  it("defaults the Sites' origins to their own ports", () => {
    expect(parseArgs(["pairs"])).toEqual({
      mode: "pairs",
      origins: {
        "warren-beach": "http://localhost:3001",
        avada: "http://localhost:3002",
      },
    })
  })

  it("reads the origin and fixtures of the blocks mode", () => {
    expect(
      parseArgs([
        "blocks",
        "--origin",
        "http://localhost:3131",
        "--fixtures",
        "avada",
      ])
    ).toEqual({
      mode: "blocks",
      origin: "http://localhost:3131",
      fixtures: "avada",
    })
  })

  it("needs the blocks mode's origin", () => {
    expect(() => parseArgs(["blocks"])).toThrow(/--origin/)
  })

  it("refuses an unknown mode or option", () => {
    expect(() => parseArgs(["snap"])).toThrow(/usage/)
    expect(() => parseArgs(["pairs", "--colour", "red"])).toThrow(/--colour/)
  })
})

describe("pairTargets", () => {
  it("lists every seeded Page of Warren Beach with the real site's screenshot", () => {
    expect(pairTargets("warren-beach")).toEqual([
      { title: "Home", path: "/", reference: "home" },
      { title: "Rentals", path: "/rentals", reference: "rentals" },
      { title: "Owners", path: "/owners", reference: "owners" },
      { title: "Contact", path: "/contact", reference: "contact" },
    ])
  })

  it("lists every seeded Page of Avada", () => {
    expect(pairTargets("avada").map((page) => page.reference)).toEqual([
      "home",
      "search",
      "owners",
      "about",
      "contact",
    ])
  })
})

describe("file names", () => {
  it("puts pairs in docs/screenshots/6-seed, by Site", () => {
    expect(pairFile("avada", "Home")).toBe(
      "docs/screenshots/6-seed/avada/home-pair.png"
    )
    expect(pairFile("warren-beach", "Contact", "ours")).toBe(
      "docs/screenshots/6-seed/warren-beach/contact-ours.png"
    )
  })

  it("puts Blocks in docs/screenshots/4-blocks, by preset", () => {
    expect(blockShotFile("harbour", "image-text")).toBe(
      "docs/screenshots/4-blocks/harbour/image-text.png"
    )
  })

  it("names the reference in the brand extraction", () => {
    expect(referencePath("avada", "home")).toBe(
      "research/brands/avada/screenshots/home.jpg"
    )
  })
})

describe("pairHtml", () => {
  it("shows ours and the real site side by side, each captioned", () => {
    const html = pairHtml({
      ours: "data:image/png;base64,AAA",
      real: "data:image/jpeg;base64,BBB",
      caption: "Avada Properties · Home <1>",
    })
    expect(html).toContain("Ours: Avada Properties · Home &lt;1&gt;")
    expect(html).toContain("The real site")
    expect(html.indexOf("AAA")).toBeLessThan(html.indexOf("BBB"))
  })
})
