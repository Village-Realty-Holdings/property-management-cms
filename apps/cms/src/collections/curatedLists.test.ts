import type { Payload, TypedUser, Where } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

// apps/cms has no package dependency on @workspace/content yet; the shared
// module is pure TS, so import its source directly.
import {
  curatedListPrefilter,
  curatedListRuleFrom,
  curatedListWhere,
  propertiesWithAllAmenities,
  type CuratedListRule,
  type CuratedListWhereOptions,
} from "../../../../packages/content/src/shared"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"

/**
 * Curated List rules (ADR-0003) compiled by `curatedListWhere` against the
 * real Postgres adapter: descendant Locations, all-of Amenities, any-of
 * Property Types, minimums and pets. Also covers the same-Site
 * `filterOptions` on Curated Lists and Guides.
 */

type ID = number

let t: TestPayload
let payload: Payload

let siteA: ID
let siteB: ID
let readerA: TypedUser | null

const loc: Record<string, ID> = {}
const amenity: Record<string, ID> = {}
const type: Record<string, ID> = {}
const prop: Record<string, ID> = {}

/** Every Location inside `id`, at any depth (what apps/site resolves). */
async function descendantsOf(id: ID): Promise<string[]> {
  const found: string[] = []
  let parents: ID[] = [id]
  while (parents.length > 0) {
    const { docs } = await payload.find({
      collection: "locations",
      where: { parent: { in: parents } },
      depth: 0,
      pagination: false,
    })
    parents = docs.map((doc) => doc.id)
    found.push(...parents.map(String))
  }
  return found
}

/** Member keys of `rule` (Site A only unless `user` is given). */
async function members(
  rule: CuratedListRule,
  options: { user?: TypedUser | null } = {}
): Promise<string[]> {
  const as = options.user
    ? { user: options.user, overrideAccess: false }
    : { overrideAccess: true }
  const onSite = (where: Where): Where =>
    options.user ? where : { and: [where, { site: { equals: siteA } }] }

  const whereOptions: CuratedListWhereOptions = {
    descendantLocationIds: rule.locationId
      ? await descendantsOf(Number(rule.locationId))
      : [],
  }
  const prefilter = curatedListPrefilter(rule, whereOptions)
  if (prefilter) {
    const { docs } = await payload.find({
      collection: "properties",
      where: onSite(prefilter),
      select: { amenities: true },
      depth: 0,
      pagination: false,
      ...as,
    })
    whereOptions.propertyIdsWithAllAmenities = propertiesWithAllAmenities(
      docs,
      rule
    )
  }

  const { docs } = await payload.find({
    collection: "properties",
    where: onSite(curatedListWhere(rule, whereOptions)),
    depth: 0,
    pagination: false,
    ...as,
  })
  const keyOf = Object.fromEntries(
    Object.entries(prop).map(([key, id]) => [id, key])
  )
  return docs.map((doc) => keyOf[doc.id] ?? String(doc.id)).sort()
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload

  siteA = (
    await payload.create({
      collection: "sites",
      data: { name: "Site A", slug: "site-a", revalidationSecret: "secret-a" },
    })
  ).id
  siteB = (
    await payload.create({
      collection: "sites",
      data: { name: "Site B", slug: "site-b", revalidationSecret: "secret-b" },
    })
  ).id

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "lists-reader-a" },
  })
  readerA = (
    await payload.auth({
      headers: new Headers({
        Authorization: "site-readers API-Key lists-reader-a",
      }),
    })
  ).user

  // Park City › Deer Valley › Stein Lodge; Destin; Site B's Aspen.
  for (const [key, site, parent] of [
    ["parkCity", siteA, undefined],
    ["deerValley", siteA, "parkCity"],
    ["steinLodge", siteA, "deerValley"],
    ["destin", siteA, undefined],
    ["aspen", siteB, undefined],
  ] as const) {
    const doc = await payload.create({
      collection: "locations",
      data: {
        site,
        feedId: key,
        name: key,
        status: "active",
        ...(parent ? { parent: loc[parent]! } : {}),
      },
    })
    loc[key] = doc.id
  }

  for (const key of ["hotTub", "wifi", "grill"]) {
    amenity[key] = (
      await payload.create({
        collection: "amenities",
        data: { feedId: key, name: key },
      })
    ).id
  }
  for (const key of ["cabin", "condo"]) {
    type[key] = (
      await payload.create({
        collection: "property-types",
        data: { feedId: key, name: key },
      })
    ).id
  }

  const rows = [
    // key, site, location, amenities, type, bedrooms, sleeps, pets, status
    [
      "deerCabin",
      siteA,
      "deerValley",
      ["hotTub", "wifi"],
      "cabin",
      3,
      8,
      true,
      "active",
    ],
    [
      "steinCondo",
      siteA,
      "steinLodge",
      ["wifi", "hotTub"],
      "condo",
      4,
      10,
      false,
      "active",
    ],
    [
      "parkHotTubOnly",
      siteA,
      "parkCity",
      ["hotTub"],
      "cabin",
      3,
      8,
      true,
      "active",
    ],
    [
      "parkAll",
      siteA,
      "parkCity",
      ["grill", "hotTub", "wifi"],
      "cabin",
      1,
      2,
      false,
      "active",
    ],
    [
      "parkWithdrawn",
      siteA,
      "parkCity",
      ["hotTub", "wifi"],
      "cabin",
      3,
      8,
      true,
      "withdrawn",
    ],
    [
      "destinCabin",
      siteA,
      "destin",
      ["hotTub", "wifi"],
      "cabin",
      5,
      12,
      true,
      "active",
    ],
    [
      "aspenCabin",
      siteB,
      "aspen",
      ["hotTub", "wifi"],
      "cabin",
      5,
      12,
      true,
      "active",
    ],
  ] as const
  for (const [
    key,
    site,
    location,
    amenities,
    propertyType,
    bedrooms,
    sleeps,
    petsAllowed,
    status,
  ] of rows) {
    const doc = await payload.create({
      collection: "properties",
      data: {
        site,
        feedId: key,
        feedName: key,
        status,
        location: loc[location]!,
        amenities: amenities.map((a) => amenity[a]!),
        propertyType: type[propertyType],
        bedrooms,
        sleeps,
        petsAllowed,
      },
    })
    prop[key] = doc.id
  }
})

