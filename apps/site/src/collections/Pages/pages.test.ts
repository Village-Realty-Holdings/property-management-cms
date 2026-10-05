import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { checkPagePath, defaultPagePath } from "./path"

let t: TestPayload
let payload: Payload
let testUser: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  testUser = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", registryUserId: 368570 },
  })
})

afterAll(() => t?.teardown())

const user = () => ({ ...testUser, collection: "users" as const })
const asVisitor = { overrideAccess: false, user: null } as const

const heroBlocks = [{ blockType: "hero" as const, heading: "Welcome" }]

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
      data: { title: "Our Story", path: "", blocks: heroBlocks },
      overrideAccess: false,
      user: user(),
    })
    expect(page.path).toBe("/our-story")
  })

  it("stores the Page's Blocks under `blocks`", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Blocks page", path: "/blocks-page", blocks: heroBlocks },
      overrideAccess: false,
      user: user(),
    })
    const read = await payload.findByID({ collection: "pages", id: page.id })
    expect(read.blocks?.map((b) => b.blockType)).toEqual(["hero"])
  })

  it("rejects a path another Page uses", async () => {
    await payload.create({
      collection: "pages",
      data: { title: "Contact", path: "/contact" },
      overrideAccess: false,
      user: user(),
    })
    await expect(
      payload.create({
        collection: "pages",
        data: { title: "Contact again", path: "/contact" },
        overrideAccess: false,
        user: user(),
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

describe("a Page's Layout", () => {
  const newLayout = (name: string) =>
    payload.create({
      collection: "layouts",
      data: { name },
      overrideAccess: false,
      user: user(),
    })

  it("defaults to the Layout for the Page's path", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Plain", path: "/plain" },
      overrideAccess: false,
      user: user(),
    })
    expect(page.layout?.mode).toBe("route")
    expect(page.layout?.layout ?? null).toBeNull()
  })

  it("rejects a specific Layout without one chosen", async () => {
    await expect(
      payload.create({
        collection: "pages",
        data: {
          title: "Pinned",
          path: "/pinned",
          layout: { mode: "specific" },
        },
        overrideAccess: false,
        user: user(),
      })
    ).rejects.toMatchObject({
      data: {
        errors: [expect.objectContaining({ path: "layout.layout" })],
      },
    })
  })

  it("saves a specific Layout when one is chosen", async () => {
    const chosen = await newLayout("Pinned Layout")
    const page = await payload.create({
      collection: "pages",
      data: {
        title: "Pinned",
        path: "/pinned",
        layout: { mode: "specific", layout: chosen.id },
      },
      overrideAccess: false,
      user: user(),
    })
    const read = await payload.findByID({
      collection: "pages",
      id: page.id,
      depth: 0,
    })
    expect(read.layout).toMatchObject({ mode: "specific", layout: chosen.id })
  })

  it("saves No Layout without one chosen", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Bare", path: "/bare", layout: { mode: "none" } },
      overrideAccess: false,
      user: user(),
    })
    expect(page.layout?.mode).toBe("none")
  })

  it("rejects a specific Layout that does not exist", async () => {
    await expect(
      payload.create({
        collection: "pages",
        data: {
          title: "Ghost",
          path: "/ghost",
          layout: { mode: "specific", layout: 999999 },
        },
        overrideAccess: false,
        user: user(),
      })
    ).rejects.toThrow()
  })
})

describe("who saved a Page", () => {
  it("records the signed-in User on the Page and on each version", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Saved By", path: "/saved-by", blocks: heroBlocks },
      draft: true,
      depth: 0,
      overrideAccess: false,
      user: user(),
    })
    expect(page.updatedBy).toBe(testUser.id)
    const { docs } = await payload.findVersions({
      collection: "pages",
      where: { parent: { equals: page.id } },
      depth: 0,
      overrideAccess: false,
      user: user(),
    })
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.every((v) => v.version.updatedBy === testUser.id)).toBe(true)
  })

  it("keeps nothing a client sends for it, and leaves it empty for a script", async () => {
    const forged = await payload.create({
      collection: "pages",
      data: {
        title: "Forged",
        path: "/forged",
        blocks: heroBlocks,
        updatedBy: 999_999,
      },
      depth: 0,
      overrideAccess: false,
      user: user(),
    })
    expect(forged.updatedBy).toBe(testUser.id)
    const script = await payload.update({
      collection: "pages",
      id: forged.id,
      data: { title: "Forged again" },
      depth: 0,
    })
    expect(script.updatedBy ?? null).toBeNull()
  })

  it("keeps the last 50 versions", async () => {
    const config = payload.collections.pages.config
    expect(
      typeof config.versions === "object" ? config.versions.maxPerDoc : null
    ).toBe(50)
  })
})

describe("access", () => {
  it("shows visitors Published Pages only", async () => {
    const published = await payload.create({
      collection: "pages",
      data: { title: "Live", path: "/live", _status: "published" },
      overrideAccess: false,
      user: user(),
    })
    await payload.create({
      collection: "pages",
      data: { title: "Hidden", path: "/hidden", _status: "draft" },
      draft: true,
      overrideAccess: false,
      user: user(),
    })

    const seen = await payload.find({ collection: "pages", ...asVisitor })
    expect(seen.docs.map((doc) => doc.id)).toEqual([published.id])

    const all = await payload.find({
      collection: "pages",
      overrideAccess: false,
      user: user(),
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
      user: user(),
    })
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "After" },
      draft: true,
      overrideAccess: false,
      user: user(),
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
      user: user(),
    })
    expect(draft.title).toBe("After")
  })

  it("lets only Users change content", async () => {
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
      user: user(),
    })
    expect(brand.name).toBe("Awayday")
    const read = await payload.findGlobal({ slug: "brand", ...asVisitor })
    expect(read.name).toBe("Awayday")
  })

  it("never lets anyone create a User or change its Entra identity", async () => {
    await expect(
      payload.create({
        collection: "users",
        data: { email: "new@awayday.test", registryUserId: 157261 },
        overrideAccess: false,
        user: user(),
      })
    ).rejects.toThrow()

    const updated = await payload.update({
      collection: "users",
      id: testUser.id,
      data: {
        name: "Renamed",
        email: "other@awayday.test",
        registryUserId: 734923,
      },
      overrideAccess: false,
      user: user(),
    })
    expect(updated).toMatchObject({
      name: "Renamed",
      email: "staff@awayday.test",
      registryUserId: 368570,
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
        user: user(),
      })
    ).rejects.toThrow()
  })
})
