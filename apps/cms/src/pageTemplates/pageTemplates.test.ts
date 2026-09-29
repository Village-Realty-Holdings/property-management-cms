import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"

/** Creating a Page from a Page Template (Tuck-In) pre-fills its Blocks. */

let t: TestPayload
let payload: Payload
let site: number

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  site = (
    await payload.create({
      collection: "sites",
      data: {
        name: "Beach Bums",
        slug: "beach-bums",
        client: { name: "Forever", website: "https://forever.example/" },
        branding: { phone: "555 0100", email: "hi@forever.example" },
      },
    })
  ).id
})

afterAll(() => t?.teardown())

describe("Page Templates", () => {
  it("Tuck-In pre-fills Announcement, owners, guests and Contact", async () => {
    const page = await payload.create({
      collection: "pages",
      data: {
        site,
        title: "Home",
        path: "/",
        template: "tuckIn",
        _status: "published",
      },
    })
    expect(page.template).toBe("tuckIn")
    const layout = page.layout ?? []
    expect(
      layout.map((block) =>
        block.blockType === "audience"
          ? `audience:${block.audience}`
          : block.blockType
      )
    ).toEqual(["announcement", "audience:owners", "audience:guests", "contact"])

    const [announcement, owners, guests, contact] = layout
    expect(announcement).toMatchObject({ headline: "{site} Joins {client}!" })
    expect(owners).toMatchObject({
      title: "What Owners Can Expect",
      cta: { label: "Learn More", href: "{client-url}" },
    })
    expect(guests).toMatchObject({
      cta: { href: "{client-url}" },
    })
    expect(contact).toMatchObject({ phone: "{phone}", email: "{email}" })
    expect(JSON.stringify(owners)).toContain('"url":"{client-url}"')
    expect(page.seo?.title).toBe("{site} Joins {client}")
  })

  it("keeps Blocks and SEO the editor already set", async () => {
    const page = await payload.create({
      collection: "pages",
      data: {
        site,
        title: "Own copy",
        path: "/own",
        template: "tuckIn",
        seo: { title: "Custom title" },
        layout: [{ blockType: "announcement", headline: "Big news" }],
      },
    })
    expect(page.layout).toHaveLength(1)
    expect(page.seo?.title).toBe("Custom title")
  })

  it("Blank is the default and starts empty", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { site, title: "About", path: "/about" },
    })
    expect(page.template).toBe("blank")
    expect(page.layout ?? []).toEqual([])
  })

  it("the template can't change after the Page is created", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { site, title: "Later", path: "/later" },
    })
    const updated = await payload.update({
      collection: "pages",
      id: page.id,
      overrideAccess: false,
      user: {
        ...(await payload.create({
          collection: "users",
          data: {
            email: "super@example.com",
            password: "password",
            role: "admin",
            superAdmin: true,
          },
        })),
        collection: "users",
      },
      data: { template: "tuckIn" },
    })
    expect(updated.template).toBe("blank")
    expect(updated.layout ?? []).toEqual([])
  })
})
