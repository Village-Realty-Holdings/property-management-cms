import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { BUILT_IN_FONTS } from "./builtIn"
import { combineFonts, type StoredFont } from "./available"

describe("BUILT_IN_FONTS", () => {
  it("lists the six fonts src/site/fonts.ts loads, with their CSS variables", () => {
    // src/site/fonts.ts can only run under Next's compiler (next/font), so
    // this reads it as text to keep the two lists from drifting apart.
    const source = readFileSync(
      fileURLToPath(new URL("../site/fonts.ts", import.meta.url)),
      "utf8"
    )
    expect(BUILT_IN_FONTS).toHaveLength(6)
    for (const font of BUILT_IN_FONTS) {
      expect(source).toContain(font.family.replaceAll(" ", "_") + "({")
      expect(source).toContain(`variable: "${font.cssVariable}"`)
    }
  })

  it("gives every font a kind and at least one weight", () => {
    for (const font of BUILT_IN_FONTS) {
      expect(["serif", "sans", "slab"]).toContain(font.kind)
      expect(font.weights.length).toBeGreaterThan(0)
    }
    expect(BUILT_IN_FONTS.find((f) => f.family === "Zilla Slab")?.kind).toBe(
      "slab"
    )
  })
})

const stored: StoredFont = {
  id: 4,
  family: "Roboto Slab",
  kind: "slab",
  files: [
    { weight: 700, style: "normal", url: "/api/font-files/file/a.woff2" },
    { weight: 400, style: "normal", url: "/api/font-files/file/b.woff2" },
    { weight: 400, style: "italic", url: "/api/font-files/file/c.woff2" },
  ],
}

describe("combineFonts", () => {
  it("lists the built-in quick picks first, then the stored Fonts", () => {
    const fonts = combineFonts([stored])
    expect(fonts.slice(0, 6).map((f) => f.source)).toEqual(
      Array(6).fill("built-in")
    )
    expect(fonts[6]).toEqual({
      key: "font:4",
      source: "stored",
      id: 4,
      family: "Roboto Slab",
      kind: "slab",
      weights: [400, 700],
    })
  })

  it("keys a built-in font by its family so the Theme can point at it", () => {
    const [first] = combineFonts([])
    expect(first).toMatchObject({
      key: "built-in:Newsreader",
      source: "built-in",
      family: "Newsreader",
    })
    expect(first).not.toHaveProperty("id")
  })

  it("keeps a stored Font that shares a built-in family name, as its own choice", () => {
    const fonts = combineFonts([{ ...stored, id: 9, family: "Karla" }])
    expect(fonts.filter((f) => f.family === "Karla").map((f) => f.key)).toEqual(
      ["built-in:Karla", "font:9"]
    )
  })
})
