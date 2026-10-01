import { describe, expect, it } from "vitest"

import type { StoredFont } from "./available"
import { fontFaceCss } from "./fontFace"

const roboto: StoredFont = {
  id: 1,
  family: "Roboto Slab",
  kind: "slab",
  files: [
    { weight: 400, style: "normal", url: "/api/font-files/file/rs-400.woff2" },
    { weight: 700, style: "italic", url: "/api/font-files/file/rs-700i.woff" },
  ],
}

describe("fontFaceCss", () => {
  it("writes one @font-face per file with swap and a same-origin URL", () => {
    expect(fontFaceCss([roboto])).toBe(
      [
        `@font-face{font-family:"Roboto Slab";font-style:normal;font-weight:400;font-display:swap;src:url("/api/font-files/file/rs-400.woff2") format("woff2")}`,
        `@font-face{font-family:"Roboto Slab";font-style:italic;font-weight:700;font-display:swap;src:url("/api/font-files/file/rs-700i.woff") format("woff")}`,
      ].join("\n")
    )
  })

  it("is empty when there are no stored Fonts", () => {
    expect(fontFaceCss([])).toBe("")
    expect(fontFaceCss([{ ...roboto, files: [] }])).toBe("")
  })

  it("drops the origin from a URL, so it is always served by the Site", () => {
    const css = fontFaceCss([
      {
        ...roboto,
        files: [
          {
            weight: 400,
            style: "normal",
            url: "https://cdn.example.test/avada/fonts/a.woff2?v=2",
          },
        ],
      },
    ])
    expect(css).toContain(`url("/avada/fonts/a.woff2?v=2")`)
    expect(css).not.toContain("cdn.example.test")
  })

  it("names the format from the extension", () => {
    const format = (file: string) =>
      /format\("(\w+)"\)/.exec(
        fontFaceCss([
          {
            ...roboto,
            files: [{ weight: 400, style: "normal", url: `/f/${file}` }],
          },
        ])
      )?.[1]
    expect(format("a.ttf")).toBe("truetype")
    expect(format("a.otf")).toBe("opentype")
    expect(format("a.woff2")).toBe("woff2")
  })

  it("can't be broken out of by a family name or file name", () => {
    const css = fontFaceCss([
      {
        ...roboto,
        family: `Evil"; } body { display:none } /*`,
        files: [
          {
            weight: 400,
            style: "normal",
            url: `/f/a".woff2"); } body { color:red`,
          },
        ],
      },
    ])
    expect(css.match(/@font-face/g)).toHaveLength(1)
    expect(css).toContain(`font-family:"Evil\\"; } body { display:none } /*"`)
    // Outside its quoted strings the rule is only what the helper wrote.
    const outsideStrings = css.replace(/"(?:[^"\\]|\\.)*"/g, '""')
    expect(outsideStrings).toBe(
      `@font-face{font-family:"";font-style:normal;font-weight:400;font-display:swap;src:url("") format("")}`
    )
  })
})
