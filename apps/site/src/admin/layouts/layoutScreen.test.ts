import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { defaultLayoutData } from "../../layouts/defaultLayout"
import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { truncateTables } from "../../test/truncateTables"
import type { BlockValues } from "../pageForm"
import type { LayoutDocument } from "../editor/state"
import {
  createUntitledLayout,
  layoutToDocument,
  loadLayoutScreen,
  loadPreviewPage,
  restoreLayoutAs,
  saveLayoutAs,
  UNTITLED_LAYOUT,
} from "./layoutScreen"

/** What Layout mode reads and does, as the User. */

let t: TestPayload
let payload: Payload
let as: { overrideAccess: false; user: User & { collection: "users" } }

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const testUser = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", name: "Sam Taylor", entraOid: "s" },
  })
  as = { overrideAccess: false, user: { ...testUser, collection: "users" } }
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(payload, "pages", "_pages_v", "layouts", "_layouts_v")
})

const layout = (data: Record<string, unknown>) =>
  payload.create({ collection: "layouts", data: data as never, ...as })
const page = (title: string, path: string, extra = {}) =>
  payload.create({
    collection: "pages",
    data: { title, path, _status: "published", ...extra },
    ...as,
  })
const strip = (text: string) => [{ blockType: "utilityStrip" as const, text }]
const stripOf = (doc: LayoutDocument) =>
  (doc.header as unknown as { text?: string }[])[0]?.text

describe("layoutToDocument", () => {
  it("turns a stored Layout into the editor's document", async () => {
    const saved = await layout({
      name: "Main",
      header: strip("Hello"),
      paths: [{ path: "/stays" }],
    })
    const doc = layoutToDocument(saved)
    expect(doc).toMatchObject({
      kind: "layout",
      name: "Main",
      paths: ["/stays"],
      isDefault: true,
      footer: [],
    })
    expect(stripOf(doc)).toBe("Hello")
  })
})

