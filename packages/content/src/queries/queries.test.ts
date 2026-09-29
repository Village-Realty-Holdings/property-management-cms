import { afterEach, describe, expect, it } from "vitest"

import {
  fakeCms,
  lexical,
  page,
  TEST_BASE_URL,
  TEST_KEY,
  TEST_SITE,
  type Handler,
  type RecordedRequest,
} from "../rest/testing"
import { contentAdapter } from "./index"
import { SubmissionError } from "./submit"

const pool = {
  id: 10,
  feedId: "pool",
  name: "Pool",
  group: "Outdoor",
  icon: "pool",
  status: "active",
}
const view = {
  id: 11,
  feedId: "ocean-view",
  name: "Ocean view",
  group: "Location",
  icon: "waves",
  status: "active",
}
const wifi = {
  id: 12,
  feedId: "wifi",
  name: "Wi-Fi",
  group: "Indoor",
  icon: "wifi",
  status: "active",
}
const sauna = {
  id: 13,
  feedId: "sauna",
  name: "Sauna",
  group: "Indoor",
  icon: null,
  status: "withdrawn",
}
const condo = { id: 20, feedId: "condo", name: "Condo" }
const house = { id: 21, feedId: "house", name: "House" }

const siteDoc = {
  id: 2,
  name: "Demo Beach",
  slug: TEST_SITE,
  domain: "beach.example.com",
  branding: {
    logo: {
      id: 5,
      url: "/api/media/file/logo.png",
      alt: "Beach logo",
      width: 200,
      height: 80,
    },
    primaryColor: "#0e7c86",
    accentColor: "not-a-colour",
    fontPairing: "modern",
    tagline: "  Steps from the Gulf ",
    phone: "",
    email: "hello@beach.example.com",
    social: [
      { platform: "instagram", url: "https://instagram.com/beach" },
      { platform: "myspace", url: "https://myspace.com/beach" },
    ],
  },
  amenityPresentation: {
    filters: [{ amenity: view, label: "Gulf view" }, { amenity: pool }],
    hidden: [wifi],
  },
  propertyTypeLabels: {
    labels: [{ propertyType: condo, label: "Beach condo" }],
  },
  stayPolicyDefaults: { checkIn: "16:00", checkOut: "10:00", minimumAge: 25 },
}

const locations = [
  {
    id: 1,
    name: "Destin",
    displayName: null,
    slug: "destin",
    level: "destination",
    parent: null,
  },
  {
    id: 2,
    name: "Crystal Beach",
    displayName: "Crystal Beach, Destin",
    slug: "crystal-beach",
    level: "area",
    parent: 1,
  },
  {
    id: 3,
    name: "Long Beach Resort",
    slug: "long-beach-resort",
    level: "complex",
    parent: 2,
  },
  { id: 4, name: "Okaloosa", slug: "okaloosa", level: "area", parent: 1 },
  // Parent 99 is hidden: unreachable.
  { id: 5, name: "Orphan", slug: "orphan", level: "area", parent: 99 },
]

const property = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  feedId: `B-${id}`,
  slug: `p-${id}`,
  feedName: `Feed name ${id}`,
  headline: null,
  summary: null,
  feedDescription: `Feed description ${id}`,
  featured: false,
  location: { id: 3, slug: "long-beach-resort" },
  propertyType: condo,
  bedrooms: 2,
  bathrooms: 2,
  sleeps: 6,
  petsAllowed: false,
  rating: 4.5,
  reviewCount: 3,
  photos: [
    {
      url: "https://photos.feed.test/1.jpg",
      caption: null,
      width: 1200,
      height: 800,
    },
  ],
  ...extra,
})

/** Routes every collection the queries touch; `overrides` replace them. */
function cms(overrides: Record<string, Handler> = {}) {
  return fakeCms({
    sites: () => page([siteDoc]),
    locations: () => page(locations),
    amenities: () => page([pool, view, wifi, sauna]),
    "property-types": () => page([house, condo]),
    pages: () => page([]),
    reviews: () => page([]),
    specials: () => page([]),
    properties: () => page([]),
    ...overrides,
  })
}

