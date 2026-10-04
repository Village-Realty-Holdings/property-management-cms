import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { truncateTables } from "../test/truncateTables"
import { CLASSIC, HARBOUR } from "../theme"
import { listThemeHistory, saveTheme } from "../theme/record"
import { listLayoutHistory, saveLayout } from "../layouts/record"
import { readPageVersionRows } from "./pageHistory"
import { emptyBrand } from "./brandForm"
import { emptySeo } from "./seoForm"
import { readRevision, staleSaveRefusal } from "./revision"
import { saveBrandAs, saveSeoAs } from "./settingsSave"
import { latestRevision } from "./staleSave"

type Access = { overrideAccess: false; user: User & { collection: "users" } }

let t: TestPayload
let asAva: Access
let asSam: Access

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

beforeEach(async () => {
  await truncateTables(
    t.payload,
    "pages",
    "_pages_v",
    "layouts",
    "_layouts_v",
    "theme",
    "_theme_v",
    "brand",
    "seo"
  )
})

afterAll(async () => {
  await t?.teardown()
})

const NOBODY = { revision: null, at: null, by: null, byId: null }

const newPage = (as: Access, path = "/lodge") =>
  t.payload.create({
    collection: "pages",
    data: { title: "Lodge", path },
    draft: true,
    ...as,
  })

