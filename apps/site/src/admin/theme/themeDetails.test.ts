import { describe, expect, it } from "vitest"

import { combineFonts } from "../../fonts/available"
import { CLASSIC, HARBOUR } from "../../theme"
import { formatSavedAt, themeDetails } from "./themeDetails"

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

describe("formatSavedAt", () => {
  it("is a readable UTC date and time", () => {
    expect(formatSavedAt("2026-03-01T10:05:00.000Z")).toMatch(
      /^Mar 1, 2026, 10:05\sAM UTC$/
    )
  })
})
