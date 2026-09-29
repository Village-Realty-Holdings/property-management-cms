import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as content from "../index"
import { cacheTags, toPagePath } from "../shared"

const onSite = (site: string) => vi.stubEnv("SITE", site)

beforeEach(() => {
  vi.stubEnv("CONTENT_ADAPTER", "fake")
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("fake adapter: Site isolation", () => {
  it("serves each Site only its own Site Settings", async () => {
    onSite("demo-mountain")
    expect((await content.getSiteSettings()).slug).toBe("demo-mountain")
    onSite("demo-beach")
    expect((await content.getSiteSettings()).slug).toBe("demo-beach")
  })

  it("never returns another Site's Properties", async () => {
    onSite("demo-beach")
    const beach = await content.searchProperties({ limit: 100 })
    expect(beach.docs.length).toBeGreaterThan(0)
    expect(beach.docs.every((p) => p.id.startsWith("b-"))).toBe(true)

    const mountainSlug = "aspen-hideaway"
    expect(await content.getProperty(mountainSlug)).toBeNull()
    onSite("demo-mountain")
    expect(await content.getProperty(mountainSlug)).not.toBeNull()
  })

  it("ignores another Site's Feed IDs in getProperties", async () => {
    onSite("demo-mountain")
    const result = await content.getProperties(["B-1000", "M-1001", "M-1000"])
    expect(result.map((p) => p.feedId)).toEqual(["M-1001", "M-1000"])
  })

  it("scopes Locations, Pages, Guides, Curated Lists and Specials", async () => {
    onSite("demo-beach")
    expect(await content.getLocation(["park-city"])).toBeNull()
    expect(await content.getCuratedList("pet-friendly-park-city")).toBeNull()
    expect(await content.getGuide("best-walks-near-park-city")).toBeNull()
    expect(await content.getSpecial("early-bird")).toBeNull()
    expect((await content.getPage(["about"]))?.id).toBe("b-pg2")

    onSite("demo-mountain")
    expect(await content.getLocation(["destin"])).toBeNull()
    expect((await content.getPage(["about"]))?.id).toBe("m-pg2")
  })

  it("fails loudly for an unknown Site", async () => {
    onSite("nope")
    await expect(content.getSiteSettings()).rejects.toThrow()
  })

  it("stores Submissions against the current Site", async () => {
    onSite("demo-beach")
    const { id } = await content.submit({
      kind: "inquiry",
      payload: { name: "Guest" },
    })
    expect(id).toMatch(/^demo-beach-/)
  })
})

describe("fake adapter: visibility", () => {
  beforeEach(() => onSite("demo-mountain"))

  it("hides Withdrawn Properties", async () => {
    expect(await content.getProperty("retired-retreat")).toBeNull()
    const all = await content.searchProperties({ limit: 100 })
    expect(all.docs.map((p) => p.slug)).not.toContain("retired-retreat")
    expect(all.totalDocs).toBe(7)
  })

  it("hides drafts, hidden Locations, hidden Reviews and expired Specials", async () => {
    expect(await content.getPage(["secret"])).toBeNull()
    expect(await content.getCuratedList("draft-list")).toBeNull()
    expect(await content.getLocation(["park-city", "old-node"])).toBeNull()
    const property = await content.getProperty("silver-lake-201")
    expect(property?.reviews.map((r) => r.body)).toEqual(["Wonderful stay."])
    expect((await content.listSpecials()).map((s) => s.slug)).toEqual([
      "early-bird",
    ])
  })

  it("resolves a Location with ancestors and children, incl. a Complex", async () => {
    const complex = await content.getLocation([
      "park-city",
      "deer-valley",
      "silver-lake-lodge",
    ])
    expect(complex?.level).toBe("complex")
    expect(complex?.ancestors.map((l) => l.slug)).toEqual([
      "park-city",
      "deer-valley",
    ])
    const root = await content.getLocation(["park-city"])
    // By display name ("Canyons Village at Park City").
    expect(root?.children.map((l) => l.slug)).toEqual([
      "canyons-village",
      "deer-valley",
    ])
    expect(root?.children[0]?.name).toBe("Canyons Village at Park City")
    expect(complex?.complex?.sharedAmenities.map((a) => a.id)).toEqual([
      "a2",
      "a1",
    ])
    expect(root?.complex).toBeNull()
  })

  it("resolves Curated List members from the rule, including sub-Locations", async () => {
    const list = await content.getCuratedList("pet-friendly-park-city")
    expect(list?.properties.map((p) => p.slug).sort()).toEqual(
      ["aspen-hideaway", "bear-den-cabin", "canyons-chalet"].sort()
    )
  })

  it("searches by facts and paginates", async () => {
    const result = await content.searchProperties({
      amenityIds: ["a1"],
      minSleeps: 8,
      limit: 2,
    })
    expect(result.totalDocs).toBe(4)
    expect(result.docs).toHaveLength(2)
    expect(result.hasNextPage).toBe(true)
  })

  it("serves Home at the empty path", async () => {
    expect((await content.getPage([]))?.title).toBe("Home")
  })
})

describe("fake adapter: REST-shaped output", () => {
  it("gives each Site its own branding, filters, labels and nav", async () => {
    onSite("demo-mountain")
    const mountain = await content.getSiteSettings()
    expect(mountain.branding).toMatchObject({
      primaryColor: "#1f4d3a",
      accentColor: "#d98e04",
      fontPairing: "rustic",
      logo: null,
    })
    expect(mountain.amenityFilters.map((a) => a.name)).toEqual([
      "Ski-in / ski-out",
      "Hot tub",
      "Fireplace",
    ])
    // Hidden (Ocean view) and withdrawn (Sauna) Amenities are dropped.
    expect(mountain.amenities.map((a) => a.id)).not.toContain("a5")
    expect(mountain.amenities.map((a) => a.id)).not.toContain("a7")
    expect(mountain.propertyTypes.find((t) => t.id === "t1")?.name).toBe(
      "Log cabin"
    )
    expect(mountain.navigation).toEqual([
      { label: "Owners", href: "/owners" },
      { label: "About", href: "/about" },
    ])
    expect(mountain.contact.phone).toBe("+1 435 555 0100")

    onSite("demo-beach")
    const beach = await content.getSiteSettings()
    expect(beach.branding).toMatchObject({
      primaryColor: "#0e7c86",
      accentColor: "#ff6f59",
      fontPairing: "modern",
    })
    expect(beach.amenityFilters[0]?.name).toBe("Gulf view")
  })

  it("fills the Stay Policy from the Site's defaults and lists Specials", async () => {
    onSite("demo-mountain")
    const p = await content.getProperty("aspen-hideaway")
    expect(p?.name).toBe("Aspen Hideaway: our favourite")
    expect(p?.stayPolicy).toMatchObject({ checkIn: "15:00", checkOut: "10:00" })
    expect(p?.specials.map((s) => s.slug)).toEqual(["early-bird"])
    expect(p?.amenities.map((a) => a.name)).toEqual([
      "Hot tub",
      "Fireplace",
      "Wi-Fi",
    ])
    const loft = await content.getProperty("silver-lake-201")
    expect(loft?.stayPolicy.checkIn).toBe("16:00")
    expect(loft?.description).toMatch(/Property Feed/)
  })

  it("treats petsAllowed false as any, like the compiler", async () => {
    onSite("demo-mountain")
    const any = await content.searchProperties({ limit: 100 })
    const notFalse = await content.searchProperties({
      petsAllowed: false,
      limit: 100,
    })
    expect(notFalse.totalDocs).toBe(any.totalDocs)
  })

  it("sorts Curated List members by the list's sort", async () => {
    onSite("demo-mountain")
    const list = await content.getCuratedList("hot-tub-and-fireplace")
    expect(list?.sort).toBe("sleeps")
    expect(list?.properties.map((p) => p.slug)).toEqual([
      "canyons-chalet",
      "aspen-hideaway",
    ])
  })

  it("rejects a filled-in honeypot", async () => {
    onSite("demo-beach")
    await expect(
      content.submit({ kind: "contact", payload: {}, website: "spam" })
    ).rejects.toBeInstanceOf(content.SubmissionError)
  })
})

describe("shared", () => {
  it("builds cache tags and Page paths", () => {
    expect(cacheTags.property("x")).toBe("property:x")
    expect(cacheTags.page(toPagePath(["company", "team"]))).toBe(
      "page:/company/team"
    )
    expect(toPagePath([])).toBe("/")
  })
})
