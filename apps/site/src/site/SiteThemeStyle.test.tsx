import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { combineFonts } from "../fonts/available"
import { CLASSIC, HARBOUR } from "../theme"
import { SiteFrame } from "./SiteFrame"
import { SiteThemeStyle } from "./SiteThemeStyle"

describe("SiteThemeStyle", () => {
  it("renders the Theme's tokens at :root in one style element", () => {
    const html = renderToStaticMarkup(
      <SiteThemeStyle theme={{ inputs: HARBOUR.inputs, fonts: [] }} />
    )
    expect(html.match(/<style/g)).toHaveLength(1)
    expect(html).toContain(":root{")
    expect(html).toContain(`--primary:${HARBOUR.inputs.primary};`)
  })

  it("keeps quotes in font-face rules unescaped, or the rules break", () => {
    const html = renderToStaticMarkup(
      <SiteThemeStyle
        theme={{
          inputs: { ...CLASSIC.inputs, headingFont: "font:7" },
          fonts: combineFonts([
            {
              id: 7,
              family: "Roboto Slab",
              kind: "slab",
              files: [{ weight: 400, style: "normal", url: "/f/rs.woff2" }],
            },
          ]),
        }}
      />
    )
    expect(html).toContain('@font-face{font-family:"Roboto Slab";')
    expect(html).toContain('src:url("/f/rs.woff2") format("woff2")')
    expect(html).not.toContain("&quot;")
    expect(html).not.toContain("&#x27;")
  })

  it("shows the default preset with no Theme", () => {
    const html = renderToStaticMarkup(<SiteThemeStyle theme={null} />)
    expect(html).toContain(`--primary:${CLASSIC.inputs.primary};`)
  })
})

describe("SiteFrame", () => {
  it("leaves the variables to the layout: no style element, no inline vars", () => {
    const html = renderToStaticMarkup(
      <SiteFrame
        brand={{
          name: "Warren Beach",
          tagline: null,
          logo: null,
          phone: null,
          email: null,
          address: null,
          social: [],
        }}
      >
        <p>Page</p>
      </SiteFrame>
    )
    expect(html).not.toContain("<style")
    expect(html).not.toContain("style=")
  })
})

describe("the Site's source", () => {
  it("has no --brand-* variable left: it reads semantic tokens", () => {
    const dir = path.join(__dirname)
    const files = readdirSync(dir).filter(
      (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)
    )
    for (const file of files) {
      expect(readFileSync(path.join(dir, file), "utf8"), file).not.toMatch(
        /--brand-/
      )
    }
  })
})