afterAll(() => t?.teardown())

describe("curatedListWhere on Postgres", () => {
  const hotTubAndWifi = () => [String(amenity.hotTub), String(amenity.wifi)]

  it("matches every Active Property for an empty rule", async () => {
    expect(await members({})).toEqual([
      "deerCabin",
      "destinCabin",
      "parkAll",
      "parkHotTubOnly",
      "steinCondo",
    ])
  })

  it("includes Properties in descendant Locations", async () => {
    expect(await members({ locationId: String(loc.parkCity) })).toEqual([
      "deerCabin",
      "parkAll",
      "parkHotTubOnly",
      "steinCondo",
    ])
    expect(await members({ locationId: String(loc.deerValley) })).toEqual([
      "deerCabin",
      "steinCondo",
    ])
  })

  it("requires all of the Amenities", async () => {
    expect(await members({ amenityIds: hotTubAndWifi() })).toEqual([
      "deerCabin",
      "destinCabin",
      "parkAll",
      "steinCondo",
    ])
    expect(
      await members({
        amenityIds: [...hotTubAndWifi(), String(amenity.grill)],
      })
    ).toEqual(["parkAll"])
    expect(
      await members({ amenityIds: [String(amenity.grill), "999999"] })
    ).toEqual([])
  })

  it("can't express all-of Amenities as an `and` of `in` (Postgres)", async () => {
    // Why curatedListWhere resolves several Amenities in a first query: the
    // adapter joins `properties_rels` once, so each row has one Amenity.
    const { totalDocs } = await payload.find({
      collection: "properties",
      where: {
        and: [
          { amenities: { in: [amenity.hotTub] } },
          { amenities: { in: [amenity.wifi] } },
        ],
      },
      depth: 0,
    })
    expect(totalDocs).toBe(0)
  })

  it("combines Location, Amenities, Property Types and minimums", async () => {
    const base = {
      locationId: String(loc.parkCity),
      amenityIds: hotTubAndWifi(),
    }
    expect(await members({ ...base, minBedrooms: 3 })).toEqual([
      "deerCabin",
      "steinCondo",
    ])
    expect(await members({ ...base, minSleeps: 10 })).toEqual(["steinCondo"])
    expect(
      await members({ ...base, propertyTypeIds: [String(type.cabin)] })
    ).toEqual(["deerCabin", "parkAll"])
    expect(await members({ ...base, petsAllowed: true })).toEqual(["deerCabin"])
  })

  it("stays on the SiteReader's Site", async () => {
    expect(
      await members({ amenityIds: hotTubAndWifi() }, { user: readerA })
    ).toEqual(["deerCabin", "destinCabin", "parkAll", "steinCondo"])
  })

  it("resolves a stored Curated List's rule", async () => {
    const list = await payload.create({
      collection: "curated-lists",
      data: {
        site: siteA,
        title: "Hot tubs in Park City",
        _status: "published",
        rule: {
          location: loc.parkCity!,
          amenities: [amenity.hotTub!, amenity.wifi!],
          minBedrooms: 3,
        },
      },
      depth: 1,
    })
    expect(list.slug).toBe("hot-tubs-in-park-city")
    expect(list.sort).toBe("featured")
    expect(await members(curatedListRuleFrom(list.rule))).toEqual([
      "deerCabin",
      "steinCondo",
    ])
  })
})

