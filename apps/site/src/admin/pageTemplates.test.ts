import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { TEMPLATE_IS_NOT_PUBLISHED } from "../collections/Pages"
import {
  ensureStarterTemplates,
  STARTER_TEMPLATES,
} from "../pageTemplates/starters"
import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { loadPageRows } from "./dashboard/queries"
import { waitingToPublish } from "./dashboard/summaries"
import { pageOptions } from "./editor/modes/loadPageMode"
import { newPageDocument } from "./editor/modes/pageDocument"
import type { PageDocument } from "./editor/state"
import { emptyBlock, type BlockValues, type HeroValues } from "./pageForm"
import { savePageAs } from "./pageSave"
import {
  addStarterTemplatesAs,
  loadPageTemplateRows,
  loadPageTemplateStart,
  startersMissing,
} from "./pageTemplates"

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
  // The Site's default Layout, as every started Site has.
  await t.payload.create({
    collection: "layouts",
    data: { name: "Main" },
    ...asStaff,
  })
})

afterEach(async () => {
  await t.payload.delete({
    collection: "pages",
    where: { id: { exists: true } },
  })
  await t.payload.delete({
    collection: "layouts",
    where: { name: { not_equals: "Main" } },
  })
})

afterAll(async () => {
  await t?.teardown()
})

const hero = (heading: string) =>
  ({ ...(emptyBlock("hero") as HeroValues), heading }) as BlockValues

// A Block with rows of its own, which carry ids too.
const amenities = {
  blockType: "amenities",
  heading: "Everything you need",
  variant: "mosaic",
  items: [{ label: "Wi-Fi" }, { label: "Pool" }, { label: "Spa" }],
} as unknown as BlockValues

const landing = (over: Partial<PageDocument> = {}): PageDocument => ({
  ...newPageDocument("/landing"),
  title: "Landing",
  blocks: [hero("Stay with us"), amenities],
  isTemplate: true,
  ...over,
})

const save = (
  document: PageDocument,
  intent: "draft" | "publish" | "unpublish" = "draft",
  id: number | null = null
) => savePageAs(t.payload, asStaff, { id, intent, document })

const idsIn = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(idsIn)
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(([field, entry]) =>
          field === "id" && typeof entry === "string" ? [entry] : idsIn(entry)
        )
      : []

