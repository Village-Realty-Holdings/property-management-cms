import type { Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Location } from "@workspace/cms-types"

import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { getDescendantIds, getLocationPath } from "./ancestors"

type User = TypedUser | null
type ID = number

let t: TestPayload
let payload: Payload

let siteA: ID
let siteB: ID
let editorA: User
let adminA: User
let readerA: User

/** Locations by key. Tree on Site A: florida > destin > resort, destin > hidden, florida > gone. */
const loc: Record<string, ID> = {}

async function staff(email: string, role: "admin" | "editor", site: ID) {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "password", role, tenants: [{ site }] },
  })
  return { ...doc, collection: "users" } as User
}

/** The Sync's write: Local API with overrideAccess. */
async function syncLocation(
  key: string,
  site: ID,
  data: Partial<Location> = {}
) {
  const doc = await payload.create({
    collection: "locations",
    data: { site, feedId: key, name: `Node ${key}`, status: "active", ...data },
  })
  loc[key] = doc.id
  return doc
}

/** A ValidationError on `parent` whose message matches. */
const parentError = (message: RegExp) => (error: unknown) => {
  const errors =
    (error as { data?: { errors?: { path: string; message: string }[] } }).data
      ?.errors ?? []
  return errors.some((e) => e.path === "parent" && message.test(e.message))
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload

  const a = await payload.create({
    collection: "sites",
    data: { name: "Site A", slug: "site-a", revalidationSecret: "secret-a" },
  })
  const b = await payload.create({
    collection: "sites",
    data: { name: "Site B", slug: "site-b", revalidationSecret: "secret-b" },
  })
  siteA = a.id
  siteB = b.id

  editorA = await staff("editor-a@example.com", "editor", siteA)
  adminA = await staff("admin-a@example.com", "admin", siteA)

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "reader-key-a" },
  })
  const { user } = await payload.auth({
    headers: new Headers({
      Authorization: "site-readers API-Key reader-key-a",
    }),
  })
  readerA = user

  await syncLocation("florida", siteA, { level: "destination" })
  await syncLocation("destin", siteA, { parent: loc.florida, level: "area" })
  await syncLocation("resort", siteA, {
    parent: loc.destin,
    feedType: "Resort",
  })
  await syncLocation("hidden", siteA, { parent: loc.destin, visible: false })
  await syncLocation("gone", siteA, {
    parent: loc.florida,
    status: "withdrawn",
  })
  await syncLocation("utah", siteB)
})

afterAll(() => t?.teardown())