const where = (r: RecordedRequest) => r.query.where as Record<string, unknown>
const of = (requests: RecordedRequest[], collection: string) =>
  requests.filter((r) => r.collection === collection)

let recorded: RecordedRequest[] = []

afterEach(() => {
  // Every request carries this Site's reader key and never names another Site.
  for (const request of recorded) {
    expect(request.url.startsWith(`${TEST_BASE_URL}/api/`)).toBe(true)
    expect(request.headers.Authorization).toBe(
      `site-readers API-Key ${TEST_KEY}`
    )
    expect(request.url).not.toMatch(/demo-mountain/)
    if (request.collection === "sites") {
      expect(where(request)).toEqual({ slug: { equals: TEST_SITE } })
    }
  }
  recorded = []
})

function track<T extends { requests: RecordedRequest[] }>(fake: T): T {
  recorded = fake.requests
  return fake
}

describe("loadSite", () => {
  it("throws when the reader key can't read SITE", async () => {
    const { ctx } = track(cms({ sites: () => page([]) }))
    await expect(contentAdapter(ctx()).getSiteSettings()).rejects.toThrow(
      /demo-beach/
    )
  })

  it("throws on a Site doc for another slug", async () => {
    const { ctx } = track(
      cms({ sites: () => page([{ ...siteDoc, slug: "demo-mountain-x" }]) })
    )
    await expect(contentAdapter(ctx()).getSiteSettings()).rejects.toThrow()
  })
})

describe("contentAdapter", () => {
  const withPromo = () =>
    page([{ ...siteDoc, customVariables: [{ key: "promo", value: "SUN" }] }])

  it("replaces the Site's Variables in Pages, published and Draft", async () => {
    const { ctx } = track(
      cms({
        sites: withPromo,
        pages: (r) =>
          page([
            {
              id: 1,
              title:
                r.query.draft === "true" ? "Draft {promo}" : "{site} {promo}",
              path: "/",
            },
          ]),
      })
    )
    expect((await contentAdapter(ctx()).getPage([]))?.title).toBe(
      `${siteDoc.name} SUN`
    )
    expect((await contentAdapter(ctx(true)).getPage([]))?.title).toBe(
      "Draft SUN"
    )
  })

  it("replaces them in Guides and the Guide list", async () => {
    const guide = { id: 1, slug: "g", title: "Save with {promo}" }
    const { ctx } = track(
      cms({ sites: withPromo, guides: () => page([guide]) })
    )
    const content = contentAdapter(ctx())
    expect((await content.getGuide("g"))?.title).toBe("Save with SUN")
    expect((await content.listGuides()).docs[0]?.title).toBe("Save with SUN")
  })

  it("doesn't read the Site for a Page that isn't there", async () => {
    const { ctx, requests } = track(cms())
    expect(await contentAdapter(ctx()).getPage(["missing"])).toBeNull()
    expect(of(requests, "sites")).toHaveLength(0)
  })
})

