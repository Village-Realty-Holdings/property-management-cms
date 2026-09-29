import type { CollectionSlug, Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { seedBreakGlassAdmin } from "../breakGlass"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { tenantCollections } from "../tenancy"

/**
 * Cross-Site leak tests (ADR-0010): a Staff User and a Site's reader never
 * see or change another Site's documents. Everything goes through the Local
 * API with `overrideAccess: false`, i.e. the same rules as REST.
 */

type User = TypedUser | null
type ID = number

let t: TestPayload
let payload: Payload

let siteA: ID
let siteB: ID
let editorA: User
let adminA: User
let readerA: User
let readerB: User

const ids: Record<string, ID> = {}

const siteOf = (doc: { site?: unknown }) =>
  doc.site && typeof doc.site === "object"
    ? (doc.site as { id: ID }).id
    : doc.site

async function readerFor(key: string): Promise<User> {
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `site-readers API-Key ${key}` }),
  })
  expect(user?.collection).toBe("site-readers")
  return user
}

async function staff(email: string, role: "admin" | "editor", site: ID) {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "password", role, tenants: [{ site }] },
  })
  return { ...doc, collection: "users" } as User
}

/** Documents `user` can read, or [] when read access is denied outright. */
async function readAs(
  user: User,
  collection: CollectionSlug,
  options: { draft?: boolean } = {}
) {
  try {
    const { docs } = await payload.find({
      collection,
      overrideAccess: false,
      user,
      depth: 0,
      limit: 100,
      ...options,
    })
    return docs as { id: ID; site?: unknown }[]
  } catch (error) {
    if ((error as { status?: number }).status === 403) return []
    throw error
  }
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
  await staff("editor-b@example.com", "editor", siteB)

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "reader-key-a" },
  })
  await payload.create({
    collection: "site-readers",
    data: { site: siteB, enableAPIKey: true, apiKey: "reader-key-b" },
  })
  readerA = await readerFor("reader-key-a")
  readerB = await readerFor("reader-key-b")

  // The Sync creates Properties (overrideAccess).
  for (const [key, site, status] of [
    ["propA", siteA, "active"],
    ["propAWithdrawn", siteA, "withdrawn"],
    ["propB", siteB, "active"],
  ] as const) {
    const doc = await payload.create({
      collection: "properties",
      data: { site, feedId: key, feedName: `Cabin ${key}`, status },
    })
    ids[key] = doc.id
  }

  for (const [key, site, path, draft] of [
    ["pageA", siteA, "/about", false],
    ["pageADraft", siteA, "/draft", true],
    ["pageB", siteB, "/about", false],
  ] as const) {
    const doc = await payload.create({
      collection: "pages",
      data: {
        site,
        title: key,
        path,
        _status: draft ? "draft" : "published",
      },
      draft,
    })
    ids[key] = doc.id
  }
})

afterAll(() => t?.teardown())