describe("Locations: Feed-owned fields", () => {
  it("are read-only for Staff Users; editorial fields still save", async () => {
    const updated = await payload.update({
      collection: "locations",
      id: loc.resort!,
      overrideAccess: false,
      user: adminA,
      depth: 0,
      data: {
        feedId: "changed",
        name: "Changed",
        feedType: "Changed",
        parent: loc.florida,
        status: "withdrawn",
        intro: null,
        complex: { address: "1 Beach Rd" },
      },
    })
    expect(updated).toMatchObject({
      feedId: "resort",
      name: "Node resort",
      feedType: "Resort",
      parent: loc.destin,
      status: "active",
      complex: { address: "1 Beach Rd" },
    })
  })

  it("the Sync (overrideAccess) updates them and keeps the slug", async () => {
    const updated = await payload.update({
      collection: "locations",
      id: loc.resort!,
      data: { name: "Long Beach Resort", feedType: "Complex" },
    })
    expect(updated.name).toBe("Long Beach Resort")
    expect(updated.slug).toBe("node-resort")
    expect(updated.title).toBe("Long Beach Resort")
  })

  it("Staff Users can't create or delete Locations", async () => {
    await expect(
      payload.create({
        collection: "locations",
        overrideAccess: false,
        user: adminA,
        data: { site: siteA, feedId: "new", name: "New", status: "active" },
      })
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      payload.delete({
        collection: "locations",
        id: loc.gone!,
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe("Locations: editorial fields", () => {
  it("an Admin sets Level, visibility and display name", async () => {
    const updated = await payload.update({
      collection: "locations",
      id: loc.resort!,
      overrideAccess: false,
      user: adminA,
      data: { level: "complex", visible: true, displayName: "The Resort" },
    })
    expect(updated).toMatchObject({
      level: "complex",
      visible: true,
      displayName: "The Resort",
      title: "The Resort",
    })
  })

  it("an Editor writes copy but can't change Level, visibility or display name", async () => {
    const updated = await payload.update({
      collection: "locations",
      id: loc.resort!,
      overrideAccess: false,
      user: editorA,
      data: {
        level: "area",
        visible: false,
        displayName: "Editor's name",
        complex: { address: "2 Beach Rd" },
        seo: { title: "Stay at the Resort" },
      },
    })
    expect(updated).toMatchObject({
      level: "complex",
      visible: true,
      displayName: "The Resort",
      complex: { address: "2 Beach Rd" },
      seo: { title: "Stay at the Resort" },
    })
  })

  it("an Admin of another Site can't update it", async () => {
    const adminB = await staff("admin-b@example.com", "admin", siteB)
    await expect(
      payload.update({
        collection: "locations",
        id: loc.resort!,
        overrideAccess: false,
        user: adminB,
        data: { level: "area" },
      })
    ).rejects.toMatchObject({ status: 403 })
  })

  it("title falls back to the Feed name when the display name is cleared", async () => {
    const updated = await payload.update({
      collection: "locations",
      id: loc.destin!,
      overrideAccess: false,
      user: adminA,
      data: { displayName: "" },
    })
    expect(updated.title).toBe("Node destin")
  })
})

describe("Locations: admin label", () => {
  it("is Parent › Name (Level), kept current when the parent is renamed", async () => {
    const root = await syncLocation("lbl-root", siteB, { level: "destination" })
    const child = await syncLocation("lbl-child", siteB, {
      parent: root.id,
      level: "complex",
    })
    const grandchild = await syncLocation("lbl-grand", siteB, {
      parent: child.id,
    })
    expect(root.adminTitle).toBe("Node lbl-root (Destination)")
    expect(child.adminTitle).toBe("Node lbl-root › Node lbl-child (Complex)")
    expect(grandchild.adminTitle).toBe("Node lbl-child › Node lbl-grand")

    // The Sync renames the root (overrideAccess, no revalidation).
    await payload.update({
      collection: "locations",
      id: root.id,
      data: { name: "Park City" },
      context: { skipRevalidation: true },
    })
    // An Admin gives the child a display name.
    await payload.update({
      collection: "locations",
      id: child.id,
      data: { displayName: "Canyons Village" },
    })

    const label = async (id: ID) =>
      (await payload.findByID({ collection: "locations", id, depth: 0 }))
        .adminTitle
    expect(await label(root.id)).toBe("Park City (Destination)")
    expect(await label(child.id)).toBe("Park City › Canyons Village (Complex)")
    expect(await label(grandchild.id)).toBe("Canyons Village › Node lbl-grand")
  })
})

describe("Locations: SiteReader", () => {
  it("reads only visible, active Locations of its own Site", async () => {
    const { docs } = await payload.find({
      collection: "locations",
      overrideAccess: false,
      user: readerA,
      depth: 0,
      limit: 100,
    })
    expect(docs.map((d) => d.id).sort()).toEqual(
      [loc.florida, loc.destin, loc.resort].sort()
    )
  })
})

describe("Location tree helpers", () => {
  it("getLocationPath returns ancestors root first, the Location last", async () => {
    const path = await getLocationPath(payload, loc.resort!)
    expect(path.map((d) => d.id)).toEqual([loc.florida, loc.destin, loc.resort])
  })

  it("getLocationPath of a root or missing Location", async () => {
    expect(
      (await getLocationPath(payload, loc.florida!)).map((d) => d.id)
    ).toEqual([loc.florida])
    expect(await getLocationPath(payload, 999_999)).toEqual([])
  })

  it("getDescendantIds returns every Location below, not itself", async () => {
    expect((await getDescendantIds(payload, loc.florida!)).sort()).toEqual(
      [loc.destin, loc.resort, loc.hidden, loc.gone].sort()
    )
    expect((await getDescendantIds(payload, loc.destin!)).sort()).toEqual(
      [loc.resort, loc.hidden].sort()
    )
    expect(await getDescendantIds(payload, loc.resort!)).toEqual([])
  })

  it("both terminate on a parent cycle", async () => {
    const x = await syncLocation("cycle-x", siteB)
    const y = await syncLocation("cycle-y", siteB, { parent: x.id })
    // Bypass validateParent to simulate corrupt data.
    await payload.db.updateOne({
      collection: "locations",
      id: x.id,
      data: { parent: y.id },
    })

    expect((await getLocationPath(payload, y.id)).map((d) => d.id)).toEqual([
      x.id,
      y.id,
    ])
    expect(await getDescendantIds(payload, x.id)).toEqual([y.id])
  })
})

describe("Locations: parent validation", () => {
  it("rejects a parent on another Site", async () => {
    await expect(
      payload.create({
        collection: "locations",
        data: {
          site: siteA,
          feedId: "cross",
          name: "Cross",
          status: "active",
          parent: loc.utah,
        },
      })
    ).rejects.toSatisfy(parentError(/same Site/))
  })

  it("rejects itself as parent", async () => {
    await expect(
      payload.update({
        collection: "locations",
        id: loc.destin!,
        data: { parent: loc.destin },
      })
    ).rejects.toSatisfy(parentError(/own parent/))
  })

  it("rejects a descendant as parent", async () => {
    await expect(
      payload.update({
        collection: "locations",
        id: loc.florida!,
        data: { parent: loc.resort },
      })
    ).rejects.toSatisfy(parentError(/sub-Locations/))
  })

  it("lets the Sync move a Location within its Site", async () => {
    const moved = await payload.update({
      collection: "locations",
      id: loc.hidden!,
      depth: 0,
      data: { parent: loc.florida },
    })
    expect(moved.parent).toBe(loc.florida)
    await payload.update({
      collection: "locations",
      id: loc.hidden!,
      data: { parent: loc.destin },
    })
  })
})
