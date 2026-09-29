import type { Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../../test/getTestPayload"

/**
 * Site Settings field access (./fieldAccess.ts): Editors and SiteReaders read
 * every area except secrets, only Admins write, only Super Admins change the
 * slug. And the admin tabs are layout only: every area keeps its storage path.
 */

type User = TypedUser | null
type ID = number

let t: TestPayload
let payload: Payload

let site: ID
let superAdmin: User
let admin: User
let editor: User

async function staff(
  email: string,
  data: { role: "admin" | "editor"; superAdmin?: boolean }
) {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "password", tenants: [{ site }], ...data },
  })
  return { ...doc, collection: "users" } as User
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  site = (
    await payload.create({
      collection: "sites",
      data: { name: "Site", slug: "site", revalidationSecret: "s3cret" },
    })
  ).id
  superAdmin = await staff("super@example.com", {
    role: "admin",
    superAdmin: true,
  })
  admin = await staff("admin@example.com", { role: "admin" })
  editor = await staff("editor@example.com", { role: "editor" })
})

afterAll(() => t?.teardown())

describe("Site Settings", () => {
  it("keeps every settings area at its storage path", () => {
    const names = payload.collections.sites.config.flattenedFields.map(
      (field) => field.name
    )
    expect(names).toEqual(
      expect.arrayContaining([
        "name",
        "slug",
        "domain",
        "deploymentUrl",
        "revalidationSecret",
        "feedAccountRef",
        "branding",
        "legacyUrls",
        "amenityPresentation",
        "propertyTypeLabels",
        "stayPolicyDefaults",
        "moderation",
        "forwarding",
      ])
    )
  })

  it("are written by the Site's Admin in every tab", async () => {
    const updated = await payload.update({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: admin,
      data: {
        name: "Renamed Site",
        feedAccountRef: "acct-1",
        branding: { primaryColor: "#1f4d3a", phone: "+1 555 0100" },
        legacyUrls: { redirects: [{ from: "/about-us.html", to: "/about" }] },
        stayPolicyDefaults: { checkIn: "16:00" },
        moderation: { autoShowMinRating: 4 },
        forwarding: {
          destinations: [
            { kind: "inquiry", type: "email", emailTo: "desk@example.com" },
          ],
        },
      },
    })
    expect(updated.name).toBe("Renamed Site")
    expect(updated.feedAccountRef).toBe("acct-1")
    expect(updated.branding?.primaryColor).toBe("#1f4d3a")
    expect(updated.branding?.phone).toBe("+1 555 0100")
    expect(updated.legacyUrls?.redirects?.[0]?.to).toBe("/about")
    expect(updated.stayPolicyDefaults?.checkIn).toBe("16:00")
    expect(updated.moderation?.autoShowMinRating).toBe(4)
    expect(updated.forwarding?.destinations?.[0]?.kind).toBe("inquiry")
  })

  it("are read by Editors, without the secrets", async () => {
    const doc = await payload.findByID({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: editor,
    })
    expect(doc.branding?.primaryColor).toBe("#1f4d3a")
    expect(doc.moderation?.autoShowMinRating).toBe(4)
    expect(doc.stayPolicyDefaults?.checkIn).toBe("16:00")
    expect(doc.revalidationSecret).toBeUndefined()
  })

  it("can't be written by Editors", async () => {
    await expect(
      payload.update({
        collection: "sites",
        id: site,
        overrideAccess: false,
        user: editor,
        data: { moderation: { autoShowMinRating: 1 } },
      })
    ).rejects.toThrow()
  })

  it("let the Admin read and change the revalidation secret", async () => {
    const updated = await payload.update({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: admin,
      data: { revalidationSecret: "rotated" },
    })
    expect(updated.revalidationSecret).toBe("rotated")
  })

  it("let only Super Admins change the slug", async () => {
    const byAdmin = await payload.update({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: admin,
      data: { slug: "hijacked" },
    })
    expect(byAdmin.slug).toBe("site")

    const bySuperAdmin = await payload.update({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: superAdmin,
      data: { slug: "site-renamed" },
    })
    expect(bySuperAdmin.slug).toBe("site-renamed")
  })
})
