import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as content from "../index"

const onSite = (site: string) => vi.stubEnv("SITE", site)

beforeEach(() => {
  vi.stubEnv("CONTENT_ADAPTER", "fake")
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("fake adapter: legacy URLs and sitemap", () => {
  it("exposes each Site's legacy URL settings", async () => {
    onSite("demo-mountain")
    expect((await content.getSiteSettings()).legacyUrls.propertyPattern).toBe(
      "cabin-rentals"
    )
    onSite("demo-beach")
    expect((await content.getSiteSettings()).legacyUrls.propertyPattern).toBe(
      "property-details"
    )
  })

  it("lists only the Site's published URLs", async () => {
    onSite("demo-mountain")
    const mountain = (await content.listSitemapEntries()).map((e) => e.path)
    onSite("demo-beach")
    const beach = (await content.listSitemapEntries()).map((e) => e.path)

    expect(mountain).toContain("/")
    expect(mountain).toContain("/areas/park-city")
    expect(mountain).toContain("/lists/pet-friendly-park-city")
    expect(mountain).toContain("/guides/best-walks-near-park-city")
    expect(mountain).toContain("/specials/early-bird")
    // Drafts, expired Specials and unreachable Locations are left out.
    expect(mountain).not.toContain("/lists/draft-list")
    expect(mountain).not.toContain("/specials/expired")
    expect(mountain.some((p) => p.endsWith("/old-node"))).toBe(false)

    expect(beach).toContain("/areas/destin/crystal-beach")
    expect(new Set(beach).size).toBe(beach.length)
    // No Property or Location URL is shared between the Sites.
    const own = (p: string) => /^\/(rentals|areas)\//.test(p)
    expect(beach.filter(own).length).toBeGreaterThan(0)
    expect(beach.filter((p) => own(p) && mountain.includes(p))).toEqual([])
  })
})
