import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { duplicatePageAs } from "./pageDuplicate"

let t: TestPayload
let asUser: { overrideAccess: false; user: User & { collection: "users" } }
const asVisitor = { overrideAccess: false, user: null } as const
let layoutId: number
let pageId: number

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "duplicate@awayday.test", entraOid: "duplicate" },
  })
  asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
  layoutId = (
    await t.payload.create({
      collection: "layouts",
      data: { name: "Duplicate campaign" },
      ...asUser,
    })
  ).id
  pageId = (
    await t.payload.create({
      collection: "pages",
      data: {
        title: "Spring offer",
        path: "/spring",
        _status: "published",
        layout: { mode: "specific", layout: layoutId },
        seo: { title: "Spring", description: "Offers." },
        blocks: [
          { blockType: "hero", heading: "Spring is here" },
          {
            blockType: "container",
            columns: "2",
            children: [
              {
                blockType: "button",
                link: { label: "Book", href: "/book" },
                style: "primary",
                align: "start",
              },
            ],
          },
        ] as never,
      },
      ...asUser,
    })
  ).id
})

afterAll(async () => {
  await t?.payload.delete({
    collection: "pages",
    where: { id: { exists: true } },
  })
  await t?.teardown()
})

const draft = (id: number) =>
  t.payload.findByID({
    collection: "pages",
    id,
    draft: true,
    depth: 0,
    ...asUser,
  })

describe("duplicating a Page", () => {
  it("adds a Draft “Title (copy)” at a free path, with its own Blocks, SEO and Layout", async () => {
    const result = await duplicatePageAs(t.payload, asUser, pageId)
    expect(result).toMatchObject({
      ok: true,
      message: "Duplicated as “Spring offer (copy)” at /spring-2.",
    })
    const copy = await draft(result.id!)
    expect(copy).toMatchObject({
      title: "Spring offer (copy)",
      path: "/spring-2",
      _status: "draft",
      isTemplate: false,
      layout: { mode: "specific", layout: layoutId },
      seo: { title: "Spring", description: "Offers." },
    })
    expect(copy.blocks).toMatchObject([
      { blockType: "hero", heading: "Spring is here" },
      {
        blockType: "container",
        children: [{ blockType: "button", link: { label: "Book" } }],
      },
    ])

    // The copy has Block ids of its own.
    const source = await draft(pageId)
    const ids = (blocks: typeof source.blocks) =>
      (blocks ?? []).flatMap((block) => [
        block.id,
        ...("children" in block
          ? (block.children as { id?: string }[]).map((child) => child.id)
          : []),
      ])
    expect(ids(copy.blocks).filter(Boolean)).toHaveLength(3)
    for (const id of ids(copy.blocks))
      expect(ids(source.blocks)).not.toContain(id)
  })

  it("leaves the Page as it was and keeps the copy off the Site", async () => {
    const before = await draft(pageId)
    const result = await duplicatePageAs(t.payload, asUser, pageId)
    expect(result.ok).toBe(true)
    const after = await draft(pageId)
    expect(after).toMatchObject({
      title: "Spring offer",
      path: "/spring",
      _status: "published",
      updatedAt: before.updatedAt,
    })
    const seen = await t.payload.find({
      collection: "pages",
      where: { id: { equals: result.id } },
      ...asVisitor,
    })
    expect(seen.docs).toEqual([])
  })

  it("copies the Draft, not the Published version, and gives the next free path each time", async () => {
    await t.payload.update({
      collection: "pages",
      id: pageId,
      data: { title: "Spring offer, draft", _status: "draft" },
      draft: true,
      ...asUser,
    })
    const first = await duplicatePageAs(t.payload, asUser, pageId)
    const second = await duplicatePageAs(t.payload, asUser, pageId)
    expect((await draft(first.id!)).title).toBe("Spring offer, draft (copy)")
    expect((await draft(first.id!)).path).not.toBe(
      (await draft(second.id!)).path
    )
    expect((await draft(second.id!)).path).toMatch(/^\/spring-\d+$/)
  })

  it("makes a Page Template's copy an ordinary Page", async () => {
    const template = await t.payload.create({
      collection: "pages",
      data: {
        title: "Starter",
        path: "/duplicate-starter",
        isTemplate: true,
        _status: "draft",
      },
      draft: true,
      ...asUser,
    })
    const result = await duplicatePageAs(t.payload, asUser, template.id)
    expect(result.ok).toBe(true)
    expect(await draft(result.id!)).toMatchObject({
      title: "Starter (copy)",
      isTemplate: false,
    })
  })

  it("gives the Home Page's copy a path of its own", async () => {
    const home = await t.payload.create({
      collection: "pages",
      data: { title: "Home", path: "/", _status: "draft" },
      draft: true,
      ...asUser,
    })
    const result = await duplicatePageAs(t.payload, asUser, home.id)
    expect(result.ok).toBe(true)
    expect((await draft(result.id!)).path).toBe("/home-2")
  })

  it("refuses a Page that is gone or an id that isn't one", async () => {
    const gone = await t.payload.create({
      collection: "pages",
      data: { title: "Gone", path: "/duplicate-gone", _status: "draft" },
      draft: true,
      ...asUser,
    })
    await t.payload.delete({ collection: "pages", id: gone.id, ...asUser })
    for (const id of [gone.id, 0, -1, "1", null]) {
      expect(await duplicatePageAs(t.payload, asUser, id)).toEqual({
        ok: false,
        message: "That Page no longer exists.",
      })
    }
  })

  it("refuses a Visitor", async () => {
    const count = () =>
      t.payload.count({ collection: "pages", overrideAccess: true })
    const before = (await count()).totalDocs
    const result = await duplicatePageAs(t.payload, asVisitor, pageId)
    expect(result.ok).toBe(false)
    expect((await count()).totalDocs).toBe(before)
  })
})
