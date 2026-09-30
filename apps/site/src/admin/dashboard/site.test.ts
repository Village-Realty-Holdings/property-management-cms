import { describe, expect, it } from "vitest"

import { DEFAULT_PALETTE } from "../../site/theme"
import { getThemeSummary, siteCardOf, themeStatusLine } from "./site"

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

describe("getThemeSummary", () => {
  it("offers the default palette until a Theme has been saved", () => {
    const summary = getThemeSummary()
    expect(summary.savedAt).toBeNull()
    expect(summary.swatches.map((s) => s.hex)).toEqual([
      DEFAULT_PALETTE.primary,
      DEFAULT_PALETTE.accent,
    ])
    expect(themeStatusLine(summary)).toBe("Not customised yet")
  })

  it("says when the Theme was last saved", () => {
    expect(
      themeStatusLine({ swatches: [], savedAt: "2026-03-01T10:00:00.000Z" })
    ).toMatch(/^Last saved /)
  })
})