describe("getSiteSettings", () => {
  it("maps the Client and the Site's Variables", async () => {
    const { ctx } = track(
      cms({
        sites: () =>
          page([
            {
              ...siteDoc,
              client: { name: "Forever", website: "https://forever.example/" },
              customVariables: [{ key: "promo", value: "SUN" }],
            },
          ]),
      })
    )
    const settings = await contentAdapter(ctx()).getSiteSettings()
    expect(settings.client).toEqual({
      name: "Forever",
      url: "https://forever.example/",
    })
    expect(settings.variables).toMatchObject({
      site: siteDoc.name,
      client: "Forever",
      "client-url": "https://forever.example/",
      email: "hello@beach.example.com",
      phone: "",
      promo: "SUN",
    })
  })

  it("maps branding, filters, labels, navigation and Stay Policy defaults", async () => {
    const { ctx, requests } = track(
      cms({
        pages: () =>
          page([
            { id: 1, title: "Owners", path: "/owners", navOrder: 1 },
            { id: 2, title: "About", path: "/about", navOrder: 2 },
          ]),
      })
    )
    const settings = await contentAdapter(ctx()).getSiteSettings()

    expect(settings.slug).toBe(TEST_SITE)
    expect(settings.branding).toEqual({
      logo: {
        url: `${TEST_BASE_URL}/api/media/file/logo.png`,
        alt: "Beach logo",
        width: 200,
        height: 80,
      },
      primaryColor: "#0e7c86",
      fontPairing: "modern",
      tagline: "Steps from the Gulf",
      email: "hello@beach.example.com",
      social: [{ platform: "instagram", url: "https://instagram.com/beach" }],
    })
    expect(settings.contact).toEqual({
      email: "hello@beach.example.com",
      phone: null,
    })
    expect(settings.amenityFilters.map((a) => a.name)).toEqual([
      "Gulf view",
      "Pool",
    ])
    // Hidden Wi-Fi and withdrawn Sauna are dropped.
    expect(settings.amenities.map((a) => a.id)).toEqual(["11", "10"])
    expect(settings.propertyTypes).toEqual([
      { id: "21", feedId: "house", name: "House" },
      { id: "20", feedId: "condo", name: "Beach condo" },
    ])
    expect(settings.navigation).toEqual([
      { label: "Owners", href: "/owners" },
      { label: "About", href: "/about" },
    ])
    expect(settings.stayPolicyDefaults).toEqual({
      checkIn: "16:00",
      checkOut: "10:00",
      houseRules: null,
      cancellationPolicy: null,
      minimumAge: 25,
    })

    const nav = of(requests, "pages")[0]!
    expect(where(nav)).toEqual({ showInNav: { equals: "true" } })
    expect(nav.query.sort).toBe("navOrder,title")
  })
})

describe("getProperty", () => {
  it("returns null for an unknown or Withdrawn slug, asking only for Active", async () => {
    const { ctx, requests } = track(cms())
    expect(await contentAdapter(ctx()).getProperty("gone")).toBeNull()
    const find = of(requests, "properties")[0]!
    expect(where(find)).toEqual({
      and: [{ status: { equals: "active" } }, { slug: { equals: "gone" } }],
    })
    expect(find.query.limit).toBe("1")
    expect(find.query.depth).toBe("1")
  })

  it("falls back to Feed text and fills the Stay Policy from the Site", async () => {
    const { ctx } = track(
      cms({
        properties: () =>
          page([
            property(7, {
              amenities: [pool, wifi, view, sauna],
              stayPolicy: { checkIn: "15:00", houseRules: " " },
              description: lexical(""),
            }),
          ]),
      })
    )
    const p = await contentAdapter(ctx()).getProperty("p-7")

    expect(p?.name).toBe("Feed name 7")
    expect(p?.summary).toBe("Feed description 7")
    expect(p?.description).toBe("Feed description 7")
    expect(p?.richDescription).toBeNull()
    expect(p?.propertyType).toEqual({
      id: "20",
      feedId: "condo",
      name: "Beach condo",
    })
    expect(p?.location).toEqual({
      id: "3",
      name: "Long Beach Resort",
      slug: "long-beach-resort",
      level: "complex",
      path: ["destin", "crystal-beach", "long-beach-resort"],
    })
    expect(p?.amenities.map((a) => [a.name, a.filter])).toEqual([
      ["Gulf view", true],
      ["Pool", true],
    ])
    expect(p?.stayPolicy).toEqual({
      checkIn: "15:00",
      checkOut: "10:00",
      houseRules: null,
      cancellationPolicy: null,
      minimumAge: 25,
    })
    expect(p?.image).toEqual({
      url: "https://photos.feed.test/1.jpg",
      alt: "Feed name 7",
      width: 1200,
      height: 800,
    })
  })

  it("prefers Editorial Content", async () => {
    const { ctx } = track(
      cms({
        properties: () =>
          page([
            property(7, {
              headline: "Gulf-front condo",
              summary: "Sunsets daily.",
              description: lexical("First paragraph.", "Second."),
              highlights: [{ text: "Pool" }, { text: " " }],
            }),
          ]),
      })
    )
    const p = await contentAdapter(ctx()).getProperty("p-7")
    expect(p?.name).toBe("Gulf-front condo")
    expect(p?.summary).toBe("Sunsets daily.")
    expect(p?.description).toBe("First paragraph.\n\nSecond.")
    expect(p?.richDescription).not.toBeNull()
    expect(p?.highlights).toEqual(["Pool"])
  })

  it("reads shown Reviews and applicable Specials for the Property", async () => {
    const { ctx, requests } = track(
      cms({
        properties: () => page([property(7)]),
        reviews: () =>
          page([
            {
              id: 1,
              rating: 5,
              title: "Great",
              body: "Loved it",
              guestName: "Ann",
            },
          ]),
        specials: () =>
          page([
            {
              id: 3,
              slug: "stay-7",
              code: "SEVEN",
              title: null,
              summary: null,
              discountSummary: "7 for 6",
              properties: [{ id: 7, slug: "p-7" }, 8],
            },
            // No slug yet: not shown.
            { id: 4, slug: null, code: "X" },
          ]),
      })
    )
    const p = await contentAdapter(ctx()).getProperty("p-7")

    expect(p?.reviews).toEqual([
      {
        id: "1",
        rating: 5,
        title: "Great",
        body: "Loved it",
        guestName: "Ann",
        stayDate: null,
        managerResponse: null,
      },
    ])
    expect(where(of(requests, "reviews")[0]!)).toEqual({
      and: [
        { property: { equals: "7" } },
        { moderation: { equals: "shown" } },
        { status: { equals: "active" } },
      ],
    })

    expect(p?.specials).toHaveLength(1)
    expect(p?.specials[0]).toMatchObject({
      slug: "stay-7",
      title: "7 for 6",
      description: "7 for 6",
      propertyIds: ["7", "8"],
    })
    const specialsWhere = where(of(requests, "specials")[0]!) as {
      and: Record<string, unknown>[]
    }
    expect(specialsWhere.and).toContainEqual({ showOnSite: { equals: "true" } })
    expect(specialsWhere.and).toContainEqual({ status: { equals: "active" } })
    expect(specialsWhere.and).toContainEqual({ properties: { in: ["7"] } })
  })
})

