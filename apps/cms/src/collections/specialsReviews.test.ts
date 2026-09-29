import type { CollectionSlug, Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"

/**
 * Specials and Reviews: what guests (SiteReaders) see, Feed-owned fields,
 * the Site's Moderation rule and the Property Rating. Writes by the Sync use
 * the Local API's default `overrideAccess`; Staff Users and readers go through
 * `overrideAccess: false`, i.e. the same rules as REST.
 */

type User = TypedUser | null
type ID = number

let t: TestPayload
let payload: Payload

let siteA: ID
let siteB: ID
let editorA: User
let readerA: User
let readerB: User
let propA: ID
let propA2: ID
let propB: ID

const DAY = 24 * 60 * 60 * 1000
const future = () => new Date(Date.now() + 30 * DAY).toISOString()
const past = () => new Date(Date.now() - DAY).toISOString()

async function readerFor(key: string): Promise<User> {
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `site-readers API-Key ${key}` }),
  })
  expect(user?.collection).toBe("site-readers")
  return user
}

async function readAs(user: User, collection: CollectionSlug) {
  const { docs } = await payload.find({
    collection,
    overrideAccess: false,
    user,
    depth: 0,
    limit: 100,
  })
  return docs as unknown as { id: ID; feedId: string }[]
}

const feedIds = (docs: { feedId: string }[]) => docs.map((d) => d.feedId).sort()

async function propertyRating(id: ID) {
  const doc = await payload.findByID({ collection: "properties", id, depth: 0 })
  return { rating: doc.rating ?? null, reviewCount: doc.reviewCount ?? 0 }
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload

  siteA = (
    await payload.create({
      collection: "sites",
      data: {
        name: "Site A",
        slug: "site-a",
        moderation: { autoShowMinRating: 4 },
      },
    })
  ).id
  siteB = (
    await payload.create({
      collection: "sites",
      data: { name: "Site B", slug: "site-b" },
    })
  ).id

  const editor = await payload.create({
    collection: "users",
    data: {
      email: "editor-a@example.com",
      password: "password",
      role: "editor",
      tenants: [{ site: siteA }],
    },
  })
  editorA = { ...editor, collection: "users" } as User

  for (const [site, key] of [
    [siteA, "reader-a"],
    [siteB, "reader-b"],
  ] as const) {
    await payload.create({
      collection: "site-readers",
      data: { site, enableAPIKey: true, apiKey: key },
    })
  }
  readerA = await readerFor("reader-a")
  readerB = await readerFor("reader-b")

  const property = async (site: ID, feedId: string) =>
    (
      await payload.create({
        collection: "properties",
        data: { site, feedId, feedName: `Cabin ${feedId}`, status: "active" },
      })
    ).id
  propA = await property(siteA, "p-a")
  propA2 = await property(siteA, "p-a2")
  propB = await property(siteB, "p-b")
})

afterAll(() => t?.teardown())

