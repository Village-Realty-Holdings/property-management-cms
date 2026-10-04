import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { exportPageAs, importPageAs, type PageFile } from "./pageTransfer"

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let t: TestPayload
let asUser: { overrideAccess: false; user: User & { collection: "users" } }
const asVisitor = { overrideAccess: false, user: null } as const
let photo: { id: number; filename: string }
let layoutId: number
let pageId: number

const upload = async (name: string) => {
  const doc = await t.payload.create({
    collection: "media",
    data: { alt: `Alt of ${name}` },
    file: { data: PNG, mimetype: "image/png", name, size: PNG.length },
    ...asUser,
  })
  return { id: doc.id, filename: doc.filename! }
}

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
  photo = await upload(`transfer-${Date.now()}.png`)
  layoutId = (
    await t.payload.create({
      collection: "layouts",
      data: { name: "Campaign" },
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
        seo: { title: "Spring", description: "Offers.", image: photo.id },
        blocks: [
          { blockType: "hero", heading: "Spring is here", image: photo.id },
          {
            blockType: "container",
            columns: "2",
            children: [
              { blockType: "image", image: photo.id, aspect: "16x9" },
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
  await t?.payload.delete({
    collection: "media",
    where: { id: { exists: true } },
  })
  await t?.teardown()
})

const exported = async (id = pageId) => {
  const result = await exportPageAs(t.payload, asUser, id)
  if (!result.ok) throw new Error(result.message)
  return { ...result, file: JSON.parse(result.json) as PageFile }
}

const draft = (id: number) =>
  t.payload.findByID({
    collection: "pages",
    id,
    draft: true,
    depth: 0,
    ...asUser,
  })

describe("exporting a Page", () => {
  it("writes its title, path, Blocks, SEO and Layout, with images by file name", async () => {
    const { filename, file, json } = await exported()
    expect(filename).toBe("spring.page.json")
    const image = {
      $media: {
        filename: photo.filename,
        alt: expect.stringMatching(/^Alt of/),
      },
    }
    expect(file).toMatchObject({
      awaydayPage: 1,
      title: "Spring offer",
      path: "/spring",
      layout: { mode: "specific", name: "Campaign" },
      seo: { title: "Spring", description: "Offers.", image },
      blocks: [
        { blockType: "hero", heading: "Spring is here", image },
        {
          blockType: "container",
          columns: "2",
          children: [
            { blockType: "image", image },
            { blockType: "button", link: { label: "Book", href: "/book" } },
          ],
        },
      ],
    })
    // Nothing that belongs to this Site only: no ids, no status, no dates.
    expect(json).not.toMatch(/"id":/)
    expect(json).not.toMatch(/"_status"|"createdAt"|"updatedAt"/)
  })

  it("names the Home Page's file home, and refuses a Page that is gone", async () => {
    const home = await t.payload.create({
      collection: "pages",
      data: { title: "Home", path: "/", _status: "draft" },
      draft: true,
      ...asUser,
    })
    expect((await exported(home.id)).filename).toBe("home.page.json")
    await t.payload.delete({ collection: "pages", id: home.id, ...asUser })
    for (const id of [home.id, 0, "1", null]) {
      expect(await exportPageAs(t.payload, asUser, id)).toEqual({
        ok: false,
        message: "That Page no longer exists.",
      })
    }
  })
})

describe("importing a Page", () => {
  it("adds it as a new Draft at the next free path, with its images and Layout", async () => {
    const { json } = await exported()
    const result = await importPageAs(t.payload, asUser, json)
    expect(result).toMatchObject({
      ok: true,
      message: "Imported “Spring offer” as a Draft at /spring-2.",
      notes: ["“/spring” is taken, so the Page is at “/spring-2”."],
    })
    const page = await draft(result.id!)
    expect(page).toMatchObject({
      title: "Spring offer",
      path: "/spring-2",
      _status: "draft",
      layout: { mode: "specific", layout: layoutId },
      seo: { title: "Spring", image: photo.id },
    })
    expect(page.blocks).toMatchObject([
      { blockType: "hero", heading: "Spring is here", image: photo.id },
      { blockType: "container", children: [{ image: photo.id }, {}] },
    ])
    // The Page it came from is as it was, and visitors don't see the new one.
    expect((await draft(pageId)).path).toBe("/spring")
    const seen = await t.payload.find({
      collection: "pages",
      where: { path: { equals: "/spring-2" } },
      ...asVisitor,
    })
    expect(seen.docs).toEqual([])
  })

  it("leaves out an image and a Layout this Site doesn't have, and says which", async () => {
    const { file } = await exported()
    const elsewhere = JSON.stringify({
      ...file,
      path: "/elsewhere",
      layout: { mode: "specific", name: "Summer" },
      blocks: [
        {
          blockType: "hero",
          heading: "Spring is here",
          image: { $media: { filename: "not-here.jpg", alt: "" } },
        },
      ],
      seo: { title: "Spring" },
    })
    const result = await importPageAs(t.payload, asUser, elsewhere)
    expect(result.ok).toBe(true)
    expect(result.notes).toEqual([
      "An image is not in this Site's Media and was left out: not-here.jpg. Upload it and pick it again.",
      "This Site has no Layout called “Summer”, so the Page uses the Layout for its path.",
    ])
    const page = await draft(result.id!)
    expect(page.path).toBe("/elsewhere")
    expect(page.layout?.mode).toBe("route")
    expect((page.blocks?.[0] as { image?: unknown }).image ?? null).toBeNull()
  })

  it("keeps a Page Template a Page Template", async () => {
    const template = await t.payload.create({
      collection: "pages",
      data: {
        title: "Offer template",
        path: "/templates/offer",
        isTemplate: true,
        _status: "draft",
      },
      draft: true,
      ...asUser,
    })
    const { json, file } = await exported(template.id)
    expect(file.isTemplate).toBe(true)
    const result = await importPageAs(t.payload, asUser, json)
    expect((await draft(result.id!)).isTemplate).toBe(true)
  })

  it("refuses a file that isn't a Page, and says why", async () => {
    const load = (text: unknown) => importPageAs(t.payload, asUser, text)
    expect((await load("nope")).message).toBe(
      "That file isn't a Page: it isn't JSON."
    )
    expect((await load('{"awaydayTheme":1}')).message).toContain(
      "isn't a Page exported from an Awayday Site"
    )
    expect((await load("x".repeat(2_000_001))).ok).toBe(false)
    const { file } = await exported()
    expect((await load(JSON.stringify({ ...file, title: " " }))).message).toBe(
      "The Page in the file has no title."
    )
    expect(
      (await load(JSON.stringify({ ...file, path: "/Admin Area" }))).message
    ).toContain("The Page's path can't be used.")
    expect(
      (
        await load(
          JSON.stringify({ ...file, blocks: [{ blockType: "carousel3d" }] })
        )
      ).message
    ).toContain("“carousel3d” Block")
  })

  it("refuses someone who isn't signed in", async () => {
    const { json } = await exported()
    const before = await t.payload.count({ collection: "pages" })
    const result = await importPageAs(t.payload, asVisitor, json)
    expect(result.ok).toBe(false)
    expect(await t.payload.count({ collection: "pages" })).toEqual(before)
  })
})
