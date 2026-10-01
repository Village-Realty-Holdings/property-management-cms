import { describe, expect, it } from "vitest"

import { themeCss } from "./css"
import { deriveTheme } from "./derive"
import { HARBOUR } from "./presets"

const fonts = { heading: '"Fraunces", serif', body: "system-ui" }
const theme = deriveTheme(HARBOUR.inputs, fonts)

describe("themeCss", () => {
  it("writes every light token at :root", () => {
    const css = themeCss(theme)
    expect(css.startsWith(":root{")).toBe(true)
    for (const [name, value] of Object.entries(theme.schemes.light))
      expect(css).toContain(`${name}:${value};`)
  })

  it("adds the reduced-motion override after the tokens", () => {
    const css = themeCss(theme)
    const media =
      "@media (prefers-reduced-motion:reduce){:root{--duration:0ms;--btn-lift:0px;}}"
    expect(css.endsWith(media)).toBe(true)
  })

  it("scopes to another selector when asked (an editor preview)", () => {
    const css = themeCss(theme, { selector: ".theme-preview" })
    expect(css.startsWith(".theme-preview{")).toBe(true)
    expect(css).toContain(
      "@media (prefers-reduced-motion:reduce){.theme-preview{"
    )
  })

  it("ignores a selector that could break out of the rule", () => {
    expect(themeCss(theme, { selector: "a{}body" }).startsWith(":root{")).toBe(
      true
    )
    expect(themeCss(theme, { selector: "</style>" }).startsWith(":root{")).toBe(
      true
    )
  })

  it("strips characters that could end the rule or the style element", () => {
    const hostile = deriveTheme(HARBOUR.inputs, {
      heading: 'x};</style><script>alert(1)</script>{a:"',
      body: "y/*comment*/z\\n",
    })
    const css = themeCss(hostile)
    const declarations = css.slice(":root{".length, css.indexOf("}@media"))
    expect(declarations).not.toMatch(/[<>{}]/)
    expect(declarations).not.toContain("/*")
    expect(declarations).not.toContain("\\")
    // Every declaration is still one `--name:value` pair.
    for (const declaration of declarations.split(";").filter(Boolean))
      expect(declaration).toMatch(/^--[a-z0-9-]+:/)
    expect(css.match(/\{/g)).toHaveLength(3)
    expect(css.match(/\}/g)).toHaveLength(3)
  })

  it("drops a token whose name is not a custom property", () => {
    const odd = {
      schemes: { light: { "--ok": "1", "color:red;--x": "2", plain: "3" } },
      reducedMotion: {},
    }
    expect(themeCss(odd)).toBe(":root{--ok:1;}")
  })
})
