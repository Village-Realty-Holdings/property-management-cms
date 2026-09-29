import type { Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { effectiveStayPolicy } from "./effectiveStayPolicy"

/**
 * Property Facts vs Editorial Content (ADR-0001, ADR-0002). Staff Users go
 * through the Local API with `overrideAccess: false` (the same rules as
 * REST); "Sync" writes use the default `overrideAccess: true`.
 */

type User = TypedUser | null
type ID = number

let t: TestPayload
let payload: Payload

let siteA: ID
let siteB: ID
let editorA: User
let readerA: User

const facts = {
  feedName: "Aspen Hideaway",
  status: "active" as const,
  feedDescription: "A cosy cabin.",
  bedrooms: 3,
  bathrooms: 2.5,
  sleeps: 8,
  petsAllowed: true,
  onlineBookable: true,
  photos: [
    {
      url: "https://photos.example.com/1.jpg",
      caption: "Front",
      width: 1600,
      height: 1067,
    },
  ],
  address: { line1: "1 Main St", city: "Aspen", region: "CO", country: "US" },
  geo: { lat: 39.19, lng: -106.82 },
  rooms: [
    {
      name: "Primary",
      sleeps: 2,
      beds: [{ type: "king", count: 1 }],
    },
  ],
  stayPolicy: { checkIn: "15:00", minimumAge: 21 },
  feedUpdatedAt: "2026-01-01T00:00:00.000Z",
}

async function syncCreate(
  site: ID,
  feedId: string,
  data: { headline?: string } = {}
) {
  return payload.create({
    collection: "properties",
    data: { site, feedId, ...facts, ...data },
  })
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload

  const a = await payload.create({
    collection: "sites",
    data: {
      name: "Site A",
      slug: "site-a",
      stayPolicyDefaults: {
        checkIn: "16:00",
        checkOut: "10:00",
        houseRules: "No parties.",
        minimumAge: 25,
      },
    },
  })
  const b = await payload.create({
    collection: "sites",
    data: { name: "Site B", slug: "site-b" },
  })
  siteA = a.id
  siteB = b.id

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

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "properties-reader-a" },
  })
  const { user } = await payload.auth({
    headers: new Headers({
      Authorization: "site-readers API-Key properties-reader-a",
    }),
  })
  readerA = user
})

afterAll(() => t?.teardown())