describe("getProperties", () => {
  it("keeps the Feed's order and skips unknown Feed IDs", async () => {
    const { ctx, requests } = track(
      cms({ properties: () => page([property(1), property(2)]) })
    )
    const result = await contentAdapter(ctx()).getProperties([
      "B-2",
      "B-404",
      "B-1",
    ])
    expect(result.map((p) => p.feedId)).toEqual(["B-2", "B-1"])
    expect(where(of(requests, "properties")[0]!)).toEqual({
      and: [
        { status: { equals: "active" } },
        { feedId: { in: ["B-2", "B-404", "B-1"] } },
      ],
    })
  })

  it("makes no request for no Feed IDs", async () => {
    const { ctx, requests } = track(cms())
    expect(await contentAdapter(ctx()).getProperties([])).toEqual([])
    expect(requests).toHaveLength(0)
  })
})

describe("searchProperties", () => {
  it("compiles the rule with the Location's descendants and paginates", async () => {
    const { ctx, requests } = track(
      cms({
        properties: () =>
          page([property(1)], {
            totalDocs: 13,
            limit: 12,
            page: 2,
            totalPages: 2,
            hasPrevPage: true,
          }),
      })
    )
    const result = await contentAdapter(ctx()).searchProperties({
      locationId: "2",
      amenityIds: ["10"],
      minSleeps: 6,
      petsAllowed: false,
      page: 2,
      limit: 12,
      sort: "rating",
    })

    expect(result).toMatchObject({
      totalDocs: 13,
      page: 2,
      totalPages: 2,
      hasNextPage: false,
      hasPrevPage: true,
    })
    const find = of(requests, "properties")
    expect(find).toHaveLength(1)
    expect(where(find[0]!)).toEqual({
      and: [
        { status: { equals: "active" } },
        { location: { in: ["2", "3"] } },
        { sleeps: { greater_than_equal: "6" } },
        { amenities: { in: ["10"] } },
      ],
    })
    expect(find[0]!.query).toMatchObject({
      page: "2",
      limit: "12",
      sort: "-rating,feedName,id",
    })
  })

  it("defaults to Featured order and caps the page size", async () => {
    const { ctx, requests } = track(cms())
    await contentAdapter(ctx()).searchProperties({ limit: 5000 })
    expect(of(requests, "properties")[0]!.query).toMatchObject({
      page: "1",
      limit: "100",
      sort: "-featured,feedName,id",
    })
  })
})

