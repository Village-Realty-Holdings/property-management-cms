import { describe, expect, it } from "vitest"

import {
  legacyUrlSettingsFrom,
  matchLegacyUrl,
  normalizeLegacyPath,
  validateLegacyRedirect,
  validateLegacyRedirects,
  type LegacyUrlSettings,
} from "./legacyUrls"

const settings = (
  propertyPattern: LegacyUrlSettings["propertyPattern"],
  redirects: LegacyUrlSettings["redirects"] = []
): LegacyUrlSettings => ({ propertyPattern, redirects })

describe("matchLegacyUrl", () => {
  it("maps the Site's legacy Property pattern to the Property slug", () => {
    const cabins = settings("cabin-rentals")
    expect(matchLegacyUrl("/cabin-rentals/bear-hollow-lodge", cabins)).toEqual({
      kind: "property",
      slug: "bear-hollow-lodge",
      verify: false,
    })
    expect(matchLegacyUrl("/Cabin-Rentals/Bear-Hollow/", cabins)).toEqual({
      kind: "property",
      slug: "bear-hollow",
      verify: false,
    })
    // Only that Site's pattern.
    expect(matchLegacyUrl("/property-details/bear-hollow", cabins)).toBeNull()
    // Not the listing itself, nor deeper paths.
    expect(matchLegacyUrl("/cabin-rentals", cabins)).toBeNull()
    expect(matchLegacyUrl("/cabin-rentals/a/b", cabins)).toBeNull()

    expect(
      matchLegacyUrl(
        "/property-details/sea-breeze",
        settings("property-details")
      )
    ).toEqual({ kind: "property", slug: "sea-breeze", verify: false })
  })

  it("asks to verify root-level slugs and skips files", () => {
    const root = settings("root")
    expect(matchLegacyUrl("/bear-hollow-lodge", root)).toEqual({
      kind: "property",
      slug: "bear-hollow-lodge",
      verify: true,
    })
    expect(matchLegacyUrl("/favicon.ico", root)).toBeNull()
    expect(matchLegacyUrl("/about/team", root)).toBeNull()
    expect(matchLegacyUrl("/", root)).toBeNull()
  })

  it("never redirects the new Site's routes", () => {
    for (const pattern of ["root", "rentals", "none"] as const) {
      const s = settings(pattern, [{ from: "/rentals/x", to: "/y" }])
      expect(matchLegacyUrl("/rentals/x", s)).toBeNull()
      expect(matchLegacyUrl("/rentals", s)).toBeNull()
      expect(matchLegacyUrl("/areas/park-city", s)).toBeNull()
      expect(matchLegacyUrl("/api/preview", s)).toBeNull()
      expect(matchLegacyUrl("/_next/static/x.js", s)).toBeNull()
    }
  })

  it("applies one-off redirects before the pattern", () => {
    const s = settings("root", [
      { from: "/About-Us.html", to: "/about" },
      { from: "/bear-hollow-lodge", to: "/lists/cabins" },
    ])
    expect(matchLegacyUrl("/about-us.html", s)).toEqual({
      kind: "redirect",
      to: "/about",
    })
    expect(matchLegacyUrl("/bear-hollow-lodge/", s)).toEqual({
      kind: "redirect",
      to: "/lists/cabins",
    })
    expect(matchLegacyUrl("/other", settings("none"))).toBeNull()
  })
})

describe("one-off redirect chains", () => {
  it("follows a chain to its end and never loops", () => {
    const chain = settings("none", [
      { from: "/a", to: "/b" },
      { from: "/b", to: "/c?x=1" },
    ])
    expect(matchLegacyUrl("/a", chain)).toEqual({
      kind: "redirect",
      to: "/c?x=1",
    })
    const loop = settings("none", [
      { from: "/a", to: "/b" },
      { from: "/B/", to: "/a" },
      { from: "/c", to: "/a" },
    ])
    expect(matchLegacyUrl("/a", loop)).toBeNull()
    expect(matchLegacyUrl("/c", loop)).toBeNull()
  })

  it("reports loops for the CMS", () => {
    expect(
      validateLegacyRedirects([
        { from: "/a", to: "/b" },
        { from: "/b", to: "/c" },
      ])
    ).toBe(true)
    expect(
      validateLegacyRedirects([
        { from: "/a", to: "/b" },
        { from: "/b", to: "/a" },
      ])
    ).toMatch(/back to itself/)
    expect(validateLegacyRedirects([{ from: "/a" }, {}])).toBe(true)
  })
})

describe("normalizeLegacyPath", () => {
  it("drops query, hash and trailing slashes and decodes", () => {
    expect(normalizeLegacyPath("/A%20b/?x=1#y")).toBe("/a b")
    expect(normalizeLegacyPath("/")).toBe("/")
    expect(normalizeLegacyPath("about")).toBeNull()
    expect(normalizeLegacyPath("//evil.example.com")).toBeNull()
    expect(normalizeLegacyPath("/%E0%A4%A")).toBe("/%e0%a4%a")
  })
})

describe("validateLegacyRedirect", () => {
  it("accepts paths and rejects loops, home and canonical sources", () => {
    expect(validateLegacyRedirect("/old", "/new")).toBe(true)
    expect(validateLegacyRedirect("old", "/new")).toMatch(/From/)
    expect(validateLegacyRedirect("/old", "https://x.test")).toMatch(/To/)
    expect(validateLegacyRedirect("/old/", "/old")).toMatch(/same/)
    expect(validateLegacyRedirect("/", "/new")).toMatch(/home/)
    expect(validateLegacyRedirect("/rentals/x", "/new")).toMatch(/rentals/)
  })
})

describe("legacyUrlSettingsFrom", () => {
  it("defaults to none and drops invalid rows", () => {
    expect(legacyUrlSettingsFrom(null)).toEqual(settings("none"))
    expect(
      legacyUrlSettingsFrom({
        propertyPattern: "bogus",
        redirects: [
          { from: " /old ", to: "/new" },
          { from: "/x", to: null },
          { from: "/api/x", to: "/y" },
          null,
        ],
      })
    ).toEqual(settings("none", [{ from: "/old", to: "/new" }]))
    expect(legacyUrlSettingsFrom({ propertyPattern: "cabin-rentals" })).toEqual(
      settings("cabin-rentals")
    )
  })
})
