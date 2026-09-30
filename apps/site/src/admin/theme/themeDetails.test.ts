import { describe, expect, it } from "vitest"

import { combineFonts } from "../../fonts/available"
import { CLASSIC, HARBOUR } from "../../theme"
import { themeDetails } from "./themeDetails"

const stored = combineFonts([
  {
    id: 7,
    family: "Roboto Slab",
    kind: "slab",
    files: [{ weight: 400, style: "normal", url: "/a.woff2" }],
  },
])

describe("themeDetails", () => {
  it("lists the fonts by family and the controls by their labels", () => {
    const rows = themeDetails(HARBOUR.inputs, stored)
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.value]))
    expect(byLabel["Heading font"]).toBe("Bricolage Grotesque")
    expect(byLabel["Body font"]).toBe("Instrument Sans")
    expect(byLabel["Heading weight"]).toBe("Bold")
    expect(byLabel["Button corners"]).toBe("Square")
    expect(byLabel["Spacing"]).toBe("Spacious")
    expect(byLabel["Button letters"]).toBeDefined()
    expect(byLabel["Motion"]).toBeDefined()
  })

  it("names a stored Font by its family", () => {
    const rows = themeDetails(
      { ...CLASSIC.inputs, headingFont: "font:7" },
      stored
    )
    expect(rows.find((r) => r.label === "Heading font")?.value).toBe(
      "Roboto Slab"
    )
  })

  it("says so when a Font was deleted, and that the Classic font is used", () => {
    const rows = themeDetails(
      { ...CLASSIC.inputs, bodyFont: "font:99" },
      stored
    )
    expect(rows.find((r) => r.label === "Body font")?.value).toBe(
      "A deleted Font (Public Sans is used instead)"
    )
  })
})

describe("a stored Font with no files", () => {
  const fileless = combineFonts([
    { id: 8, family: "Montserrat", kind: "sans", files: [] },
  ])

  it("is named, with the built-in font the Site uses instead", () => {
    const rows = themeDetails(
      { ...CLASSIC.inputs, headingFont: "font:8", bodyFont: "font:8" },
      fileless
    )
    const value = (label: string) => rows.find((r) => r.label === label)?.value
    // Montserrat is Avada's brand font: the Site uses Avada's stand-in.
    expect(value("Heading font")).toBe(
      "Montserrat has no files (Bricolage Grotesque is used instead)"
    )
    expect(value("Body font")).toBe(
      "Montserrat has no files (Instrument Sans is used instead)"
    )
  })
})
