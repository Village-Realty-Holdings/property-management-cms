import { describe, expect, it } from "vitest"

import { combineFonts } from "../fonts/available"
import { CLASSIC, HARBOUR } from "../theme"
import { siteThemeCss } from "./themeStyle"

const stored = combineFonts([
  {
    id: 7,
    family: "Roboto Slab",
    kind: "slab",
    files: [
      {
        weight: 400,
        style: "normal",
        url: "https://cdn.example.com/media/fonts/rs-400.woff2",
      },
    ],
  },
  {
    id: 8,
    family: "Unused Serif",
    kind: "serif",
    files: [{ weight: 400, style: "normal", url: "/media/fonts/unused.woff2" }],
  },
])

describe("siteThemeCss", () => {
  it("emits the Theme's derived tokens at :root", () => {
    const css = siteThemeCss({ inputs: HARBOUR.inputs, fonts: stored })
    expect(css).toContain(":root{")
    expect(css).toContain(`--primary:${HARBOUR.inputs.primary};`)
    expect(css).toContain(`--accent:${HARBOUR.inputs.accent};`)
    expect(css).toContain("--btn-radius:0px;")
    expect(css).toContain("--section-y:")
  })

  it("keeps the old two-colour variables out", () => {
    const css = siteThemeCss({ inputs: CLASSIC.inputs, fonts: stored })
    expect(css).not.toContain("--brand-")
  })

  it("points the font tokens at the built-in fonts' variables", () => {
    const css = siteThemeCss({ inputs: CLASSIC.inputs, fonts: stored })
    expect(css).toContain("--font-display:var(--font-classic-display)")
    expect(css).toContain("--font-sans:var(--font-classic-body)")
    expect(css).not.toContain("@font-face")
  })

  it("adds @font-face, self-hosted, for a stored font in use only", () => {
    const css = siteThemeCss({
      inputs: { ...CLASSIC.inputs, headingFont: "font:7" },
      fonts: stored,
    })
    expect(css).toContain('@font-face{font-family:"Roboto Slab";')
    expect(css).toContain('src:url("/media/fonts/rs-400.woff2")')
    expect(css).not.toContain("cdn.example.com")
    expect(css).not.toContain("Unused Serif")
    expect(css).toContain('--font-display:"Roboto Slab", serif')
  })

  it("falls back to the default fonts when a stored font is gone", () => {
    const css = siteThemeCss({
      inputs: { ...CLASSIC.inputs, headingFont: "font:99" },
      fonts: stored,
    })
    expect(css).toContain("--font-display:var(--font-classic-display)")
    expect(css).not.toContain("@font-face")
  })

  it("carries the reduced-motion override", () => {
    const css = siteThemeCss({ inputs: CLASSIC.inputs, fonts: stored })
    expect(css).toMatch(
      /@media \(prefers-reduced-motion:reduce\)\{:root\{[^}]*--duration:0ms;/
    )
  })

  it("uses the default preset when no Theme is saved", () => {
    const css = siteThemeCss(null)
    expect(css).toContain(`--primary:${CLASSIC.inputs.primary};`)
    expect(css).toContain(`--accent:${CLASSIC.inputs.accent};`)
  })

  it("cannot be closed early by a hostile family name", () => {
    const css = siteThemeCss({
      inputs: { ...CLASSIC.inputs, bodyFont: "font:5" },
      fonts: combineFonts([
        {
          id: 5,
          family: "x</style><script>alert(1)</script>",
          kind: "sans",
          files: [{ weight: 400, style: "normal", url: "/a.woff2" }],
        },
      ]),
    })
    expect(css.toLowerCase()).not.toContain("</style")
    expect(css).not.toContain("<")
  })
})