describe("Properties", () => {
  it("an Editor of Site A reads only Site A's Properties", async () => {
    const docs = await readAs(editorA, "properties")
    expect(docs.map((d) => d.id).sort()).toEqual(
      [ids.propA, ids.propAWithdrawn].sort()
    )
  })

  it("an Editor of Site A can't read or update Site B's Property by id", async () => {
    await expect(
      payload.findByID({
        collection: "properties",
        id: ids.propB!,
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: "properties",
        id: ids.propB!,
        data: { slug: "hijacked" },
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toThrow()
  })

  it("an Editor updates Editorial Content on their Site but not Property Facts", async () => {
    const updated = await payload.update({
      collection: "properties",
      id: ids.propA!,
      data: { slug: "renamed", bedrooms: 99 },
      overrideAccess: false,
      user: editorA,
    })
    expect(updated.slug).toBe("renamed")
    expect(updated.bedrooms ?? null).toBeNull()
  })

  it("Staff Users can't create or delete Properties (Sync only)", async () => {
    await expect(
      payload.create({
        collection: "properties",
        data: { site: siteA, feedId: "x", status: "active" },
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toThrow()
    await expect(
      payload.delete({
        collection: "properties",
        id: ids.propA!,
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toThrow()
  })

  it("each SiteReader reads only its own Site's Active Properties", async () => {
    expect((await readAs(readerA, "properties")).map((d) => d.id)).toEqual([
      ids.propA,
    ])
    expect((await readAs(readerB, "properties")).map((d) => d.id)).toEqual([
      ids.propB,
    ])
  })

  it("Withdrawn Properties are invisible to readers", async () => {
    await expect(
      payload.findByID({
        collection: "properties",
        id: ids.propAWithdrawn!,
        overrideAccess: false,
        user: readerA,
      })
    ).rejects.toThrow()
  })

  it("a SiteReader can't update its own Site's Properties", async () => {
    await expect(
      payload.update({
        collection: "properties",
        id: ids.propA!,
        data: { slug: "reader-edit" },
        overrideAccess: false,
        user: readerA,
      })
    ).rejects.toThrow()
  })
})

describe("Pages", () => {
  it("an Editor of Site A reads only Site A's Pages", async () => {
    const docs = await readAs(editorA, "pages", { draft: true })
    expect(docs.map((d) => d.id).sort()).toEqual(
      [ids.pageA, ids.pageADraft].sort()
    )
  })

  it("an Editor of Site A can't update Site B's Page or create one on Site B", async () => {
    await expect(
      payload.update({
        collection: "pages",
        id: ids.pageB!,
        data: { title: "hijacked" },
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: "pages",
        data: { site: siteB, title: "x", path: "/x", _status: "published" },
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toThrow()
  })

  it("each SiteReader reads only its own Site's published Pages", async () => {
    expect((await readAs(readerA, "pages")).map((d) => d.id)).toEqual([
      ids.pageA,
    ])
    expect((await readAs(readerB, "pages")).map((d) => d.id)).toEqual([
      ids.pageB,
    ])
  })

  it("drafts are invisible to readers, even with draft=true", async () => {
    const docs = await readAs(readerA, "pages", { draft: true })
    expect(docs.map((d) => d.id)).not.toContain(ids.pageADraft)
    expect(docs.every((d) => siteOf(d) === siteA)).toBe(true)
    await expect(
      payload.findVersions({
        collection: "pages",
        overrideAccess: false,
        user: readerA,
      })
    ).rejects.toThrow()
  })

  it("an Editor's version history is limited to their Sites", async () => {
    const { docs } = await payload.findVersions({
      collection: "pages",
      overrideAccess: false,
      user: editorA,
      depth: 0,
    })
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.every((d) => siteOf(d.version) === siteA)).toBe(true)
  })
})

describe("anonymous requests", () => {
  it("read nothing", async () => {
    for (const collection of [
      "properties",
      "pages",
      "sites",
      "users",
      "site-readers",
      "submissions",
      "amenities",
    ] as const) {
      expect(await readAs(null, collection, { draft: true })).toEqual([])
    }
  })
})

describe("Sites", () => {
  it("staff and readers see only their own Site", async () => {
    expect((await readAs(editorA, "sites")).map((d) => d.id)).toEqual([siteA])
    expect((await readAs(readerB, "sites")).map((d) => d.id)).toEqual([siteB])
  })

  it("hides the revalidation secret from Editors and readers", async () => {
    for (const user of [editorA, readerA]) {
      const site = await payload.findByID({
        collection: "sites",
        id: siteA,
        overrideAccess: false,
        user,
      })
      expect(site.revalidationSecret).toBeUndefined()
    }
    const site = await payload.findByID({
      collection: "sites",
      id: siteA,
      overrideAccess: false,
      user: adminA,
    })
    expect(site.revalidationSecret).toBe("secret-a")
  })

  it("only Super Admins create Sites; Admins update only their own", async () => {
    await expect(
      payload.create({
        collection: "sites",
        data: { name: "C", slug: "site-c" },
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: "sites",
        id: siteB,
        data: { name: "hijacked" },
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toThrow()
    const updated = await payload.update({
      collection: "sites",
      id: siteA,
      data: { name: "Site A!" },
      overrideAccess: false,
      user: adminA,
    })
    expect(updated.name).toBe("Site A!")
  })
})

describe("Users and SiteReaders", () => {
  it("an Editor sees only Staff Users sharing their Sites", async () => {
    const docs = (await readAs(editorA, "users")) as { email?: string }[]
    expect(docs.map((d) => d.email).sort()).toEqual([
      "admin-a@example.com",
      "editor-a@example.com",
    ])
  })

  it("an Editor can't make themselves Admin or Super Admin", async () => {
    const updated = await payload.update({
      collection: "users",
      id: editorA!.id as ID,
      data: { role: "admin", superAdmin: true, tenants: [{ site: siteB }] },
      overrideAccess: false,
      user: editorA,
    })
    expect(updated.role).toBe("editor")
    expect(updated.superAdmin).not.toBe(true)
    expect(updated.tenants?.map((row) => siteOf(row))).toEqual([siteA])
  })

  it("an Admin manages only their own Site's SiteReaders", async () => {
    const docs = await readAs(adminA, "site-readers")
    expect(docs.map(siteOf)).toEqual([siteA])
    await expect(
      payload.create({
        collection: "site-readers",
        data: { site: siteB, name: "sneaky" },
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toThrow()
    expect(await readAs(editorA, "site-readers")).toEqual([])
    expect(await readAs(readerA, "site-readers")).toEqual([])
  })
})

describe("Staff Users shared between Sites", () => {
  let shared: { id: ID }

  beforeAll(async () => {
    shared = await payload.create({
      collection: "users",
      data: {
        email: "shared@example.com",
        password: "password",
        role: "editor",
        tenants: [{ site: siteA }, { site: siteB }],
      },
    })
  })

  it("an Admin can't change their email or password", async () => {
    for (const data of [
      { password: "taken-over" },
      { email: "attacker@example.com" },
    ]) {
      await expect(
        payload.update({
          collection: "users",
          id: shared.id,
          data,
          overrideAccess: false,
          user: adminA,
        })
      ).rejects.toThrow()
    }
  })

  it("an Admin edits them without touching other Sites' assignment", async () => {
    const updated = await payload.update({
      collection: "users",
      id: shared.id,
      data: { name: "Shared" },
      overrideAccess: false,
      user: adminA,
    })
    expect(updated.name).toBe("Shared")
    expect(updated.tenants?.map((row) => siteOf(row))).toEqual([siteA, siteB])

    await expect(
      payload.update({
        collection: "users",
        id: shared.id,
        data: { tenants: [{ site: siteA }] },
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toThrow()
  })
})

describe("break-glass admin", () => {
  it("an existing break-glass account is made a Super Admin", async () => {
    const legacy = await payload.create({
      collection: "users",
      data: {
        email: "legacy-glass@example.com",
        password: "password",
        role: "admin",
      },
    })
    expect(legacy.superAdmin).not.toBe(true)
    await seedBreakGlassAdmin(payload, {
      email: "legacy-glass@example.com",
      password: "password",
    })
    const after = await payload.findByID({ collection: "users", id: legacy.id })
    expect(after.superAdmin).toBe(true)
  })
})

describe("Submissions", () => {
  it("a SiteReader creates Submissions for its own Site only, and can't read them", async () => {
    const doc = await payload.create({
      collection: "submissions",
      data: {
        site: siteB,
        kind: "inquiry",
        name: "Guest",
        email: "guest@example.com",
        payload: {},
        forwardingStatus: "sent",
      },
      overrideAccess: false,
      user: readerA,
    })
    const stored = await payload.findByID({
      collection: "submissions",
      id: doc.id,
      depth: 0,
    })
    expect(siteOf(stored)).toBe(siteA)
    expect(stored.forwardingStatus).toBe("pending")

    expect(await readAs(readerA, "submissions")).toEqual([])
    expect((await readAs(editorA, "submissions")).map((d) => d.id)).toEqual([
      doc.id,
    ])
    expect(
      await readAs(
        await staff("editor-b2@example.com", "editor", siteB),
        "submissions"
      )
    ).toEqual([])
  })
})

describe("vocabularies", () => {
  it("are readable by readers and staff, and writable by nobody", async () => {
    await payload.create({
      collection: "amenities",
      data: { feedId: "hot-tub", name: "Hot tub" },
    })
    expect(await readAs(readerA, "amenities")).toHaveLength(1)
    expect(await readAs(editorA, "amenities")).toHaveLength(1)
    await expect(
      payload.create({
        collection: "amenities",
        data: { feedId: "x", name: "x" },
        overrideAccess: false,
        user: adminA,
      })
    ).rejects.toThrow()
  })
})

describe("configuration", () => {
  // Payload (and the multi-tenant plugin) default a missing access function
  // to "any logged-in user", which would include SiteReaders.
  it("SiteReaders can't update or delete anything", async () => {
    for (const { slug } of payload.config.collections) {
      if (slug.startsWith("payload-")) continue
      const where = { id: { exists: true } }
      const before = await payload.count({ collection: slug })
      for (const op of ["update", "delete"] as const) {
        try {
          const result =
            op === "update"
              ? await payload.update({
                  collection: slug,
                  where,
                  data: {},
                  overrideAccess: false,
                  user: readerA,
                })
              : await payload.delete({
                  collection: slug,
                  where,
                  overrideAccess: false,
                  user: readerA,
                })
          expect(result.docs, `${slug} ${op}`).toEqual([])
        } catch (error) {
          expect((error as { status?: number }).status, `${slug} ${op}`).toBe(
            403
          )
        }
      }
      expect(await payload.count({ collection: slug })).toEqual(before)
    }
  })

  it("every Site-scoped collection has a site field", () => {
    for (const slug of Object.keys(tenantCollections)) {
      const collection = payload.collections[slug as CollectionSlug]
      expect(collection, slug).toBeDefined()
      expect(
        collection.config.flattenedFields.some((f) => f.name === "site"),
        slug
      ).toBe(true)
    }
  })
})