describe("a Page as a Page Template", () => {
  it("is listed with its Blocks once it is saved as one", async () => {
    await save(landing({ isTemplate: false, path: "/plain", title: "Plain" }))
    const saved = await save(landing())

    expect(saved).toMatchObject({ ok: true, document: { isTemplate: true } })
    expect(await loadPageTemplateRows(t.payload, asStaff)).toMatchObject([
      { id: saved.id, name: "Landing", blocks: ["Hero", "Amenities"] },
    ])
  })

  it("can't be published", async () => {
    const result = await save(landing(), "publish")
    expect(result).toEqual({ ok: false, message: TEMPLATE_IS_NOT_PUBLISHED })

    // Nor through Payload itself.
    await expect(
      t.payload.create({
        collection: "pages",
        data: {
          title: "Direct",
          path: "/direct",
          isTemplate: true,
          _status: "published",
        },
        ...asStaff,
      })
    ).rejects.toThrow()
    expect(await t.payload.count({ collection: "pages" })).toMatchObject({
      totalDocs: 0,
    })
  })

  it("is unpublished before a live Page becomes one", async () => {
    const live = await save(landing({ isTemplate: false }), "publish")

    const refused = await save(landing(), "draft", live.id!)
    expect(refused.ok).toBe(false)
    expect(refused.message).toContain("Unpublish it")

    await save(landing({ isTemplate: false }), "unpublish", live.id!)
    expect(await save(landing(), "draft", live.id!)).toMatchObject({ ok: true })
    const visitors = await t.payload.find({ collection: "pages", ...asVisitor })
    expect(visitors.docs).toEqual([])
  })

  it("gives a New Page copies of its Blocks, with no row ids, and its Layout choice", async () => {
    const saved = await save(landing({ layout: { mode: "none" } }))
    expect(idsIn(saved.document!.blocks).length).toBeGreaterThan(2)

    const start = await loadPageTemplateStart(t.payload, asStaff, saved.id!)

    expect(idsIn(start!.blocks)).toEqual([])
    expect(start).toMatchObject({
      layout: { mode: "none" },
      blocks: [
        { blockType: "hero", heading: "Stay with us" },
        {
          blockType: "amenities",
          items: [{ label: "Wi-Fi" }, { label: "Pool" }, { label: "Spa" }],
        },
      ],
    })
  })

  it("makes any number of Pages, which publish and outlive it", async () => {
    const template = await save(landing())

    for (const path of ["/one", "/two"]) {
      const start = await loadPageTemplateStart(
        t.payload,
        asStaff,
        template.id!
      )
      const made = await save(
        { ...newPageDocument(path), ...start! },
        "publish"
      )
      expect(made).toMatchObject({
        ok: true,
        status: "published",
        document: { isTemplate: false },
      })
    }

    await t.payload.delete({
      collection: "pages",
      id: template.id!,
      ...asStaff,
    })
    const visitors = await t.payload.find({
      collection: "pages",
      sort: "path",
      ...asVisitor,
    })
    expect(visitors.docs.map((page) => page.path)).toEqual(["/one", "/two"])
    expect(visitors.docs[0]!.blocks).toMatchObject([
      { heading: "Stay with us" },
      { blockType: "amenities" },
    ])
  })

  it("gives nothing for a Page that is not a Page Template, or is gone", async () => {
    const plain = await save(landing({ isTemplate: false }))
    expect(
      await loadPageTemplateStart(t.payload, asStaff, plain.id!)
    ).toBeNull()
    expect(await loadPageTemplateStart(t.payload, asStaff, 99999)).toBeNull()
    expect(
      await loadPageTemplateStart(t.payload, asStaff, Number.NaN)
    ).toBeNull()
  })

  it("is an ordinary Page again once it is turned off", async () => {
    const saved = await save(landing())
    const off = { ...saved.document!, isTemplate: false }

    expect(await save(off, "publish", saved.id!)).toMatchObject({
      ok: true,
      status: "published",
    })
    expect(await loadPageTemplateRows(t.payload, asStaff)).toEqual([])
  })

  it("is marked in the Pages list, not waiting to publish, and not offered as a link", async () => {
    await save(landing())
    await save(landing({ isTemplate: false, path: "/plain", title: "Plain" }))

    const rows = await loadPageRows(t.payload, asStaff)
    expect(rows.find((row) => row.title === "Landing")?.isTemplate).toBe(true)
    expect(waitingToPublish(rows).map((row) => row.title)).toEqual(["Plain"])
    const options = await pageOptions({
      payload: t.payload,
      user: asStaff.user,
      as: asStaff,
    })
    expect(options.map((option) => option.title)).toEqual(["Plain"])
  })
})

