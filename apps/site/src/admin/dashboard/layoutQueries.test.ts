import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { loadDashboard, loadLayoutRows, loadPageRows } from "./queries"

/** The Layouts list, the Pages list's Layout column and Continue editing. */

let t: TestPayload
let payload: Payload
let as: { overrideAccess: false; user: User & { collection: "users" } }
let mainId: number
let listingsId: number

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const testUser = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  as = { overrideAccess: false, user: { ...testUser, collection: "users" } }

  const layout = (data: Record<string, unknown>) =>
    payload.create({ collection: "layouts", data: data as never, ...as })
  mainId = (await layout({ name: "Main" })).id
  listingsId = (await layout({ name: "Listings", paths: [{ path: "/stays" }] }))
    .id
  await layout({ name: "Spare" })

  const page = (title: string, path: string, extra = {}) =>
    payload.create({
      collection: "pages",
      data: { title, path, _status: "published", ...extra },
      ...as,
    })
  await page("Cabin", "/stays/cabin")
  await page("Pinned", "/pinned", {
    layout: { mode: "specific", layout: listingsId },
  })
  await page("Bare", "/bare", { layout: { mode: "none" } })
  await page("Plain", "/plain")
})

afterAll(() => t?.teardown())

describe("loadLayoutRows", () => {
  it("lists every Layout by name with paths, default flag and usage", async () => {
    const rows = await loadLayoutRows(payload, as)
    expect(rows.map((r) => r.name)).toEqual(["Listings", "Main", "Spare"])
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]))
    expect(byName.Listings).toMatchObject({
      id: listingsId,
      paths: ["/stays"],
      isDefault: false,
      usedByPages: 2,
    })
    expect(byName.Main).toMatchObject({
      id: mainId,
      paths: [],
      isDefault: true,
      usedByPages: 1,
    })
    expect(byName.Spare).toMatchObject({ isDefault: false, usedByPages: 0 })
  })

  it("names the Pages that pick a Layout, for the Delete confirmation", async () => {
    const rows = await loadLayoutRows(payload, as)
    const listings = rows.find((r) => r.name === "Listings")
    expect(listings?.dependents.map((d) => `${d.kind}: ${d.name}`)).toEqual([
      "Page: Pinned",
    ])
    expect(rows.find((r) => r.name === "Spare")?.dependents).toEqual([])
  })

  it("names every Page a Layout serves, by path or by pick, for the Delete confirmation", async () => {
    const rows = await loadLayoutRows(payload, as)
    const listings = rows.find((r) => r.name === "Listings")
    expect(listings?.pages.map((d) => `${d.kind}: ${d.name}`).sort()).toEqual([
      "Page: Cabin",
      "Page: Pinned",
    ])
    expect(
      listings?.pages.every((d) => d.href?.startsWith("/admin/pages/"))
    ).toBe(true)
    expect(rows.find((r) => r.name === "Spare")?.pages).toEqual([])
    // A Layout's page list always matches the count shown beside it.
    for (const row of rows) expect(row.pages).toHaveLength(row.usedByPages)
  })
})

describe("loadPageRows Layout column", () => {
  it("shows the Layout each Page resolves to", async () => {
    const rows = await loadPageRows(payload, as)
    const layout = Object.fromEntries(rows.map((r) => [r.path, r.layout]))
    expect(layout).toEqual({
      "/stays/cabin": "Listings, via /stays",
      "/pinned": "Listings",
      "/bare": "No Layout",
      "/plain": "Main (default)",
    })
  })

  it("still resolves when the list is searched", async () => {
    const rows = await loadPageRows(payload, as, { q: "cabin" })
    expect(rows.map((r) => r.layout)).toEqual(["Listings, via /stays"])
  })
})

describe("loadDashboard", () => {
  it("offers Layouts in Continue editing beside Pages, newest first", async () => {
    const d = await loadDashboard(payload, as)
    // The Layouts were saved before the Pages: the four Pages, then the
    // newest Layout; the other two Layouts are past the limit of 5.
    expect(d.continueEditing.map((i) => `${i.kind}: ${i.title}`)).toEqual([
      "page: Plain",
      "page: Bare",
      "page: Pinned",
      "page: Cabin",
      "layout: Spare",
    ])
    const spare = d.continueEditing[4]!
    expect(spare.href).toBe(`/admin/layouts/${spare.id}`)
    expect(d.pageCount).toBe(4)
  })
})