describe("getCuratedList", () => {
  const list = {
    id: 9,
    slug: "gulf-and-pool",
    title: "Gulf view with a pool",
    intro: lexical("Our favourites."),
    rule: {
      location: { id: 1, slug: "destin" },
      amenities: [{ id: 10 }, { id: 11 }],
      petsAllowed: false,
    },
    sort: "sleeps",
  }

  it("resolves members with the two-step Amenity lookup and the list's sort", async () => {
    const { ctx, requests } = track(
      cms({
        "curated-lists": () => page([list]),
        properties: (r) =>
          (r.query.select as Record<string, unknown>).slug === undefined
            ? page([
                { id: 1, amenities: [10, 11] },
                { id: 2, amenities: [10] },
                { id: 3, amenities: [11, 10, 12] },
              ])
            : page([property(3), property(1)]),
      })
    )
    const result = await contentAdapter(ctx()).getCuratedList("gulf-and-pool")

    expect(result?.rule).toEqual({ locationId: "1", amenityIds: ["10", "11"] })
    expect(result?.sort).toBe("sleeps")
    expect(result?.description).toBe("Our favourites.")
    expect(result?.properties.map((p) => p.id)).toEqual(["3", "1"])

    const [prefilter, members] = of(requests, "properties")
    // Step 1: any of the Amenities, selecting only `amenities`.
    expect(prefilter!.query.select).toEqual({ amenities: "true" })
    expect(prefilter!.query.pagination).toBe("false")
    expect(where(prefilter!)).toEqual({
      and: [
        { status: { equals: "active" } },
        // Destin and its descendants; not the unreachable Orphan.
        { location: { in: ["1", "2", "4", "3"] } },
        { amenities: { in: ["10", "11"] } },
      ],
    })
    // Step 2: only the Properties with all of them.
    expect(where(members!)).toEqual({
      and: [
        { status: { equals: "active" } },
        { location: { in: ["1", "2", "4", "3"] } },
        { id: { in: ["1", "3"] } },
      ],
    })
    expect(members!.query.sort).toBe("-sleeps,feedName,id")
  })

  it("returns null for an unknown or unpublished list", async () => {
    const { ctx, requests } = track(cms({ "curated-lists": () => page([]) }))
    expect(await contentAdapter(ctx()).getCuratedList("draft")).toBeNull()
    expect(of(requests, "properties")).toHaveLength(0)
  })

  it("asks for the latest Draft in a Preview", async () => {
    const { ctx, requests } = track(cms({ "curated-lists": () => page([]) }))
    expect(await contentAdapter(ctx(true)).getCuratedList("x")).toBeNull()
    expect(of(requests, "curated-lists").map((r) => r.query.draft)).toEqual([
      "true",
    ])
  })
})

