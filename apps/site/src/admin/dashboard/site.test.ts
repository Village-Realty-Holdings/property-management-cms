import { describe, expect, it } from "vitest"

import { CLASSIC, HARBOUR } from "../../theme"
import { siteCardOf, themeStatusLine, themeSummaryOf } from "./site"

const brand = {
  name: "Warren Beach",
  tagline: null,
  logo: { url: "/logo.png", alt: "Warren Beach logo" },
  phone: null,
  email: null,
  address: null,
  social: [],
}

describe("siteCardOf", () => {
  it("shows the Brand's name and logo and the domain from SITE_URL", () => {
    expect(
      siteCardOf(brand, { SITE_URL: "https://www.warrenbeach.example" })
    ).toEqual({
      name: "Warren Beach",
      logo: { url: "/logo.png", alt: "Warren Beach logo" },
      domain: "www.warrenbeach.example",
      url: "https://www.warrenbeach.example",
      schema: "public",
    })
  })

  it("shows the schema in the badge, or public when there is none", () => {
    expect(siteCardOf(brand, { DATABASE_SCHEMA: "avada" }).schema).toBe("avada")
    expect(siteCardOf(brand, { DATABASE_SCHEMA: " " }).schema).toBe("public")
  })

  it("falls back to the development origin", () => {
    expect(siteCardOf(brand, {}).domain).toBe("localhost:3000")
  })

  it("has no domain (rather than failing) when SITE_URL is invalid", () => {
    const card = siteCardOf(brand, { SITE_URL: "not a url" })
    expect(card.domain).toBeNull()
    expect(card.url).toBe("/")
  })
})

describe("themeSummaryOf", () => {
  it("offers the default preset's colours until a Theme has been saved", () => {
    const summary = themeSummaryOf({
      source: "default",
      inputs: CLASSIC.inputs,
      savedAt: null,
    })
    expect(summary.savedAt).toBeNull()
    expect(summary.swatches).toEqual([
      { name: "Primary", hex: CLASSIC.inputs.primary },
      { name: "Accent", hex: CLASSIC.inputs.accent },
      { name: "Text", hex: CLASSIC.inputs.text },
    ])
    expect(themeStatusLine(summary)).toBe("Not customised yet")
  })

  it("shows the saved Theme's colours, with the Third colour when set", () => {
    const summary = themeSummaryOf({
      source: "saved",
      inputs: { ...HARBOUR.inputs, third: "#12a4b6" },
      savedAt: "2026-03-01T10:00:00.000Z",
    })
    expect(summary.swatches.map((s) => [s.name, s.hex])).toEqual([
      ["Primary", HARBOUR.inputs.primary],
      ["Accent", HARBOUR.inputs.accent],
      ["Third", "#12a4b6"],
      ["Text", HARBOUR.inputs.text],
    ])
    expect(summary.savedAt).toBe("2026-03-01T10:00:00.000Z")
  })

  it("says when the Theme was last saved", () => {
    expect(
      themeStatusLine({ swatches: [], savedAt: "2026-03-01T10:00:00.000Z" })
    ).toMatch(/^Last saved /)
  })
})
