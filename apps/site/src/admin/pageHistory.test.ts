import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { pageDocumentFromPage } from "./editor/modes/pageDocument"
import type { PageDocument } from "./editor/state"
import { emptyBlock, type HeroValues } from "./pageForm"
import { readPageVersionRows, restorePageVersionAs } from "./pageHistory"
import { savePageAs } from "./pageSave"

type Access = { overrideAccess: false; user: User & { collection: "users" } }

let t: TestPayload
let asAva: Access
let asSam: Access

const hero = (heading: string) =>
  ({ ...(emptyBlock("hero") as HeroValues), heading }) as HeroValues

const pageDoc = (over: Partial<PageDocument> = {}): PageDocument => ({
  kind: "page",
  title: "Lodge",
  path: "/lodge",
  layout: { mode: "default" },
  blocks: [hero("v1")],
  seo: { title: "", description: "", image: null },
  ...over,
})

beforeAll(async () => {
  t = await getTestPayload()
  const make = async (name: string, oid: string) => {
    const user = await t.payload.create({
      collection: "users",
      data: { name, email: `${oid}@awayday.test`, entraOid: oid },
    })
    return {
      overrideAccess: false,
      user: { ...user, collection: "users" },
    } as Access
  }
  asAva = await make("Ava Stone", "ava")
  asSam = await make("Sam Taylor", "sam")
})

afterAll(async () => {
  await t?.teardown()
})

const latestOf = (id: number) =>
  t.payload.findByID({
    collection: "pages",
    id,
    draft: true,
    depth: 0,
    ...asAva,
  })

/** A Page saved as v1 (Ava, Draft), v2 (Sam, published) and v3 (Ava, Draft). */
async function threeVersions(path: string) {
  const first = await savePageAs(t.payload, asAva, {
    id: null,
    intent: "draft",
    document: pageDoc({ path, blocks: [hero("v1")] }),
  })
  const id = first.id!
  await savePageAs(t.payload, asSam, {
    id,
    intent: "publish",
    document: pageDoc({ path, blocks: [hero("v2")] }),
  })
  await savePageAs(t.payload, asAva, {
    id,
    intent: "draft",
    document: pageDoc({ path, blocks: [hero("v3")] }),
  })
  return id
}