describe("getLocation", () => {
  it("resolves a slug path with ancestors, children and Complex details", async () => {
    const { ctx, requests } = track(
      cms({
        locations: (r) =>
          where(r) && "id" in where(r)
            ? page([
                {
                  id: 3,
                  intro: lexical("Gulf-front."),
                  complex: {
                    address: "1040 Hwy 98",
                    sharedAmenities: [pool, wifi],
                  },
                  heroImage: {
                    id: 8,
                    url: "https://r2.test/hero.jpg",
                    alt: "",
                  },
                },
              ])
            : page(locations),
      })
    )
    const result = await contentAdapter(ctx()).getLocation([
      "destin",
      "crystal-beach",
      "long-beach-resort",
    ])

    expect(result).toMatchObject({
      id: "3",
      level: "complex",
      path: ["destin", "crystal-beach", "long-beach-resort"],
      description: "Gulf-front.",
      heroImage: { url: "https://r2.test/hero.jpg", alt: "Long Beach Resort" },
      complex: { address: "1040 Hwy 98" },
    })
    expect(result?.complex?.sharedAmenities.map((a) => a.id)).toEqual(["10"])
    expect(result?.ancestors.map((l) => [l.name, l.path])).toEqual([
      ["Destin", ["destin"]],
      ["Crystal Beach, Destin", ["destin", "crystal-beach"]],
    ])
    expect(result?.children).toEqual([])
    const [tree] = of(requests, "locations")
    expect(tree!.query.pagination).toBe("false")
    expect(tree!.query.depth).toBe("0")
  })

  it("lists visible children by display name", async () => {
    const { ctx } = track(
      cms({
        locations: (r) =>
          where(r) && "id" in where(r) ? page([{ id: 1 }]) : page(locations),
      })
    )
    const root = await contentAdapter(ctx()).getLocation(["destin"])
    expect(root?.children.map((l) => l.slug)).toEqual([
      "crystal-beach",
      "okaloosa",
    ])
    expect(root?.complex).toBeNull()
  })

  it("rejects a broken chain, an unreachable Location and the empty path", async () => {
    const { ctx, requests } = track(cms())
    expect(
      await contentAdapter(ctx()).getLocation(["crystal-beach"])
    ).toBeNull()
    expect(
      await contentAdapter(ctx()).getLocation(["destin", "long-beach-resort"])
    ).toBeNull()
    expect(await contentAdapter(ctx()).getLocation(["orphan"])).toBeNull()
    expect(await contentAdapter(ctx()).getLocation([])).toBeNull()
    // Only the tree was read; no Location detail.
    expect(
      of(requests, "locations").every((r) => !("id" in (where(r) ?? {})))
    ).toBe(true)
  })
})

describe("getPage", () => {
  it("reads Home at [] and passes blocks through", async () => {
    const { ctx, requests } = track(
      cms({
        pages: () =>
          page([
            {
              id: 1,
              title: "Home",
              path: "/",
              layout: [{ blockType: "hero", heading: "Hi" }],
              seo: { title: "Beach", description: null, image: null },
            },
          ]),
      })
    )
    const result = await contentAdapter(ctx()).getPage([])
    expect(result).toEqual({
      id: "1",
      title: "Home",
      path: "/",
      template: "blank",
      blocks: [{ blockType: "hero", heading: "Hi" }],
      seo: { title: "Beach", description: null, image: null },
    })
    const find = of(requests, "pages")[0]!
    expect(where(find)).toEqual({ path: { equals: "/" } })
    expect(find.query.draft).toBeUndefined()
  })

  it("reads the Page Template, Blank unless Tuck-In", async () => {
    const { ctx } = track(
      cms({
        pages: () =>
          page([{ id: 2, title: "Joins", path: "/", template: "tuckIn" }]),
      })
    )
    expect((await contentAdapter(ctx()).getPage([]))?.template).toBe("tuckIn")
  })

  it("joins segments and reads the latest Draft in a Preview", async () => {
    const { ctx, requests } = track(
      cms({
        pages: (r) =>
          page(
            r.query.draft === "true"
              ? [{ id: 1, title: "About (draft)", path: "/company/team" }]
              : []
          ),
      })
    )
    const result = await contentAdapter(ctx(true)).getPage(["company", "team"])
    expect(result?.title).toBe("About (draft)")
    const finds = of(requests, "pages")
    expect(finds).toHaveLength(1)
    expect(where(finds[0]!)).toEqual({ path: { equals: "/company/team" } })
    expect(finds[0]!.query.draft).toBe("true")
  })
})

