import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getLegacyUrlSettings, isPropertySlug } from "./proxy"
import { getLegacyUrls, isLegacyPropertySlug } from "./queries/legacy"
import { fakeCms, page, TEST_SITE } from "./rest/testing"

describe("proxy reads: fake adapter", () => {
  beforeEach(() => {
    vi.stubEnv("CONTENT_ADAPTER", "fake")
    vi.stubEnv("SITE", "demo-mountain")
  })
  afterEach(() => vi.unstubAllEnvs())

  it("serves the Site's legacy URL settings and Property slugs", async () => {
    expect((await getLegacyUrlSettings()).propertyPattern).toBe("cabin-rentals")
    expect(await isPropertySlug("aspen-hideaway")).toBe(true)
    expect(await isPropertySlug("about")).toBe(false)
    vi.stubEnv("SITE", "demo-beach")
    expect(await isPropertySlug("aspen-hideaway")).toBe(false)
  })
})

describe("proxy reads: REST queries", () => {
  it("reads only the Legacy URLs tab of SITE", async () => {
    const { ctx, requests } = fakeCms({
      sites: () =>
        page([
          {
            id: 2,
            slug: TEST_SITE,
            legacyUrls: { propertyPattern: "root", redirects: [] },
          },
        ]),
    })
    expect(await getLegacyUrls(ctx())).toEqual({
      propertyPattern: "root",
      redirects: [],
    })
    expect(requests[0]?.query.where).toEqual({
      slug: { equals: TEST_SITE },
    })
    expect(requests[0]?.query.select).toEqual({
      slug: "true",
      legacyUrls: "true",
    })
  })

  it("throws when the reader key can't read SITE", async () => {
    const { ctx } = fakeCms({ sites: () => page([]) })
    await expect(getLegacyUrls(ctx())).rejects.toThrow(TEST_SITE)
  })

  it("accepts a root-level slug only for an Active Property without a Page", async () => {
    const property = { id: 1, slug: "sea-breeze" }
    const check = async (properties: unknown[], pages: unknown[]) => {
      const { ctx } = fakeCms({
        properties: () => page(properties),
        pages: () => page(pages),
      })
      return isLegacyPropertySlug(ctx(), "sea-breeze")
    }
    expect(await check([property], [])).toBe(true)
    expect(await check([], [])).toBe(false)
    expect(await check([property], [{ id: 9, path: "/sea-breeze" }])).toBe(
      false
    )
  })
})
