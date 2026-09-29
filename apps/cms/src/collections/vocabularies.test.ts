import type { CollectionSlug, Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { resolveAmenityPresentation } from "./Sites/presentation"

/**
 * Amenities and Property Types are an Awayday-wide vocabulary (ADR-0013):
 * every Site reads them, only the Sync writes them, and each Site keeps its
 * own Amenity Presentation and Property Type labels.
 */

type User = TypedUser | null
type ID = number

let t: TestPayload
let payload: Payload

let siteA: ID
let siteB: ID
let adminA: User
let editorA: User
let readerA: User
let readerB: User
let hotTub: ID
let pool: ID
let cabin: ID

async function readerFor(site: ID, key: string): Promise<User> {
  await payload.create({
    collection: "site-readers",
    data: { site, enableAPIKey: true, apiKey: key },
  })
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `site-readers API-Key ${key}` }),
  })
  return user
}

async function staff(email: string, role: "admin" | "editor", site: ID) {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "password", role, tenants: [{ site }] },
  })
  return { ...doc, collection: "users" } as User
}

const vocabularies = ["amenities", "property-types"] as const

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload

  siteA = (
    await payload.create({
      collection: "sites",
      data: { name: "Site A", slug: "site-a" },
    })
  ).id
  siteB = (
    await payload.create({
      collection: "sites",
      data: { name: "Site B", slug: "site-b" },
    })
  ).id

  adminA = await staff("admin-a@example.com", "admin", siteA)
  editorA = await staff("editor-a@example.com", "editor", siteA)
  readerA = await readerFor(siteA, "reader-key-a")
  readerB = await readerFor(siteB, "reader-key-b")

  // The Sync writes the vocabularies (overrideAccess).
  hotTub = (
    await payload.create({
      collection: "amenities",
      data: { feedId: "hot-tub", name: "Hot tub", group: "Outdoors" },
    })
  ).id
  pool = (
    await payload.create({
      collection: "amenities",
      data: { feedId: "pool", name: "Pool", icon: "pool", group: "Outdoors" },
    })
  ).id
  cabin = (
    await payload.create({
      collection: "property-types",
      data: { feedId: "cabin", name: "Cabin" },
    })
  ).id
})

afterAll(() => t?.teardown())

describe("vocabularies", () => {
  it("default to active", async () => {
    const doc = await payload.findByID({ collection: "amenities", id: hotTub })
    expect(doc.status).toBe("active")
    const type = await payload.findByID({
      collection: "property-types",
      id: cabin,
    })
    expect(type.status).toBe("active")
  })

  it("are readable by staff and by the readers of every Site", async () => {
    for (const collection of vocabularies) {
      const expected = collection === "amenities" ? 2 : 1
      for (const user of [adminA, editorA, readerA, readerB]) {
        const { docs } = await payload.find({
          collection,
          overrideAccess: false,
          user,
        })
        expect(docs).toHaveLength(expected)
      }
    }
  })

  it("are hidden from Editors in the admin, but not from Admins", () => {
    for (const collection of vocabularies) {
      const { hidden } = payload.collections[collection].config.admin
      expect(typeof hidden, collection).toBe("function")
      const hiddenFor = (user: User) =>
        (hidden as (args: { user: unknown }) => boolean)({ user })
      expect(hiddenFor(editorA), collection).toBe(true)
      expect(hiddenFor(adminA), collection).toBe(false)
      expect(
        hiddenFor({ ...editorA, superAdmin: true } as User),
        collection
      ).toBe(false)
    }
  })

  it("are not readable anonymously", async () => {
    for (const collection of vocabularies) {
      await expect(
        payload.find({ collection, overrideAccess: false, user: null })
      ).rejects.toThrow()
    }
  })

  it("can't be written by staff or readers", async () => {
    const targets: Record<(typeof vocabularies)[number], ID> = {
      amenities: hotTub,
      "property-types": cabin,
    }
    for (const collection of vocabularies) {
      for (const user of [adminA, editorA, readerA]) {
        const as = { overrideAccess: false, user } as const
        await expect(
          payload.create({
            collection: collection as CollectionSlug,
            data: { feedId: "new", name: "New" },
            ...as,
          } as Parameters<Payload["create"]>[0])
        ).rejects.toThrow()
        await expect(
          payload.update({
            collection,
            id: targets[collection],
            data: { name: "Renamed" },
            ...as,
          })
        ).rejects.toThrow()
        await expect(
          payload.delete({ collection, id: targets[collection], ...as })
        ).rejects.toThrow()
      }
    }
    const doc = await payload.findByID({ collection: "amenities", id: hotTub })
    expect(doc.name).toBe("Hot tub")
  })
})