describe("same-Site relationships", () => {
  it("rejects a Curated List rule Location from another Site", async () => {
    await expect(
      payload.create({
        collection: "curated-lists",
        data: { site: siteA, title: "Aspen", rule: { location: loc.aspen! } },
      })
    ).rejects.toThrow(/invalid/i)
  })

  it("rejects Guide Locations and Properties from another Site", async () => {
    await expect(
      payload.create({
        collection: "guides",
        data: { site: siteA, title: "Aspen walks", locations: [loc.aspen!] },
      })
    ).rejects.toThrow(/invalid/i)
    await expect(
      payload.create({
        collection: "guides",
        data: {
          site: siteA,
          title: "Aspen stays",
          properties: [prop.aspenCabin!],
        },
      })
    ).rejects.toThrow(/invalid/i)
  })

  it("validates Drafts too: another Site's references are rejected before publishing", async () => {
    await expect(
      payload.create({
        collection: "curated-lists",
        draft: true,
        data: {
          site: siteA,
          title: "Aspen draft",
          _status: "draft",
          rule: { location: loc.aspen! },
        },
      })
    ).rejects.toThrow(/invalid/i)
    await expect(
      payload.create({
        collection: "guides",
        draft: true,
        data: {
          site: siteA,
          title: "Aspen walks draft",
          _status: "draft",
          locations: [loc.aspen!],
        },
      })
    ).rejects.toThrow(/invalid/i)
  })

  it("accepts same-Site references and sets publishedAt on publish", async () => {
    const draft = await payload.create({
      collection: "guides",
      data: {
        site: siteA,
        title: "Best walks near Park City",
        locations: [loc.parkCity!, loc.deerValley!],
        properties: [prop.deerCabin!],
      },
      draft: true,
    })
    expect(draft.slug).toBe("best-walks-near-park-city")
    expect(draft.publishedAt ?? null).toBeNull()

    const published = await payload.update({
      collection: "guides",
      id: draft.id,
      data: { _status: "published" },
    })
    expect(published.publishedAt).toBeTruthy()

    const republished = await payload.update({
      collection: "guides",
      id: draft.id,
      data: { title: "Best walks in Park City", _status: "published" },
    })
    expect(republished.publishedAt).toBe(published.publishedAt)
  })
})