describe("Specials", () => {
  beforeAll(async () => {
    for (const [site, feedId, data] of [
      [siteA, "s-live", { showOnSite: true, validTo: future() }],
      [siteA, "s-open-ended", { showOnSite: true }],
      [siteA, "s-not-shown", { showOnSite: false, validTo: future() }],
      [siteA, "s-expired", { showOnSite: true, validTo: past() }],
      [
        siteA,
        "s-withdrawn",
        { showOnSite: true, validTo: future(), status: "withdrawn" },
      ],
      [siteB, "s-b", { showOnSite: true }],
    ] as const) {
      await payload.create({
        collection: "specials",
        data: {
          site,
          feedId,
          code: feedId,
          title: "Summer Deal",
          status: "active",
          ...data,
        },
      })
    }
  })

  it("a reader sees only shown, Active, unexpired Specials of its Site", async () => {
    expect(feedIds(await readAs(readerA, "specials"))).toEqual([
      "s-live",
      "s-open-ended",
    ])
    expect(feedIds(await readAs(readerB, "specials"))).toEqual(["s-b"])
  })

  it("an Editor sees every Special of their Site, and no other Site's", async () => {
    expect(feedIds(await readAs(editorA, "specials"))).toEqual([
      "s-expired",
      "s-live",
      "s-not-shown",
      "s-open-ended",
      "s-withdrawn",
    ])
  })

  it("gets a slug from the title, unique per Site and set once", async () => {
    const { docs } = await payload.find({
      collection: "specials",
      where: { site: { equals: siteA } },
      sort: "createdAt",
      depth: 0,
    })
    const slugs = docs.map((d) => d.slug)
    expect(slugs[0]).toBe("summer-deal")
    expect(new Set(slugs).size).toBe(slugs.length)
    const [b] = (
      await payload.find({
        collection: "specials",
        where: { feedId: { equals: "s-b" } },
      })
    ).docs
    expect(b?.slug).toBe("summer-deal")

    const renamed = await payload.update({
      collection: "specials",
      id: docs[0]!.id,
      data: { title: "Winter Deal" },
      overrideAccess: false,
      user: editorA,
    })
    expect(renamed.slug).toBe("summer-deal")
  })

  it("gets its slug from the first title when the Sync created it untitled", async () => {
    const untitled = await payload.create({
      collection: "specials",
      data: { site: siteA, feedId: "s-untitled", status: "active" },
    })
    expect(untitled.slug ?? null).toBeNull()

    const titled = await payload.update({
      collection: "specials",
      id: untitled.id,
      data: { title: "Summer Deal" },
      overrideAccess: false,
      user: editorA,
    })
    expect(titled.slug).toMatch(/^summer-deal-\d+$/)

    const renamed = await payload.update({
      collection: "specials",
      id: untitled.id,
      data: { title: "Autumn Deal" },
      overrideAccess: false,
      user: editorA,
    })
    expect(renamed.slug).toBe(titled.slug)
  })

  it("an Editor edits the copy but not the Feed-owned fields", async () => {
    const [special] = (
      await payload.find({
        collection: "specials",
        where: { feedId: { equals: "s-live" } },
      })
    ).docs
    const updated = await payload.update({
      collection: "specials",
      id: special!.id,
      data: {
        summary: "Save on summer stays",
        showOnSite: false,
        code: "HACKED",
        status: "withdrawn",
        discountSummary: "90% off",
        validTo: past(),
      },
      overrideAccess: false,
      user: editorA,
    })
    expect(updated.summary).toBe("Save on summer stays")
    expect(updated.showOnSite).toBe(false)
    expect(updated.code).toBe("s-live")
    expect(updated.status).toBe("active")
    expect(updated.discountSummary ?? null).toBeNull()
    expect(updated.validTo).toBe(special!.validTo)
  })

  it("names the Special in the admin by its title, else its code or Feed ID", async () => {
    // The Sync's write: overrideAccess and no revalidation.
    const sync = { context: { skipRevalidation: true } }
    const coded = await payload.create({
      collection: "specials",
      data: {
        site: siteA,
        feedId: "s-coded",
        code: "SUMMER10",
        status: "active",
      },
      ...sync,
    })
    expect(coded.adminTitle).toBe("SUMMER10")
    const bare = await payload.create({
      collection: "specials",
      data: { site: siteA, feedId: "s-bare", status: "active" },
      ...sync,
    })
    expect(bare.adminTitle).toBe("s-bare")

    const titled = await payload.update({
      collection: "specials",
      id: coded.id,
      data: { title: "Summer savings" },
      overrideAccess: false,
      user: editorA,
    })
    expect(titled.adminTitle).toBe("Summer savings")

    // A Sync update of Feed-owned fields keeps it.
    const synced = await payload.update({
      collection: "specials",
      id: coded.id,
      data: { code: "SUMMER15" },
      ...sync,
    })
    expect(synced.adminTitle).toBe("Summer savings")
  })

  it("Staff Users can't create or delete Specials", async () => {
    await expect(
      payload.create({
        collection: "specials",
        data: { site: siteA, feedId: "s-staff", status: "active" },
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toMatchObject({ status: 403 })
    const [special] = await readAs(editorA, "specials")
    await expect(
      payload.delete({
        collection: "specials",
        id: special!.id,
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe("Reviews", () => {
  const create = (
    site: ID,
    property: ID,
    feedId: string,
    rating: number | null,
    extra: Record<string, unknown> = {}
  ) =>
    payload.create({
      collection: "reviews",
      data: {
        site,
        property,
        feedId,
        rating,
        status: "active",
        moderation: "pending",
        ...extra,
      },
    })

  it("applies the Site's Moderation rule to new Reviews", async () => {
    const high = await create(siteA, propA, "r-high", 4.5)
    const atMin = await create(siteA, propA, "r-at-min", 4)
    const low = await create(siteA, propA, "r-low", 3.5)
    const unrated = await create(siteA, propA, "r-unrated", null)
    const hidden = await create(siteA, propA, "r-hidden", 5, {
      moderation: "hidden",
    })
    const noRule = await create(siteB, propB, "r-b", 5)

    expect(high.moderation).toBe("shown")
    expect(atMin.moderation).toBe("shown")
    expect(low.moderation).toBe("pending")
    expect(unrated.moderation).toBe("pending")
    expect(hidden.moderation).toBe("hidden")
    expect(noRule.moderation).toBe("pending")
  })

  it("keeps the Property Rating to shown, Active Reviews", async () => {
    expect(await propertyRating(propA)).toEqual({
      rating: 4.25,
      reviewCount: 2,
    })
    expect(await propertyRating(propB)).toEqual({
      rating: null,
      reviewCount: 0,
    })
  })

  it("recomputes the Rating when an Editor shows or hides a Review", async () => {
    const [low] = (
      await payload.find({
        collection: "reviews",
        where: { feedId: { equals: "r-low" } },
      })
    ).docs
    await payload.update({
      collection: "reviews",
      id: low!.id,
      data: { moderation: "shown" },
      overrideAccess: false,
      user: editorA,
    })
    expect(await propertyRating(propA)).toEqual({
      rating: 4,
      reviewCount: 3,
    })

    await payload.update({
      collection: "reviews",
      id: low!.id,
      data: { moderation: "hidden" },
      overrideAccess: false,
      user: editorA,
    })
    expect(await propertyRating(propA)).toEqual({
      rating: 4.25,
      reviewCount: 2,
    })
  })

  it("recomputes the Rating on withdraw, move and delete", async () => {
    const [atMin] = (
      await payload.find({
        collection: "reviews",
        where: { feedId: { equals: "r-at-min" } },
      })
    ).docs
    await payload.update({
      collection: "reviews",
      id: atMin!.id,
      data: { status: "withdrawn" },
    })
    expect(await propertyRating(propA)).toEqual({
      rating: 4.5,
      reviewCount: 1,
    })

    const moved = await create(siteA, propA, "r-moved", 5)
    await payload.update({
      collection: "reviews",
      id: moved.id,
      data: { property: propA2 },
    })
    expect(await propertyRating(propA)).toEqual({
      rating: 4.5,
      reviewCount: 1,
    })
    expect(await propertyRating(propA2)).toEqual({
      rating: 5,
      reviewCount: 1,
    })

    await payload.delete({ collection: "reviews", id: moved.id })
    expect(await propertyRating(propA2)).toEqual({
      rating: null,
      reviewCount: 0,
    })
  })

  it("names the Review in the admin by rating, guest and Property", async () => {
    const review = await payload.create({
      collection: "reviews",
      data: {
        site: siteB,
        property: propB,
        feedId: "r-named",
        rating: 4,
        guestName: "Jane D.",
        status: "active",
        moderation: "hidden",
      },
      context: { skipRevalidation: true },
    })
    expect(review.adminTitle).toBe("★4 — Jane D. — Cabin p-b")

    await payload.update({
      collection: "properties",
      id: propB,
      data: { headline: "Lakeside cabin" },
    })
    const updated = await payload.update({
      collection: "reviews",
      id: review.id,
      data: { rating: 5 },
      context: { skipRevalidation: true },
    })
    expect(updated.adminTitle).toBe("★5 — Jane D. — Lakeside cabin")

    const bare = await payload.create({
      collection: "reviews",
      data: {
        site: siteB,
        feedId: "r-bare",
        status: "active",
        moderation: "hidden",
      },
    })
    expect(bare.adminTitle).toBe("r-bare")
  })

  it("a reader sees only shown, Active Reviews of its Site", async () => {
    expect(feedIds(await readAs(readerA, "reviews"))).toEqual(["r-high"])
    expect(await readAs(readerB, "reviews")).toEqual([])
  })

  it("an Editor changes Moderation but not the Feed-owned fields", async () => {
    const [high] = (
      await payload.find({
        collection: "reviews",
        where: { feedId: { equals: "r-high" } },
      })
    ).docs
    const updated = await payload.update({
      collection: "reviews",
      id: high!.id,
      data: {
        rating: 1,
        body: "edited",
        managerResponse: "edited",
        status: "withdrawn",
      },
      overrideAccess: false,
      user: editorA,
    })
    expect(updated.rating).toBe(4.5)
    expect(updated.body ?? null).toBeNull()
    expect(updated.managerResponse ?? null).toBeNull()
    expect(updated.status).toBe("active")
    expect(await propertyRating(propA)).toEqual({
      rating: 4.5,
      reviewCount: 1,
    })
  })

  it("an Editor of Site A can't read or moderate Site B's Reviews", async () => {
    const [b] = (
      await payload.find({
        collection: "reviews",
        where: { feedId: { equals: "r-b" } },
      })
    ).docs
    expect(feedIds(await readAs(editorA, "reviews"))).not.toContain("r-b")
    await expect(
      payload.update({
        collection: "reviews",
        id: b!.id,
        data: { moderation: "shown" },
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toMatchObject({ status: 403 })
    expect(await propertyRating(propB)).toEqual({
      rating: null,
      reviewCount: 0,
    })
  })
})