describe("Site presentation", () => {
  beforeAll(async () => {
    await payload.update({
      collection: "sites",
      id: siteB,
      data: {
        amenityPresentation: { filters: [{ amenity: hotTub }] },
        propertyTypeLabels: {
          labels: [{ propertyType: cabin, label: "Lodge" }],
        },
      },
    })
  })

  it("is edited by the Site's Admin", async () => {
    await payload.update({
      collection: "sites",
      id: siteA,
      overrideAccess: false,
      user: adminA,
      data: {
        amenityPresentation: {
          filters: [
            { amenity: pool, label: "Swimming pool" },
            { amenity: hotTub, icon: "spa" },
          ],
          hidden: [],
        },
        propertyTypeLabels: {
          labels: [{ propertyType: cabin, label: "Log cabin" }],
        },
      },
    })
    const site = await payload.findByID({
      collection: "sites",
      id: siteA,
      depth: 0,
    })
    expect(site.amenityPresentation?.filters?.map((f) => f.amenity)).toEqual([
      pool,
      hotTub,
    ])
    expect(site.propertyTypeLabels?.labels?.[0]?.label).toBe("Log cabin")
  })

  it("keeps saving after the Feed withdraws a filter Amenity", async () => {
    const sauna = (
      await payload.create({
        collection: "amenities",
        data: { feedId: "sauna", name: "Sauna" },
      })
    ).id
    const retired = (
      await payload.create({
        collection: "amenities",
        data: { feedId: "retired", name: "Retired", status: "withdrawn" },
      })
    ).id
    const asAdmin = { overrideAccess: false, user: adminA } as const
    try {
      await payload.update({
        collection: "sites",
        id: siteB,
        data: { amenityPresentation: { filters: [{ amenity: sauna }] } },
      })
      await payload.update({
        collection: "amenities",
        id: sauna,
        data: { status: "withdrawn" },
      })
      // Another Site's Admin saving their own Site is unaffected, and this
      // Site's stored withdrawn filter still validates.
      await payload.update({
        collection: "sites",
        id: siteB,
        data: { name: "Site B" },
        overrideAccess: false,
        user: await staff("admin-b@example.com", "admin", siteB),
      })
      // A withdrawn Amenity can't be newly picked.
      await expect(
        payload.update({
          collection: "sites",
          id: siteA,
          ...asAdmin,
          data: { amenityPresentation: { filters: [{ amenity: retired }] } },
        })
      ).rejects.toThrow()
    } finally {
      await payload.update({
        collection: "sites",
        id: siteB,
        data: { amenityPresentation: { filters: [{ amenity: hotTub }] } },
      })
      await payload.delete({ collection: "amenities", id: sauna })
      await payload.delete({ collection: "amenities", id: retired })
    }
  })

  it("rejects the same Amenity as two filters", async () => {
    await expect(
      payload.update({
        collection: "sites",
        id: siteA,
        overrideAccess: false,
        user: adminA,
        data: {
          amenityPresentation: {
            filters: [{ amenity: pool }, { amenity: pool }],
          },
        },
      })
    ).rejects.toThrow()
  })

  it("can't be edited by Editors or by another Site's Admin", async () => {
    await expect(
      payload.update({
        collection: "sites",
        id: siteA,
        overrideAccess: false,
        user: editorA,
        data: { amenityPresentation: { hidden: [pool] } },
      })
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: "sites",
        id: siteB,
        overrideAccess: false,
        user: adminA,
        data: { amenityPresentation: { hidden: [pool] } },
      })
    ).rejects.toThrow()
    const b = await payload.findByID({ collection: "sites", id: siteB })
    expect(b.amenityPresentation?.hidden ?? []).toEqual([])
  })

  it("is per Site: each reader sees its own presentation", async () => {
    const { docs: amenities } = await payload.find({
      collection: "amenities",
      overrideAccess: false,
      user: readerA,
    })

    const viewsFor = async (user: User, site: ID) => {
      const doc = await payload.findByID({
        collection: "sites",
        id: site,
        overrideAccess: false,
        user,
      })
      return resolveAmenityPresentation(doc, amenities)
        .filter((view) => view.filter)
        .map((view) => [view.label, view.icon])
    }

    expect(await viewsFor(readerA, siteA)).toEqual([
      ["Swimming pool", "pool"],
      ["Hot tub", "spa"],
    ])
    expect(await viewsFor(readerB, siteB)).toEqual([["Hot tub", null]])
    await expect(viewsFor(readerA, siteB)).rejects.toThrow()
  })
})