describe("the starter Page Templates", () => {
  it("are valid Draft Pages: Home, Tuck-in and Guest survey", async () => {
    expect(await startersMissing(t.payload, asStaff)).toBe(true)

    const result = await addStarterTemplatesAs(t.payload, asStaff)

    expect(result).toEqual({
      ok: true,
      message:
        "Added “Home template”, “Tuck-in template” and “Guest survey template”.",
    })
    expect(await startersMissing(t.payload, asStaff)).toBe(false)
    const rows = await loadPageTemplateRows(t.payload, asStaff)
    expect(rows.map((row) => row.name)).toEqual([
      "Guest survey template",
      "Home template",
      "Tuck-in template",
    ])
    expect(rows[0]!.blocks).toEqual(["Guest survey"])
    expect(rows[1]!.blocks).toEqual([
      "Search Hero",
      "Featured rentals",
      "Steps",
      "Image + text",
      "Features",
      "Owner band",
      "Testimonials",
      "Call to action",
    ])
    expect(rows[2]!.blocks).toEqual(["Container", "Container"])
    const visitors = await t.payload.find({ collection: "pages", ...asVisitor })
    expect(visitors.docs).toEqual([])
  })

  it("gives Tuck-in its own Layout, which is not the default and is made once", async () => {
    await ensureStarterTemplates(t.payload, asStaff)
    const tuckIn = (await loadPageTemplateRows(t.payload, asStaff)).find(
      (row) => row.name === "Tuck-in template"
    )!

    const { docs: layouts } = await t.payload.find({
      collection: "layouts",
      sort: "id",
      depth: 0,
    })
    expect(
      layouts.map((layout) => [layout.name, layout.isDefault, layout.paths])
    ).toEqual([
      ["Main", true, []],
      ["Tuck-in", false, []],
      ["Survey", false, []],
    ])
    expect(layouts[2]!.header?.map((block) => block.blockType)).toEqual([
      "logo",
    ])
    expect(layouts[2]!.footer?.[0]).toMatchObject({
      blockType: "legalBar",
      links: [
        { label: "Privacy Policy", link: { type: "url", url: "/privacy" } },
      ],
    })
    expect(layouts[1]!.header?.map((block) => block.blockType)).toEqual([
      "logo",
      "headerActions",
    ])
    expect(layouts[1]!.footer?.map((block) => block.blockType)).toEqual([
      "legalBar",
    ])
    // A New Page made from it wears that Layout: twice, a Container of text
    // across the page with its button under it.
    const start = await loadPageTemplateStart(t.payload, asStaff, tuckIn.id)
    expect(start!.layout).toEqual({ mode: "layout", layoutId: layouts[1]!.id })
    expect(start!.blocks).toMatchObject([
      {
        blockType: "container",
        columns: "1",
        children: [
          { blockType: "richText", width: "wide" },
          { blockType: "button", link: { label: "Learn More" } },
        ],
      },
      {
        blockType: "container",
        columns: "1",
        children: [
          { blockType: "richText", width: "wide" },
          { blockType: "button", link: { label: "Explore Our Properties" } },
        ],
      },
    ])

    // Deleting the Page Template and adding it again reuses the Layout.
    await t.payload.delete({ collection: "pages", id: tuckIn.id, ...asStaff })
    await ensureStarterTemplates(t.payload, asStaff)
    expect(await t.payload.count({ collection: "layouts" })).toMatchObject({
      totalDocs: 3,
    })
  })

  it("make Pages that publish as they are", async () => {
    await ensureStarterTemplates(t.payload, asStaff)
    const rows = await loadPageTemplateRows(t.payload, asStaff)

    for (const [index, row] of rows.entries()) {
      const start = await loadPageTemplateStart(t.payload, asStaff, row.id)
      const made = await save(
        { ...newPageDocument(`/made-${index}`), ...start! },
        "publish"
      )
      expect(made).toMatchObject({ ok: true, status: "published" })
    }
  })

  it("are added once, and a changed one is left as it is", async () => {
    await ensureStarterTemplates(t.payload, asStaff)
    const home = (await loadPageTemplateRows(t.payload, asStaff)).find(
      (row) => row.name === "Home template"
    )
    const page = await t.payload.findByID({
      collection: "pages",
      id: home!.id,
      draft: true,
      depth: 0,
    })
    await t.payload.update({
      collection: "pages",
      id: home!.id,
      data: { title: "Our Home", blocks: page.blocks!.slice(0, 1) },
      draft: true,
      ...asStaff,
    })

    const again = await ensureStarterTemplates(t.payload, asStaff)

    expect(again.map((starter) => starter.action)).toEqual([
      "unchanged",
      "unchanged",
      "unchanged",
    ])
    expect(await t.payload.count({ collection: "pages" })).toMatchObject({
      totalDocs: STARTER_TEMPLATES.length,
    })
    expect(
      (await loadPageTemplateRows(t.payload, asStaff)).map((row) => row.name)
    ).toEqual(["Guest survey template", "Our Home", "Tuck-in template"])
    expect(await addStarterTemplatesAs(t.payload, asStaff)).toEqual({
      ok: true,
      message: "The starter Page Templates are already here.",
    })
  })
})
