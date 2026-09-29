import { describe, expect, it } from "vitest"

import { fakeCms, page, TEST_SITE, type RecordedRequest } from "../rest/testing"
import { getSiteSettings } from "./site"
import { listSitemapEntries } from "./sitemap"

const at = "2026-09-01T00:00:00.000Z"

const siteDoc = {
  id: 2,
  name: "Demo Beach",
  slug: TEST_SITE,
  domain: "beach.example.com",
  legacyUrls: {
    propertyPattern: "property-details",
    redirects: [
      { from: "/old-about.html", to: "/about" },
      { from: "not-a-path", to: "/about" },
    ],
  },
}

function cms() {
  return fakeCms({
    sites: () => page([siteDoc]),
    amenities: () => page([]),
    "property-types": () => page([]),
    pages: () =>
      page([
        { id: 1, path: "/", updatedAt: at },
        { id: 2, path: "/about", updatedAt: null },
      ]),
    properties: () =>
      page([
        { id: 10, slug: "sea-breeze", updatedAt: at },
        { id: 11, slug: null, updatedAt: at },
      ]),
    locations: () =>
      page([
        { id: 1, name: "Destin", slug: "destin", parent: null, updatedAt: at },
        { id: 2, name: "Crystal", slug: "crystal-beach", parent: 1 },
        // Hidden parent: no URL.
        { id: 3, name: "Orphan", slug: "orphan", parent: 99 },
      ]),
    "curated-lists": () => page([{ id: 20, slug: "pet-friendly" }]),
    guides: () => page([{ id: 30, slug: "best-beaches", updatedAt: at }]),
    specials: () => page([{ id: 40, slug: "stay-7-pay-6" }, { id: 41 }]),
  })
}

const of = (requests: RecordedRequest[], collection: string) =>
  requests.find((r) => r.collection === collection)

describe("getSiteSettings: legacyUrls", () => {
  it("maps the Legacy URLs tab, dropping invalid redirects", async () => {
    const { ctx, requests } = cms()
    const settings = await getSiteSettings(ctx())
    expect(settings.legacyUrls).toEqual({
      propertyPattern: "property-details",
      redirects: [{ from: "/old-about.html", to: "/about" }],
    })
    expect(
      (of(requests, "sites")?.query.select as Record<string, unknown>)
        .legacyUrls
    ).toBe("true")
  })
})

describe("listSitemapEntries", () => {
  it("lists every public URL with its last change", async () => {
    const { ctx } = cms()
    expect(await listSitemapEntries(ctx())).toEqual([
      { kind: "page", path: "/", lastModified: at },
      { kind: "page", path: "/about", lastModified: null },
      { kind: "property", path: "/rentals/sea-breeze", lastModified: at },
      { kind: "location", path: "/areas/destin", lastModified: at },
      {
        kind: "location",
        path: "/areas/destin/crystal-beach",
        lastModified: null,
      },
      { kind: "curatedList", path: "/lists/pet-friendly", lastModified: null },
      { kind: "guide", path: "/guides/best-beaches", lastModified: at },
      { kind: "special", path: "/specials/stay-7-pay-6", lastModified: null },
    ])
  })

  it("asks for published/active documents only, never Drafts", async () => {
    const { ctx, requests } = cms()
    await listSitemapEntries(ctx(true))
    for (const request of requests) {
      expect(request.query.draft).toBeUndefined()
      expect(request.query.pagination).toBe("false")
    }
    expect(JSON.stringify(of(requests, "pages")?.query.where)).toContain(
      "published"
    )
    expect(JSON.stringify(of(requests, "properties")?.query.where)).toContain(
      "active"
    )
    expect(JSON.stringify(of(requests, "specials")?.query.where)).toContain(
      "showOnSite"
    )
  })
})
