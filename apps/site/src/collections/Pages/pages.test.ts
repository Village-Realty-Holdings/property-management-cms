import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { checkPagePath, defaultPagePath } from "./path"

let t: TestPayload
let payload: Payload
let staff: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  staff = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
})

afterAll(() => t?.teardown())

const staffUser = () => ({ ...staff, collection: "users" as const })
const asVisitor = { overrideAccess: false, user: null } as const

const heroLayout = [{ blockType: "hero" as const, heading: "Welcome" }]

describe("Page paths", () => {
  it.each([
    ["/", true],
    ["/about", true],
    ["/company/team-2", true],
    ["about", false],
    ["/About", false],
    ["/about/", false],
    ["/a//b", false],
    ["/admin", false],
    ["/p-admin/x", false],
    ["/api", false],
    ["/auth/dev", false],
  ])("%s is %s", (path, ok) => {
    expect(checkPagePath(path) === true).toBe(ok)
  })

  it("defaults from the title, and Home is /", () => {
    expect(defaultPagePath("About Us & More")).toBe("/about-us-and-more")
    expect(defaultPagePath("Home")).toBe("/")
    expect(defaultPagePath("!!")).toBeNull()
  })

  it("fills the path from the title on create", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Our Story", path: "", layout: heroLayout },
      overrideAccess: false,
      user: staffUser(),
    })
    expect(page.path).toBe("/our-story")
  })

  it("rejects a path another Page uses", async () => {
    await payload.create({
      collection: "pages",
      data: { title: "Contact", path: "/contact" },
      overrideAccess: false,
      user: staffUser(),
    })
    await expect(
      payload.create({
        collection: "pages",
        data: { title: "Contact again", path: "/contact" },
        overrideAccess: false,
        user: staffUser(),
      })
    ).rejects.toMatchObject({
      data: {
        errors: [
          expect.objectContaining({ message: "Another Page uses this path." }),
        ],
      },
    })
  })
})

describe("access", () => {
  it("shows visitors Published Pages only", async () => {
    const published = await payload.create({
      collection: "pages",
      data: { title: "Live", path: "/live", _status: "published" },
      overrideAccess: false,
      user: staffUser(),
    })
    await payload.create({
      collection: "pages",
      data: { title: "Hidden", path: "/hidden", _status: "draft" },
      draft: true,
      overrideAccess: false,
      user: staffUser(),
    })

    const seen = await payload.find({ collection: "pages", ...asVisitor })
    expect(seen.docs.map((doc) => doc.id)).toEqual([published.id])

    const all = await payload.find({
      collection: "pages",
      overrideAccess: false,
      user: staffUser(),
    })
    expect(all.docs.map((doc) => doc.path)).toEqual(
      expect.arrayContaining(["/live", "/hidden"])
    )
  })

  it("shows visitors the Published version, not a newer Draft", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Before", path: "/versioned", _status: "published" },
      overrideAccess: false,
      user: staffUser(),
    })
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "After" },
      draft: true,
      overrideAccess: false,
      user: staffUser(),
    })
    const visitor = await payload.findByID({
      collection: "pages",
      id: page.id,
      ...asVisitor,
    })
    expect(visitor.title).toBe("Before")
    const draft = await payload.findByID({
      collection: "pages",
      id: page.id,
      draft: true,
      overrideAccess: false,
      user: staffUser(),
    })
    expect(draft.title).toBe("After")
  })

  it("lets only Staff Users change content", async () => {
    await expect(
      payload.create({
        collection: "pages",
        data: { title: "Nope", path: "/nope" },
        ...asVisitor,
      })
    ).rejects.toThrow()
    await expect(
      payload.updateGlobal({
        slug: "brand",
        data: { name: "Hacked" },
        ...asVisitor,
      })
    ).rejects.toThrow()
    await expect(
      payload.updateGlobal({
        slug: "seo",
        data: { allowIndexing: false },
        ...asVisitor,
      })
    ).rejects.toThrow()

    const brand = await payload.updateGlobal({
      slug: "brand",
      data: { name: "Awayday" },
      overrideAccess: false,
      user: staffUser(),
    })
    expect(brand.name).toBe("Awayday")
    const read = await payload.findGlobal({ slug: "brand", ...asVisitor })
    expect(read.name).toBe("Awayday")
  })

  it("never lets anyone create a Staff User or change its Entra identity", async () => {
    await expect(
      payload.create({
        collection: "users",
        data: { email: "new@awayday.test", entraOid: "new" },
        overrideAccess: false,
        user: staffUser(),
      })
    ).rejects.toThrow()

    const updated = await payload.update({
      collection: "users",
      id: staff.id,
      data: { name: "Renamed", email: "other@awayday.test", entraOid: "x" },
      overrideAccess: false,
      user: staffUser(),
    })
    expect(updated).toMatchObject({
      name: "Renamed",
      email: "staff@awayday.test",
      entraOid: "staff",
    })

    await expect(
      payload.find({ collection: "users", ...asVisitor })
    ).rejects.toThrow()
  })

  it("rejects a title pattern without %s", async () => {
    await expect(
      payload.updateGlobal({
        slug: "seo",
        data: { titlePattern: "Just the name" },
        overrideAccess: false,
        user: staffUser(),
      })
    ).rejects.toThrow()
  })
})
