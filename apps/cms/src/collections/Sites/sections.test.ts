import type { Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../../test/getTestPayload"

/** Sections on the Site: on by default; Admins edit them, Editors read them. */

type User = TypedUser | null

let t: TestPayload
let payload: Payload
let site: number
let admin: User
let editor: User

async function staff(email: string, role: "admin" | "editor") {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "password", role, tenants: [{ site }] },
  })
  return { ...doc, collection: "users" } as User
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  site = (
    await payload.create({
      collection: "sites",
      data: { name: "Site", slug: "site" },
    })
  ).id
  admin = await staff("admin@example.com", "admin")
  editor = await staff("editor@example.com", "editor")
})

afterAll(() => t?.teardown())

describe("Site Sections", () => {
  it("are all on for a new Site", async () => {
    const doc = await payload.findByID({ collection: "sites", id: site })
    expect(doc.sections).toEqual({
      properties: true,
      inbox: true,
      guides: true,
      curatedLists: true,
    })
  })

  it("are edited by the Site's Admin", async () => {
    const doc = await payload.update({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: admin,
      data: {
        sections: {
          properties: false,
          inbox: false,
          guides: false,
          curatedLists: false,
        },
      },
    })
    expect(doc.sections).toMatchObject({ properties: false, guides: false })
  })

  it("are read but not edited by Editors", async () => {
    const read = await payload.findByID({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: editor,
    })
    expect(read.sections?.properties).toBe(false)

    await expect(
      payload.update({
        collection: "sites",
        id: site,
        overrideAccess: false,
        user: editor,
        data: { sections: { properties: true } },
      })
    ).rejects.toThrow()
    const after = await payload.findByID({ collection: "sites", id: site })
    expect(after.sections?.properties).toBe(false)
  })

  it("keep the Client's details, Admin-editable", async () => {
    const doc = await payload.update({
      collection: "sites",
      id: site,
      overrideAccess: false,
      user: admin,
      data: {
        client: {
          name: "Forever Vacation Rentals",
          website: "https://forever.example/",
        },
      },
    })
    expect(doc.client).toEqual({
      name: "Forever Vacation Rentals",
      website: "https://forever.example/",
    })
  })
})