describe("loadLayoutScreen", () => {
  it("is null for a Layout that is not there", async () => {
    expect(await loadLayoutScreen(payload, as, 999_999)).toBeNull()
  })

  it("counts the Pages that use the Layout, and previews the first of them", async () => {
    const main = await layout({ name: "Main" })
    const stays = await layout({ name: "Stays", paths: [{ path: "/stays" }] })
    await page("Home", "/")
    await page("Cabin", "/stays/cabin")
    await page("Lodge", "/stays/lodge")

    const screen = await loadLayoutScreen(payload, as, stays.id)
    expect(screen?.usedBy).toBe(2)
    expect(screen?.preview?.path).toMatch(/^\/stays\//)

    const other = await loadLayoutScreen(payload, as, main.id)
    expect(other?.usedBy).toBe(1)
    expect(other?.preview?.path).toBe("/")
  })

  it("previews Home when no Page uses the Layout, and nothing when there is no Home", async () => {
    await layout({ name: "Main" })
    const spare = await layout({ name: "Spare" })
    expect((await loadLayoutScreen(payload, as, spare.id))?.preview).toBeNull()

    await page("Home", "/")
    const screen = await loadLayoutScreen(payload, as, spare.id)
    expect(screen?.usedBy).toBe(0)
    expect(screen?.preview).toMatchObject({ title: "Home", path: "/" })
  })

  it("lists the versions newest first, with who saved them", async () => {
    const saved = await layout({ name: "Main", header: strip("One") })
    const screen = await loadLayoutScreen(payload, as, saved.id)
    expect(screen?.history).toHaveLength(1)
    expect(screen?.history[0]).toMatchObject({
      isLive: true,
      author: "Sam Taylor",
    })
    expect(screen?.history[0]?.savedAt).toMatch(/^\d{4}-\d\d-\d\dT/)
  })
})

describe("loadPreviewPage", () => {
  it("reads a Page's newest version (the Draft) with its Blocks", async () => {
    const saved = await page("About", "/about", {
      blocks: [{ blockType: "callToAction", heading: "Book now" }],
    })
    await payload.update({
      collection: "pages",
      id: saved.id,
      data: { title: "About us" },
      draft: true,
      ...as,
    })
    const preview = await loadPreviewPage(payload, as, saved.id)
    expect(preview).toMatchObject({ id: saved.id, title: "About us" })
    expect(preview?.blocks).toHaveLength(1)
  })

  it("is null for a Page that is not there", async () => {
    expect(await loadPreviewPage(payload, as, 999_999)).toBeNull()
  })
})

describe("saveLayoutAs", () => {
  async function opened(data: Record<string, unknown> = {}) {
    const saved = await layout({ name: "Main", header: strip("One"), ...data })
    const screen = await loadLayoutScreen(payload, as, saved.id)
    return { id: saved.id, doc: screen!.doc }
  }

  it("goes live at once, and says how many Pages changed", async () => {
    const { id, doc } = await opened()
    await page("Home", "/")
    await page("About", "/about")

    const result = await saveLayoutAs(payload, as, id, {
      ...doc,
      header: strip("Two") as unknown as BlockValues[],
    })

    expect(result.ok).toBe(true)
    expect(result.message).toBe("Layout saved: 2 Pages changed.")
    expect(result.usedBy).toBe(2)
    expect(stripOf(result.doc!)).toBe("Two")
    const live = await payload.findByID({
      collection: "layouts",
      id,
      depth: 0,
      overrideAccess: false,
      user: null,
    })
    expect((live.header as { text?: string }[])[0]?.text).toBe("Two")
    // The version is in the history it returns.
    expect(result.history).toHaveLength(2)
    expect(result.history?.[0]?.isLive).toBe(true)
  })

  it("records the note as the version's summary, and without one describes the change", async () => {
    const { id, doc } = await opened()
    const noted = await saveLayoutAs(
      payload,
      as,
      id,
      { ...doc, name: "Main 2" },
      { note: "  Summer offers  " }
    )
    expect(noted.ok).toBe(true)
    expect(noted.history?.[0]?.summary).toBe("Summer offers")

    const plain = await saveLayoutAs(
      payload,
      as,
      id,
      { ...doc, name: "Main 3" },
      { note: "   " }
    )
    expect(plain.history?.[0]?.summary).not.toBe("Summer offers")
    expect(plain.history?.[0]?.summary).toBeTruthy()
    // The note is spent on its own version.
    expect(plain.history?.[1]?.summary).toBe("Summer offers")
  })

  it("names a single Page, and a Layout no Page uses", async () => {
    const { id, doc } = await opened()
    const none = await saveLayoutAs(payload, as, id, { ...doc, name: "Main 2" })
    expect(none.message).toBe("Layout saved. No Pages use it yet.")
    await page("Home", "/")
    const one = await saveLayoutAs(payload, as, id, { ...doc, name: "Main 3" })
    expect(one.message).toBe("Layout saved: 1 Page changed.")
  })

  it("does not store the editor's temporary Block ids", async () => {
    const { id, doc } = await opened()
    const added = {
      ...doc,
      footer: [
        { id: "new-7", blockType: "legalBar", text: "© {year}" },
      ] as unknown as BlockValues[],
    }
    const result = await saveLayoutAs(payload, as, id, added)
    expect(result.ok).toBe(true)
    const stored = result.doc!.footer[0]!
    expect(stored.id).toBeTruthy()
    expect(stored.id).not.toBe("new-7")
  })

  it("saves the name and paths, dropping blank paths", async () => {
    const { id, doc } = await opened()
    const result = await saveLayoutAs(payload, as, id, {
      ...doc,
      name: "  Listings  ",
      paths: ["/stays", "  ", "/rentals/"],
    })
    expect(result.ok).toBe(true)
    expect(result.doc).toMatchObject({
      name: "Listings",
      paths: ["/stays", "/rentals"],
    })
  })

  it("fails inline, and saves nothing, for a blank name", async () => {
    const { id, doc } = await opened()
    const result = await saveLayoutAs(payload, as, id, { ...doc, name: "   " })
    expect(result).toMatchObject({ ok: false })
    expect(result.message).toMatch(/name/i)
    const screen = await loadLayoutScreen(payload, as, id)
    expect(screen?.history).toHaveLength(1)
  })

  it("fails inline when Payload refuses, such as a path another Layout owns", async () => {
    await layout({ name: "Stays", paths: [{ path: "/stays" }] })
    const { id, doc } = await opened()
    const result = await saveLayoutAs(payload, as, id, {
      ...doc,
      paths: ["/stays"],
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
  })

  it("fails for a Layout that is gone", async () => {
    const { doc } = await opened()
    const result = await saveLayoutAs(payload, as, 999_999, doc)
    expect(result).toMatchObject({
      ok: false,
      message: "That Layout no longer exists.",
    })
  })
})

describe("restoreLayoutAs", () => {
  it("puts an earlier version live as a new version, and says how far it reached", async () => {
    const saved = await layout({ name: "Main", header: strip("One") })
    await page("Home", "/")
    const first = await loadLayoutScreen(payload, as, saved.id)
    const oldVersion = first!.history[0]!.id
    await saveLayoutAs(payload, as, saved.id, {
      ...first!.doc,
      header: strip("Two") as unknown as BlockValues[],
    })

    const result = await restoreLayoutAs(payload, as, saved.id, oldVersion)

    expect(result.ok).toBe(true)
    expect(result.message).toBe("Version restored: 1 Page changed.")
    expect(stripOf(result.doc!)).toBe("One")
    expect(result.history).toHaveLength(3)
    expect(result.history?.[0]?.isLive).toBe(true)
  })

  it("fails inline for a version that is not there", async () => {
    const saved = await layout({ name: "Main" })
    const result = await restoreLayoutAs(payload, as, saved.id, 999_999)
    expect(result).toMatchObject({ ok: false })
    expect(result.message).toBe("That version no longer exists.")
  })
})

describe("createUntitledLayout", () => {
  it("makes a Layout from the default Layout's content, which is not the default", async () => {
    await layout({ ...defaultLayoutData(), name: "Site default" })
    const id = await createUntitledLayout(payload, as)
    const made = await payload.findByID({
      collection: "layouts",
      id,
      depth: 0,
      ...as,
    })
    expect(made.name).toBe(UNTITLED_LAYOUT)
    expect(made.isDefault).toBe(false)
    expect(made.paths ?? []).toEqual([])
    expect(made.header?.map((b) => b.blockType)).toEqual([
      "logo",
      "headerActions",
    ])
    expect(made.footer?.map((b) => b.blockType)).toEqual([
      "footerColumns",
      "legalBar",
    ])
  })

  it("numbers the name when Untitled Layout is taken", async () => {
    await layout({ ...defaultLayoutData(), name: "Site default" })
    await createUntitledLayout(payload, as)
    const second = await createUntitledLayout(payload, as)
    const made = await payload.findByID({
      collection: "layouts",
      id: second,
      depth: 0,
      ...as,
    })
    expect(made.name).toBe(`${UNTITLED_LAYOUT} 2`)
  })

  it("is the default when it is the Site's first Layout", async () => {
    const id = await createUntitledLayout(payload, as)
    const made = await payload.findByID({
      collection: "layouts",
      id,
      depth: 0,
      ...as,
    })
    expect(made.isDefault).toBe(true)
  })
})