describe("readPageVersionRows", () => {
  it("lists every save newest first, with author, status and which is the latest", async () => {
    const id = await threeVersions("/rows")
    const rows = await readPageVersionRows(t.payload, asAva, id)
    expect(rows.map((r) => r.author)).toEqual([
      "Ava Stone",
      "Sam Taylor",
      "Ava Stone",
    ])
    expect(rows.map((r) => r.status)).toEqual(["draft", "published", "draft"])
    expect(rows.map((r) => r.isLatest)).toEqual([true, false, false])
    expect(rows[0]!.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("is what a save returns as `history`", async () => {
    const result = await savePageAs(t.payload, asAva, {
      id: null,
      intent: "draft",
      document: pageDoc({ path: "/returns-history" }),
    })
    expect(result.history).toHaveLength(1)
    expect(result.history![0]).toMatchObject({
      author: "Ava Stone",
      status: "draft",
      isLatest: true,
    })
  })

  it("refuses a visitor", async () => {
    const id = await threeVersions("/refused")
    await expect(
      readPageVersionRows(t.payload, { overrideAccess: false, user: null }, id)
    ).rejects.toThrow()
  })
})

describe("restorePageVersionAs", () => {
  it("saves the old version as a new Draft and keeps the history growing", async () => {
    const id = await threeVersions("/restore")
    const [, v2] = await readPageVersionRows(t.payload, asAva, id)
    const result = await restorePageVersionAs(t.payload, asSam, id, v2!.id)

    expect(result.ok).toBe(true)
    expect(result.message).toContain("Draft")
    expect((result.document!.blocks[0] as HeroValues).heading).toBe("v2")
    // v2 was published; the Page is live as v2 and the Draft is v2 again.
    const rows = result.history!
    expect(rows).toHaveLength(4)
    expect(rows[0]).toMatchObject({
      author: "Sam Taylor",
      status: "draft",
      isLatest: true,
    })
    expect(
      (pageDocumentFromPage(await latestOf(id)).blocks[0] as HeroValues).heading
    ).toBe("v2")
  })

  it("leaves what visitors see alone, and says the Page has changes", async () => {
    const id = await threeVersions("/restore-live")
    const rows = await readPageVersionRows(t.payload, asAva, id)
    const result = await restorePageVersionAs(t.payload, asAva, id, rows[2]!.id)
    expect(result.status).toBe("changes")
    const live = await t.payload.findByID({
      collection: "pages",
      id,
      draft: false,
      depth: 0,
      overrideAccess: false,
      user: null,
    })
    expect((live.blocks![0] as { heading: string }).heading).toBe("v2")
    expect(live._status).toBe("published")
  })

  it("gives the Blocks fresh row ids rather than reusing the version's", async () => {
    // Each save sends back the stored document, ids included, as the editor
    // does, so the versions' Block ids match the live rows.
    const first = await savePageAs(t.payload, asAva, {
      id: null,
      intent: "draft",
      document: pageDoc({ path: "/restore-ids", blocks: [hero("v1")] }),
    })
    const id = first.id!
    const second = await savePageAs(t.payload, asAva, {
      id,
      intent: "draft",
      document: {
        ...first.document!,
        blocks: [
          { ...first.document!.blocks[0]!, heading: "v2" } as HeroValues,
        ],
      },
    })
    expect(second.ok).toBe(true)
    const rows = await readPageVersionRows(t.payload, asAva, id)
    const target = rows[1]!
    const version = await t.payload.findVersionByID({
      collection: "pages",
      id: String(target.id),
      depth: 0,
      ...asAva,
    })
    const versionIds = version.version.blocks!.map((b) => b.id)
    expect(versionIds[0]).toBeTruthy()

    await restorePageVersionAs(t.payload, asAva, id, target.id)
    const after = (await latestOf(id)).blocks!.map((b) => b.id)
    expect(after).toHaveLength(versionIds.length)
    for (const rowId of after) {
      expect(typeof rowId).toBe("string")
      expect(rowId).not.toBe("")
      expect(versionIds).not.toContain(rowId)
    }
  })

  it("keeps the Page's current Page Template setting", async () => {
    const id = await threeVersions("/restore-template")
    await savePageAs(t.payload, asAva, {
      id,
      intent: "unpublish",
      document: pageDoc({ path: "/restore-template", blocks: [hero("v4")] }),
    })
    await savePageAs(t.payload, asAva, {
      id,
      intent: "draft",
      document: pageDoc({
        path: "/restore-template",
        blocks: [hero("v5")],
        isTemplate: true,
      }),
    })
    const rows = await readPageVersionRows(t.payload, asAva, id)
    const result = await restorePageVersionAs(
      t.payload,
      asAva,
      id,
      rows.at(-1)!.id
    )
    expect(result.ok).toBe(true)
    expect(result.document!.isTemplate).toBe(true)
    expect((result.document!.blocks[0] as HeroValues).heading).toBe("v1")
  })

  it("falls back to the Layout the path gives when the version's Layout is gone", async () => {
    // The Site's default Layout can't be deleted, so the short-lived one is the second.
    // Deleting a Layout clears it from the versions that chose it (the foreign
    // key is ON DELETE set null), so the restored Page is back on route mode.
    await t.payload.create({
      collection: "layouts",
      data: { name: "Main", isDefault: true },
      ...asAva,
    })
    const layout = await t.payload.create({
      collection: "layouts",
      data: { name: "Short lived" },
      ...asAva,
    })
    const first = await savePageAs(t.payload, asAva, {
      id: null,
      intent: "draft",
      document: pageDoc({
        path: "/restore-layout",
        layout: { mode: "layout", layoutId: layout.id },
      }),
    })
    const id = first.id!
    await savePageAs(t.payload, asAva, {
      id,
      intent: "draft",
      document: pageDoc({
        path: "/restore-layout",
        blocks: [hero("later")],
        layout: { mode: "none" },
      }),
    })
    await t.payload.delete({
      collection: "layouts",
      id: layout.id,
      overrideAccess: true,
    })
    const rows = await readPageVersionRows(t.payload, asAva, id)
    const result = await restorePageVersionAs(
      t.payload,
      asAva,
      id,
      rows.at(-1)!.id
    )
    expect(result.ok).toBe(true)
    expect(result.document!.layout).toEqual({ mode: "default" })
  })

  it("refuses a version of another Page", async () => {
    const a = await threeVersions("/restore-a")
    const b = await threeVersions("/restore-b")
    const [bLatest] = await readPageVersionRows(t.payload, asAva, b)
    const result = await restorePageVersionAs(t.payload, asAva, a, bLatest!.id)
    expect(result).toEqual({
      ok: false,
      message: "That version no longer exists.",
    })
  })

  it("says so when the version or the Page is not there", async () => {
    const id = await threeVersions("/restore-gone")
    expect(
      (await restorePageVersionAs(t.payload, asAva, id, 999_999)).message
    ).toBe("That version no longer exists.")
    expect((await restorePageVersionAs(t.payload, asAva, id, -1)).ok).toBe(
      false
    )
    expect((await restorePageVersionAs(t.payload, asAva, 0, 1)).message).toBe(
      "That Page no longer exists."
    )
  })

  it("refuses a visitor", async () => {
    const id = await threeVersions("/restore-visitor")
    const [, v2] = await readPageVersionRows(t.payload, asAva, id)
    const result = await restorePageVersionAs(
      t.payload,
      { overrideAccess: false, user: null },
      id,
      v2!.id
    )
    expect(result.ok).toBe(false)
  })

  it("reports a path another Page has taken since, and saves nothing", async () => {
    const first = await savePageAs(t.payload, asAva, {
      id: null,
      intent: "publish",
      document: pageDoc({ path: "/restore-taken", blocks: [hero("v1")] }),
    })
    const id = first.id!
    await savePageAs(t.payload, asAva, {
      id,
      intent: "publish",
      document: pageDoc({ path: "/restore-moved", blocks: [hero("moved")] }),
    })
    const squatter = await savePageAs(t.payload, asAva, {
      id: null,
      intent: "publish",
      document: pageDoc({ title: "Squatter", path: "/restore-taken" }),
    })
    expect(squatter.ok).toBe(true)
    const before = await readPageVersionRows(t.payload, asAva, id)
    const result = await restorePageVersionAs(
      t.payload,
      asAva,
      id,
      before.at(-1)!.id
    )
    expect(result.ok).toBe(false)
    expect(result.fieldErrors?.path).toBe("Another Page uses this path.")
    expect(await readPageVersionRows(t.payload, asAva, id)).toHaveLength(
      before.length
    )
  })
})