describe("guides", () => {
  it("lists newest first, filtered by Location", async () => {
    const { ctx, requests } = track(
      cms({
        guides: () =>
          page([
            {
              id: 1,
              slug: "kids",
              title: "Destin with kids",
              excerpt: "",
              publishedAt: "2026-05-01",
              locations: [{ id: 1, slug: "destin" }],
              properties: [7],
            },
          ]),
      })
    )
    const result = await contentAdapter(ctx()).listGuides({
      locationId: "1",
      limit: 5,
    })
    expect(result.docs[0]).toMatchObject({
      id: "1",
      excerpt: null,
      locationIds: ["1"],
      propertyIds: ["7"],
    })
    const find = of(requests, "guides")[0]!
    expect(where(find)).toEqual({ locations: { in: ["1"] } })
    expect(find.query).toMatchObject({
      limit: "5",
      sort: "-publishedAt,-createdAt",
    })
  })

  it("gets one by slug with its body", async () => {
    const { ctx, requests } = track(
      cms({
        guides: () =>
          page([{ id: 2, slug: "g", title: "G", body: lexical("Body") }]),
      })
    )
    const guide = await contentAdapter(ctx()).getGuide("g")
    expect(guide?.body).not.toBeNull()
    expect(of(requests, "guides")[0]!.query.select).toMatchObject({
      body: "true",
    })
  })
})

describe("specials", () => {
  it("lists shown, Active, unexpired Specials", async () => {
    const { ctx, requests } = track(
      cms({
        specials: () => page([{ id: 1, slug: "a", title: "A", code: "A" }]),
      })
    )
    expect(
      (await contentAdapter(ctx()).listSpecials()).map((s) => s.slug)
    ).toEqual(["a"])
    const and = (where(of(requests, "specials")[0]!) as { and: unknown[] }).and
    expect(and).toContainEqual({ showOnSite: { equals: "true" } })
    expect(and).toContainEqual({ status: { equals: "active" } })
    expect(JSON.stringify(and)).toMatch(/validTo/)
  })

  it("gets one by slug", async () => {
    const { ctx } = track(cms())
    expect(await contentAdapter(ctx()).getSpecial("nope")).toBeNull()
  })
})

describe("submit", () => {
  it("POSTs the Submission with depth=0 and returns its id", async () => {
    const { ctx, requests } = track(
      cms({ submissions: () => ({ doc: { id: 42 }, message: "Created" }) })
    )
    const result = await contentAdapter(ctx()).submit({
      kind: "inquiry",
      payload: { name: "Ann", email: "ann@example.com", extra: 1 },
      propertyId: "7",
      arrival: "2026-10-01",
      guests: 4,
      sourceUrl: "https://beach.example.com/rentals/p-7",
      website: "",
    })
    expect(result).toEqual({ id: "42" })
    const post = of(requests, "submissions")[0]!
    expect(post.method).toBe("POST")
    expect(post.query).toEqual({ depth: "0" })
    expect(post.body).toEqual({
      kind: "inquiry",
      name: "Ann",
      email: "ann@example.com",
      // Numeric IDs go as numbers: the CMS rejects "7".
      property: 7,
      arrival: "2026-10-01",
      guests: 4,
      sourceUrl: "https://beach.example.com/rentals/p-7",
      payload: { name: "Ann", email: "ann@example.com", extra: 1 },
      website: "",
    })
  })

  it("sends a non-numeric Property ID unchanged", async () => {
    const { ctx, requests } = track(
      cms({ submissions: () => ({ doc: { id: 43 }, message: "Created" }) })
    )
    await contentAdapter(ctx()).submit({
      kind: "inquiry",
      payload: {},
      name: "Ann",
      email: "ann@example.com",
      propertyId: "6650f1c2a9",
    })
    const post = of(requests, "submissions")[0]!
    expect((post.body as { property?: unknown }).property).toBe("6650f1c2a9")
  })

  it("throws a SubmissionError with field errors on a validation error", async () => {
    const { ctx } = track(
      cms({
        submissions: () =>
          Response.json(
            {
              errors: [
                {
                  name: "ValidationError",
                  message: "The following field is invalid: email",
                  data: {
                    collection: "submissions",
                    errors: [{ path: "email", message: "Enter an email." }],
                  },
                },
              ],
            },
            { status: 400 }
          ),
      })
    )
    const error = await contentAdapter(ctx())
      .submit({ kind: "contact", payload: {}, name: "A", email: "x" })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SubmissionError)
    expect((error as SubmissionError).errors).toEqual([
      { path: "email", message: "Enter an email." },
    ])
  })
})