describe("Properties", () => {
  it("sets the slug from the feed name on create", async () => {
    const first = await syncCreate(siteA, "slug-1")
    const second = await syncCreate(siteA, "slug-2")
    const otherSite = await syncCreate(siteB, "slug-1")

    expect(first.slug).toBe("aspen-hideaway")
    expect(second.slug).toBe("aspen-hideaway-2")
    expect(otherSite.slug).toBe("aspen-hideaway")
  })

  it("lets Staff Users edit Editorial Content but not Property Facts", async () => {
    const created = await syncCreate(siteA, "staff-edit")

    const updated = await payload.update({
      collection: "properties",
      id: created.id,
      overrideAccess: false,
      user: editorA,
      data: {
        headline: "Ski-in cabin with a hot tub",
        summary: "Steps from the lift.",
        highlights: [{ text: "Hot tub" }],
        featured: true,
        slug: "Aspen Ski Cabin",
        // Property Facts: silently ignored.
        feedName: "Renamed by staff",
        bedrooms: 99,
        status: "withdrawn",
        photos: [{ url: "https://evil.example.com/x.jpg" }],
        address: { city: "Elsewhere" },
        stayPolicy: { checkIn: "01:00" },
      },
    })

    expect(updated.headline).toBe("Ski-in cabin with a hot tub")
    expect(updated.summary).toBe("Steps from the lift.")
    expect(updated.highlights?.map((h) => h.text)).toEqual(["Hot tub"])
    expect(updated.featured).toBe(true)
    expect(updated.slug).toBe("aspen-ski-cabin")

    expect(updated.feedName).toBe(facts.feedName)
    expect(updated.bedrooms).toBe(3)
    expect(updated.status).toBe("active")
    expect(updated.photos?.map((p) => p.url)).toEqual([
      "https://photos.example.com/1.jpg",
    ])
    expect(updated.address?.city).toBe("Aspen")
    expect(updated.stayPolicy?.checkIn).toBe("15:00")
  })

  it("Sync updates of Property Facts leave Editorial Content and the slug untouched", async () => {
    const created = await syncCreate(siteA, "sync-update")
    await payload.update({
      collection: "properties",
      id: created.id,
      overrideAccess: false,
      user: editorA,
      data: { headline: "Editor headline", summary: "Editor summary" },
    })

    const synced = await payload.update({
      collection: "properties",
      id: created.id,
      data: {
        feedName: "Aspen Hideaway Renamed",
        bedrooms: 4,
        photos: [{ url: "https://photos.example.com/2.jpg" }],
      },
    })

    expect(synced.feedName).toBe("Aspen Hideaway Renamed")
    expect(synced.bedrooms).toBe(4)
    expect(synced.slug).toBe(created.slug)
    expect(synced.headline).toBe("Editor headline")
    expect(synced.summary).toBe("Editor summary")
  })

  it("names the Property in the admin by its Headline, else its feed name", async () => {
    const created = await syncCreate(siteA, "admin-title")
    expect(created.adminTitle).toBe("Aspen Hideaway")

    const headlined = await payload.update({
      collection: "properties",
      id: created.id,
      data: { headline: "Ski-in cabin" },
      overrideAccess: false,
      user: editorA,
    })
    expect(headlined.adminTitle).toBe("Ski-in cabin")

    // A Sync rename keeps the Headline as the name.
    const renamed = await payload.update({
      collection: "properties",
      id: created.id,
      data: { feedName: "Aspen Lodge" },
      context: { skipRevalidation: true },
    })
    expect(renamed.adminTitle).toBe("Ski-in cabin")

    const cleared = await payload.update({
      collection: "properties",
      id: created.id,
      data: { headline: "" },
      overrideAccess: false,
      user: editorA,
    })
    expect(cleared.adminTitle).toBe("Aspen Lodge")
  })

  it("Withdrawn keeps everything and hides the Property from the reader", async () => {
    const created = await syncCreate(siteA, "withdrawn", {
      headline: "Kept headline",
    })

    const withdrawn = await payload.update({
      collection: "properties",
      id: created.id,
      data: { status: "withdrawn" },
    })

    expect(withdrawn.slug).toBe(created.slug)
    expect(withdrawn.headline).toBe("Kept headline")
    expect(withdrawn.bedrooms).toBe(3)
  })

  it("a SiteReader sees only Active Properties on its own Site", async () => {
    const { docs } = await payload.find({
      collection: "properties",
      overrideAccess: false,
      user: readerA,
      depth: 0,
      limit: 100,
    })

    expect(docs.length).toBeGreaterThan(0)
    for (const doc of docs) {
      expect(doc.site).toBe(siteA)
      expect(doc.status).toBe("active")
    }
    expect(docs.map((d) => d.feedId)).not.toContain("withdrawn")
  })

  it("Staff Users can't create or delete Properties", async () => {
    await expect(
      payload.create({
        collection: "properties",
        overrideAccess: false,
        user: editorA,
        data: { site: siteA, feedId: "staff-created", status: "active" },
      })
    ).rejects.toMatchObject({ status: 403 })

    const created = await syncCreate(siteA, "staff-delete")
    await expect(
      payload.delete({
        collection: "properties",
        id: created.id,
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toMatchObject({ status: 403 })
  })

  it("SEO image must be Media on the Property's own Site", async () => {
    const property = await syncCreate(siteA, "seo-image")
    // Straight to the database: no file needs to exist for this check.
    const media = async (site: ID) =>
      (await payload.db.create({
        collection: "media",
        data: {
          site,
          alt: "x",
          filename: `${site}.png`,
          mimeType: "image/png",
        },
      })) as { id: ID }
    const own = await media(siteA)
    const other = await media(siteB)

    const updated = await payload.update({
      collection: "properties",
      id: property.id,
      overrideAccess: false,
      user: editorA,
      depth: 0,
      data: { seo: { image: own.id } },
    })
    expect(updated.seo?.image).toBe(own.id)

    await expect(
      payload.update({
        collection: "properties",
        id: property.id,
        overrideAccess: false,
        user: editorA,
        data: { seo: { image: other.id } },
      })
    ).rejects.toMatchObject({ status: 400 })
  })

  it("merges the Property's Stay Policy with the Site default", async () => {
    const property = await syncCreate(siteA, "stay-policy")
    const site = await payload.findByID({ collection: "sites", id: siteA })

    expect(effectiveStayPolicy(property, site)).toEqual({
      checkIn: "15:00",
      checkOut: "10:00",
      houseRules: "No parties.",
      cancellationPolicy: null,
      minimumAge: 21,
    })
  })
})
