import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { truncateTables } from "../test/truncateTables"
import { loadLayoutUsage, summarizeLayoutUsage } from "./usage"

const layouts = [
  { id: 1, name: "Main", paths: [], isDefault: true },
  { id: 2, name: "Listings", paths: ["/stays", "/rentals"], isDefault: false },
  { id: 3, name: "Spare", paths: [], isDefault: false },
]

describe("summarizeLayoutUsage", () => {
  it("counts each Page once, for the Layout it resolves to", () => {
    const { usedBy } = summarizeLayoutUsage(
      [
        { id: 10, path: "/stays/cabin" },
        { id: 11, path: "/rentals" },
        { id: 12, path: "/about" },
        { id: 13, path: "/", layout: { mode: "specific", layout: 2 } },
        { id: 14, path: "/bare", layout: { mode: "none" } },
      ],
      layouts
    )
    expect(usedBy.get(2)).toBe(3)
    expect(usedBy.get(1)).toBe(1)
    expect(usedBy.get(3)).toBeUndefined()
  })

  it("collects the Pages each Layout serves, with their titles", () => {
    const { pagesBy } = summarizeLayoutUsage(
      [
        { id: 10, title: "Cabin", path: "/stays/cabin" },
        { id: 11, title: "Rentals", path: "/rentals" },
        { id: 12, title: "About", path: "/about" },
        { id: 14, title: "Bare", path: "/bare", layout: { mode: "none" } },
      ],
      layouts
    )
    expect(pagesBy.get(2)).toEqual([
      { id: 10, title: "Cabin" },
      { id: 11, title: "Rentals" },
    ])
    expect(pagesBy.get(1)).toEqual([{ id: 12, title: "About" }])
    expect(pagesBy.get(3)).toBeUndefined()
  })

  it("labels each Page the way the Pages list shows it", () => {
    const { labels } = summarizeLayoutUsage(
      [
        { id: 10, path: "/stays/cabin" },
        { id: 12, path: "/about", layout: { mode: "route" } },
        { id: 13, path: "/", layout: { mode: "specific", layout: 2 } },
        { id: 14, path: "/bare", layout: { mode: "none" } },
      ],
      layouts
    )
    expect(labels.get(10)).toBe("Listings, via /stays")
    expect(labels.get(12)).toBe("Main (default)")
    expect(labels.get(13)).toBe("Listings")
    expect(labels.get(14)).toBe("No Layout")
  })

  it("reads a picked Layout that arrived populated", () => {
    const { usedBy } = summarizeLayoutUsage(
      [{ id: 1, path: "/", layout: { mode: "specific", layout: layouts[2]! } }],
      layouts
    )
    expect(usedBy.get(3)).toBe(1)
  })

  it("falls back to the path when the picked Layout is gone", () => {
    const { labels } = summarizeLayoutUsage(
      [{ id: 1, path: "/stays", layout: { mode: "specific", layout: 99 } }],
      layouts
    )
    expect(labels.get(1)).toBe("Listings, via /stays")
  })

  it("says No Layout for every Page when there are no Layouts", () => {
    const { labels, usedBy } = summarizeLayoutUsage([{ id: 1, path: "/" }], [])
    expect(labels.get(1)).toBe("No Layout")
    expect(usedBy.size).toBe(0)
  })
})

describe("loadLayoutUsage", () => {
  let t: TestPayload
  let payload: Payload
  let as: { overrideAccess: false; user: User & { collection: "users" } }

  beforeAll(async () => {
    t = await getTestPayload()
    payload = t.payload
    const testUser = await payload.create({
      collection: "users",
      data: { email: "staff@awayday.test", entraOid: "staff" },
    })
    as = { overrideAccess: false, user: { ...testUser, collection: "users" } }
  })
  afterAll(() => t?.teardown())
  beforeEach(async () => {
    await truncateTables(payload, "layouts", "_layouts_v", "pages", "_pages_v")
  })

  const page = (
    title: string,
    path: string,
    extra: Record<string, unknown> = {}
  ) =>
    payload.create({
      collection: "pages",
      data: { title, path, _status: "published", ...extra },
      ...as,
    })

  it("counts Pages per Layout and labels every Page", async () => {
    const main = await payload.create({
      collection: "layouts",
      data: { name: "Main" },
      ...as,
    })
    const listings = await payload.create({
      collection: "layouts",
      data: { name: "Listings", paths: [{ path: "/stays" }] },
      ...as,
    })
    await payload.create({
      collection: "layouts",
      data: { name: "Spare" },
      ...as,
    })
    const cabin = await page("Cabin", "/stays/cabin")
    const pinned = await page("Pinned", "/pinned", {
      layout: { mode: "specific", layout: listings.id },
    })
    const bare = await page("Bare", "/bare", { layout: { mode: "none" } })
    const plain = await page("Plain", "/plain")

    const usage = await loadLayoutUsage(payload, as)
    expect(usage.layouts.map((l) => l.name)).toEqual([
      "Listings",
      "Main",
      "Spare",
    ])
    expect(usage.usedBy.get(listings.id)).toBe(2)
    expect(usage.usedBy.get(main.id)).toBe(1)
    expect(usage.labels.get(cabin.id)).toBe("Listings, via /stays")
    expect(usage.labels.get(pinned.id)).toBe("Listings")
    expect(usage.labels.get(bare.id)).toBe("No Layout")
    expect(usage.labels.get(plain.id)).toBe("Main (default)")
  })

  it("follows a Page's latest version, the Draft, not the published copy", async () => {
    const main = await payload.create({
      collection: "layouts",
      data: { name: "Main" },
      ...as,
    })
    const other = await payload.create({
      collection: "layouts",
      data: { name: "Other" },
      ...as,
    })
    const p = await page("Home", "/")
    await payload.update({
      collection: "pages",
      id: p.id,
      data: { layout: { mode: "specific", layout: other.id } },
      draft: true,
      ...as,
    })
    const usage = await loadLayoutUsage(payload, as)
    expect(usage.usedBy.get(other.id)).toBe(1)
    expect(usage.usedBy.get(main.id)).toBeUndefined()
  })
})