describe("readRevision", () => {
  it("is all nulls for a Page or Layout with no versions", async () => {
    expect(
      await readRevision(t.payload, asAva, { kind: "page", id: 999 })
    ).toEqual(NOBODY)
    expect(
      await readRevision(t.payload, asAva, { kind: "layout", id: 999 })
    ).toEqual(NOBODY)
  })

  it("is all nulls for a never-saved Theme, Brand or SEO", async () => {
    expect(await readRevision(t.payload, asAva, { kind: "theme" })).toEqual(
      NOBODY
    )
    expect(await readRevision(t.payload, asAva, { kind: "brand" })).toEqual(
      NOBODY
    )
    expect(await readRevision(t.payload, asAva, { kind: "seo" })).toEqual(
      NOBODY
    )
  })

  it("names the latest Page version and who saved it", async () => {
    const page = await newPage(asAva)
    await t.payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Lodge 2" },
      draft: true,
      ...asSam,
    })
    const info = await readRevision(t.payload, asAva, {
      kind: "page",
      id: page.id,
    })
    const rows = await readPageVersionRows(t.payload, asAva, page.id)
    expect(info.revision).toBe(latestRevision(rows))
    expect(info.by).toBe("Sam Taylor")
    expect(info.byId).toBe(asSam.user.id)
    expect(info.at).toBe(rows[0]!.savedAt)
    expect(info.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("names the latest Layout version and who saved it", async () => {
    const saved = await saveLayout(t.payload, {
      user: asAva.user,
      data: { name: "Main", header: [], footer: [], paths: [] },
    })
    await saveLayout(t.payload, {
      user: asSam.user,
      id: saved.id,
      data: { name: "Main 2", header: [], footer: [], paths: [] },
    })
    const info = await readRevision(t.payload, asAva, {
      kind: "layout",
      id: saved.id,
    })
    const history = await listLayoutHistory(t.payload, {
      user: asAva.user,
      id: saved.id,
    })
    expect(info.revision).toBe(latestRevision(history))
    expect(info.by).toBe("Sam Taylor")
    expect(info.byId).toBe(asSam.user.id)
    expect(info.at).toBe(history[0]!.savedAt)
  })

  it("names the latest Theme version and who saved it", async () => {
    await saveTheme(t.payload, { user: asAva.user, inputs: CLASSIC.inputs })
    await saveTheme(t.payload, { user: asSam.user, inputs: HARBOUR.inputs })
    const info = await readRevision(t.payload, asAva, { kind: "theme" })
    const history = await listThemeHistory(t.payload, { user: asAva.user })
    expect(info.revision).toBe(latestRevision(history))
    expect(info.by).toBe("Sam Taylor")
    expect(info.byId).toBe(asSam.user.id)
    expect(info.at).toBe(history[0]!.savedAt)
  })

  it("is the global's updatedAt for Brand and SEO, with nobody named", async () => {
    await saveBrandAs(t.payload, asSam, { ...emptyBrand, name: "Warren" })
    await saveSeoAs(t.payload, asSam, emptySeo)
    for (const kind of ["brand", "seo"] as const) {
      const stored = await t.payload.findGlobal({ slug: kind, ...asAva })
      const info = await readRevision(t.payload, asAva, { kind })
      expect(stored.updatedAt).toBeTruthy()
      expect(info).toEqual({
        revision: stored.updatedAt,
        at: stored.updatedAt,
        by: null,
        byId: null,
      })
    }
  })
})

describe("staleSaveRefusal", () => {
  async function samSavedAfterAva() {
    const page = await newPage(asAva)
    const opened = (
      await readRevision(t.payload, asAva, { kind: "page", id: page.id })
    ).revision
    await t.payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Lodge 2" },
      draft: true,
      ...asSam,
    })
    return { target: { kind: "page", id: page.id } as const, opened }
  }

  it("goes ahead when expected is undefined, even over a newer save", async () => {
    const { target } = await samSavedAfterAva()
    expect(await staleSaveRefusal(t.payload, asAva, target, {})).toBeNull()
    expect(await staleSaveRefusal(t.payload, asAva, target)).toBeNull()
  })

  it("goes ahead when force is true", async () => {
    const { target, opened } = await samSavedAfterAva()
    expect(
      await staleSaveRefusal(t.payload, asAva, target, {
        expected: opened,
        force: true,
      })
    ).toBeNull()
  })

  it("goes ahead when expected is the current revision", async () => {
    const { target } = await samSavedAfterAva()
    const { revision } = await readRevision(t.payload, asAva, target)
    expect(
      await staleSaveRefusal(t.payload, asAva, target, { expected: revision })
    ).toBeNull()
  })

  it("goes ahead when nothing is stored", async () => {
    expect(
      await staleSaveRefusal(
        t.payload,
        asAva,
        { kind: "theme" },
        { expected: "5" }
      )
    ).toBeNull()
    expect(
      await staleSaveRefusal(
        t.payload,
        asAva,
        { kind: "layout", id: 999 },
        { expected: null }
      )
    ).toBeNull()
  })

  it("refuses with who and when when the revisions differ", async () => {
    const { target, opened } = await samSavedAfterAva()
    const refusal = await staleSaveRefusal(t.payload, asAva, target, {
      expected: opened,
    })
    const info = await readRevision(t.payload, asAva, target)
    expect(refusal).toEqual({
      ok: false,
      message: "This Page changed since you opened it.",
      conflict: {
        kind: "page",
        by: "Sam Taylor",
        byYou: false,
        at: info.at,
      },
    })
  })

  it("says byYou when the same User saved", async () => {
    const { target, opened } = await samSavedAfterAva()
    const refusal = await staleSaveRefusal(t.payload, asSam, target, {
      expected: opened,
    })
    expect(refusal?.conflict).toMatchObject({ by: "Sam Taylor", byYou: true })
  })

  it("refuses a Theme opened before anyone saved, once someone has", async () => {
    await saveTheme(t.payload, { user: asSam.user, inputs: HARBOUR.inputs })
    const refusal = await staleSaveRefusal(
      t.payload,
      asAva,
      { kind: "theme" },
      { expected: null }
    )
    expect(refusal?.message).toBe("The Theme changed since you opened it.")
  })

  it("says when, not who, for the Brand", async () => {
    await saveBrandAs(t.payload, asSam, { ...emptyBrand, name: "Warren" })
    const refusal = await staleSaveRefusal(
      t.payload,
      asAva,
      { kind: "brand" },
      { expected: "2000-01-01T00:00:00.000Z" }
    )
    expect(refusal?.conflict).toMatchObject({
      kind: "brand",
      by: null,
      byYou: false,
    })
  })
})
