import { describe, expect, it } from "vitest"

import { combineFonts, type StoredFont } from "../fonts/available"
import { DEFAULT_INPUTS } from "../theme/presets"
import {
  DEFAULT_BODY_FONT_KEY,
  DEFAULT_HEADING_FONT_KEY,
  resolveFontStack,
  themeFontFaces,
} from "./fontStacks"

const uploaded: StoredFont = {
  id: 4,
  family: "Fraunces",
  kind: "serif",
  files: [
    {
      weight: 400,
      style: "normal",
      url: "/api/font-files/file/fraunces-400.woff2",
    },
    {
      weight: 700,
      style: "normal",
      url: "/api/font-files/file/fraunces-700.woff2",
    },
  ],
}

// A Google-imported Font is stored like any other: importGoogleFont keeps the
// files, and the Site serves them.
const google: StoredFont = {
  id: 7,
  family: "Roboto Slab",
  kind: "slab",
  files: [
    {
      weight: 700,
      style: "normal",
      url: "https://cms.example.com/api/font-files/file/roboto-slab-700.woff2",
    },
  ],
}

const available = combineFonts([uploaded, google])

describe("resolveFontStack", () => {
  it("points a built-in font at the variable next/font defines, with a generic fallback", () => {
    const resolved = resolveFontStack("built-in:Newsreader", available)
    expect(resolved.stack).toBe("var(--font-classic-display), serif")
    expect(resolved.css).toBe("")
    expect(resolved.key).toBe("built-in:Newsreader")
    expect(resolveFontStack("built-in:Public Sans", available).stack).toBe(
      "var(--font-classic-body), system-ui, sans-serif"
    )
  })

  it("falls back to the generic family by kind: serif, sans and slab", () => {
    expect(resolveFontStack("font:4", available).stack).toBe(
      '"Fraunces", serif'
    )
    expect(resolveFontStack("font:7", available).stack).toBe(
      '"Roboto Slab", serif'
    )
    expect(resolveFontStack("built-in:Karla", available).stack).toMatch(
      /sans-serif$/
    )
  })

  it("serves an uploaded Font through @font-face from the Site itself", () => {
    const { css, stack } = resolveFontStack("font:4", available)
    expect(stack).toBe('"Fraunces", serif')
    expect(css).toContain('font-family:"Fraunces"')
    expect(css).toContain('url("/api/font-files/file/fraunces-400.woff2")')
    expect(css).toContain('url("/api/font-files/file/fraunces-700.woff2")')
    expect(css).toContain("font-display:swap")
  })

  it("serves a Google-imported Font from the Site, dropping the file URL's origin", () => {
    const { css } = resolveFontStack("font:7", available)
    expect(css).toContain('font-family:"Roboto Slab"')
    expect(css).toContain('url("/api/font-files/file/roboto-slab-700.woff2")')
    expect(css).not.toContain("cms.example.com")
  })

  it("never puts a third-party URL in the CSS", () => {
    const thirdParty: StoredFont = {
      ...google,
      id: 9,
      files: [
        {
          weight: 400,
          style: "normal",
          url: "https://fonts.gstatic.com/s/robotoslab/v34/rs-400.woff2",
        },
      ],
    }
    const { css } = resolveFontStack("font:9", combineFonts([thirdParty]))
    expect(css).not.toMatch(/googleapis|gstatic|https?:/)
    expect(css).toContain('url("/s/robotoslab/v34/rs-400.woff2")')
  })

  it("escapes a family name so it can't break out of the stack", () => {
    const nasty: StoredFont = { ...uploaded, id: 5, family: 'A";}body{x:y' }
    const { stack } = resolveFontStack("font:5", combineFonts([nasty]))
    expect(stack).toBe('"A\\";}body{x:y", serif')
  })

  it("treats a stored Font with no files as missing: the default font for the role", () => {
    const empty: StoredFont = { ...uploaded, id: 6, files: [] }
    const heading = resolveFontStack("font:6", combineFonts([empty]), "heading")
    expect(heading.key).toBe(DEFAULT_HEADING_FONT_KEY)
    expect(heading.css).toBe("")
    expect(heading.stack).toBe("var(--font-classic-display), serif")
    const body = resolveFontStack("font:6", combineFonts([empty]), "body")
    expect(body.key).toBe(DEFAULT_BODY_FONT_KEY)
  })

  it("uses the stand-in of the brand preset that names a file-less Font's family", () => {
    const montserrat: StoredFont = {
      id: 8,
      family: "Montserrat",
      kind: "sans",
      files: [],
    }
    const resolved = resolveFontStack(
      "font:8",
      combineFonts([montserrat]),
      "heading"
    )
    // Avada's stand-in for Montserrat.
    expect(resolved.key).toBe("built-in:Bricolage Grotesque")
    expect(resolved.stack).toBe(
      "var(--font-modern-display), system-ui, sans-serif"
    )
    expect(resolved.css).toBe("")
  })

  it("takes the default fonts from the default preset, not a second pairing", () => {
    expect(DEFAULT_HEADING_FONT_KEY).toBe(DEFAULT_INPUTS.headingFont)
    expect(DEFAULT_BODY_FONT_KEY).toBe(DEFAULT_INPUTS.bodyFont)
  })

  it.each([
    ["a deleted Font", "font:999"],
    ["an unknown built-in", "built-in:Comic Sans"],
    ["an empty key", ""],
    ["nonsense", "wat"],
    ["undefined", undefined],
    ["null", null],
  ])("falls back to a built-in for %s, without throwing", (_, key) => {
    const resolved = resolveFontStack(key, available)
    expect(resolved.key).toBe(DEFAULT_BODY_FONT_KEY)
    expect(resolved.stack).toMatch(/^var\(--font-/)
    expect(resolved.css).toBe("")
  })

  it("falls back to the heading default for a missing heading font", () => {
    const resolved = resolveFontStack("font:999", available, "heading")
    expect(resolved.key).toBe(DEFAULT_HEADING_FONT_KEY)
    expect(resolved.stack).toBe("var(--font-classic-display), serif")
  })

  it("falls back to the generic stack when even the default is unavailable", () => {
    const resolved = resolveFontStack("font:999", [])
    expect(resolved.stack).toBe("system-ui, sans-serif")
    expect(resolved.css).toBe("")
  })
})

describe("themeFontFaces", () => {
  it("returns both stacks and @font-face only for the fonts the Theme uses", () => {
    const { css, headingStack, bodyStack } = themeFontFaces(
      "font:4",
      "built-in:Public Sans",
      available
    )
    expect(headingStack).toBe('"Fraunces", serif')
    expect(bodyStack).toBe("var(--font-classic-body), system-ui, sans-serif")
    expect(css).toContain('font-family:"Fraunces"')
    expect(css).not.toContain("Roboto Slab")
  })

  it("emits the rules for a heading and a body that are both stored", () => {
    const { css } = themeFontFaces("font:4", "font:7", available)
    expect(css).toContain('font-family:"Fraunces"')
    expect(css).toContain('font-family:"Roboto Slab"')
  })

  it("emits a font's rules once when heading and body share it", () => {
    const { css } = themeFontFaces("font:4", "font:4", available)
    expect(css.match(/font-weight:400/g)).toHaveLength(1)
  })

  it("has no CSS when both fonts are built in", () => {
    expect(
      themeFontFaces("built-in:Newsreader", "built-in:Karla", available).css
    ).toBe("")
  })

  it("recovers from missing keys with the default pair", () => {
    const result = themeFontFaces("font:999", undefined, available)
    expect(result.css).toBe("")
    expect(result.headingStack).toBe("var(--font-classic-display), serif")
    expect(result.bodyStack).toBe(
      "var(--font-classic-body), system-ui, sans-serif"
    )
  })
})
