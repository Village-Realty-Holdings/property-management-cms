import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { pageDocumentFromPage } from "./editor/modes/pageDocument"
import type { PageDocument } from "./editor/state"
import { emptyBlock, type HeroValues } from "./pageForm"
import { deletePageAs, savePageAs } from "./pageSave"

/** A Page document with nothing in it but what a test names. */
const pageDoc = (over: Partial<PageDocument> = {}): PageDocument => ({
  kind: "page",
  title: "",
  path: "",
  layout: { mode: "default" },
  blocks: [],
  seo: { title: "", description: "", image: null },
  ...over,
})

let t: TestPayload
let asStaff: { overrideAccess: false; user: User & { collection: "users" } }
const asVisitor = { overrideAccess: false, user: null } as const

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  asStaff = { overrideAccess: false, user: { ...user, collection: "users" } }
})

afterAll(async () => {
  await t?.teardown()
})

const about = pageDoc({
  title: "About",
  path: "/about",
  blocks: [{ ...(emptyBlock("hero") as HeroValues), heading: "About us" }],
})

const publicPage = (path: string) =>
  t.payload.find({
    collection: "pages",
    where: { path: { equals: path } },
    ...asVisitor,
  })

describe("saving a Page keeps its Layout choice", () => {
  it("stores the Layout the document carries, in every intent", async () => {
    const layout = await t.payload.create({
      collection: "layouts",
      data: { name: "Kept Layout" },
      ...asStaff,
    })
    const page = await t.payload.create({
      collection: "pages",
      data: {
        title: "Keeper",
        path: "/keeper",
        layout: { mode: "specific", layout: layout.id },
      },
      ...asStaff,
    })
    for (const intent of ["draft", "publish", "unpublish"] as const) {
      const result = await savePageAs(t.payload, asStaff, {
        id: page.id,
        intent,
        document: {
          ...about,
          title: "Keeper",
          path: "/keeper",
          layout: { mode: "layout", layoutId: layout.id },
        },
      })
      expect(result.ok).toBe(true)
      const latest = await t.payload.findByID({
        collection: "pages",
        id: page.id,
        draft: true,
        depth: 0,
        ...asStaff,
      })
      expect(latest.layout).toMatchObject({
        mode: "specific",
        layout: layout.id,
      })
    }
  })
})

describe("saving a Page from the Admin form", () => {
  let id: number

  it("creates a Draft that visitors cannot see", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id: null,
      intent: "draft",
      document: about,
    })
    expect(result).toMatchObject({
      ok: true,
      message: "Draft saved.",
      status: "draft",
    })
    expect(result.id).toBeGreaterThan(0)
    // The values as stored: Blocks now carry their ids.
    expect(result.document?.title).toBe("About")
    expect(result.document?.blocks[0]?.id).toBeTruthy()
    id = result.id!
    expect((await publicPage("/about")).docs).toHaveLength(0)
  })

  it("publishes it", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id,
      intent: "publish",
      document: about,
    })
    expect(result).toMatchObject({
      ok: true,
      message: "Published. The Page is live on the Site.",
      status: "published",
    })
    expect((await publicPage("/about")).docs).toHaveLength(1)
  })

  it("keeps the Published version when saving a Draft, and says so in the status", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id,
      intent: "draft",
      document: { ...about, title: "About v2" },
    })
    expect(result).toMatchObject({ ok: true, status: "changes" })
    expect(result.document?.title).toBe("About v2")
    expect((await publicPage("/about")).docs[0]?.title).toBe("About")
  })

  it("unpublishes, taking the Page off the Site but keeping it", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id,
      intent: "unpublish",
      document: about,
    })
    expect(result).toMatchObject({
      ok: true,
      message: "Unpublished. Visitors no longer see this Page.",
      status: "draft",
    })
    expect((await publicPage("/about")).docs).toHaveLength(0)
  })

  it("fills in the path from the title and returns it", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id: null,
      intent: "draft",
      document: pageDoc({ title: "Our Rooms" }),
    })
    expect(result.ok).toBe(true)
    expect(result.document?.path).toBe("/our-rooms")
  })

  it("returns field errors, and no id, when the Page is invalid", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id: null,
      intent: "draft",
      document: pageDoc({ title: "Bad path", path: "no-slash" }),
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBe("Some fields need attention.")
    expect(result.fieldErrors?.path).toBeTruthy()
    expect(result.id).toBeUndefined()
  })

  it("refuses an unknown intent", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id,
      intent: "explode" as never,
      document: about,
    })
    expect(result.ok).toBe(false)
  })

  it("refuses a visitor, and says so instead of throwing", async () => {
    const result = await savePageAs(t.payload, asVisitor, {
      id: null,
      intent: "draft",
      document: pageDoc({ title: "Sneaky" }),
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
  })
})

describe("saving Blocks from the Visual Editor", () => {
  it("keeps Blocks of every kind as they are, and gives new Blocks real ids", async () => {
    const richText = {
      root: {
        type: "root",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "paragraph",
            version: 1,
            direction: "ltr",
            format: "",
            indent: 0,
            textFormat: 0,
            textStyle: "",
            children: [
              {
                type: "text",
                version: 1,
                text: "Plain words",
                format: 0,
                detail: 0,
                mode: "normal",
                style: "",
              },
            ],
          },
        ],
      },
    }
    const result = await savePageAs(t.payload, asStaff, {
      id: null,
      intent: "draft",
      document: pageDoc({
        title: "Mixed",
        path: "/mixed",
        blocks: [
          { id: "new-1", blockType: "richText", content: richText } as never,
          {
            id: "new-2",
            blockType: "faq",
            heading: "Questions",
            items: [{ question: "Why?", answer: "Because." }],
          } as never,
        ],
      }),
    })
    expect(result.ok, result.message).toBe(true)
    const blocks = result.document!.blocks
    expect(blocks.map((b) => b.blockType)).toEqual(["richText", "faq"])
    expect(blocks.every((b) => b.id && !/^new-/.test(b.id))).toBe(true)
    expect(blocks[1]).toMatchObject({ heading: "Questions" })
    const stored = await t.payload.findByID({
      collection: "pages",
      id: result.id!,
      draft: true,
      depth: 0,
      ...asStaff,
    })
    expect(JSON.stringify(stored.blocks)).toContain("Plain words")
  })

  it("loads back as the document it saved", async () => {
    const result = await savePageAs(t.payload, asStaff, {
      id: null,
      intent: "draft",
      document: pageDoc({ title: "Round trip", path: "/round-trip" }),
    })
    const stored = await t.payload.findByID({
      collection: "pages",
      id: result.id!,
      draft: true,
      depth: 0,
      ...asStaff,
    })
    expect(pageDocumentFromPage(stored)).toEqual(result.document)
  })
})

describe("deleting a Page", () => {
  it("deletes it for good and says which Page went", async () => {
    const saved = await savePageAs(t.payload, asStaff, {
      id: null,
      intent: "publish",
      document: pageDoc({ title: "Old news", path: "/old-news" }),
    })
    const result = await deletePageAs(t.payload, asStaff, saved.id!)
    expect(result).toEqual({ ok: true, message: "Deleted Page “Old news”." })
    expect((await publicPage("/old-news")).docs).toHaveLength(0)
  })

  it("reports a Page that is already gone", async () => {
    const result = await deletePageAs(t.payload, asStaff, 999_999)
    expect(result).toEqual({
      ok: false,
      message: "That Page no longer exists.",
    })
  })

  it("refuses a visitor", async () => {
    const saved = await savePageAs(t.payload, asStaff, {
      id: null,
      intent: "draft",
      document: pageDoc({ title: "Keep me", path: "/keep-me" }),
    })
    const result = await deletePageAs(t.payload, asVisitor, saved.id!)
    expect(result.ok).toBe(false)
    expect(
      await t.payload.findByID({
        collection: "pages",
        id: saved.id!,
        draft: true,
      })
    ).toBeTruthy()
  })
})
