import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { truncateTables } from "../test/truncateTables"
import { defaultLayoutData, ensureDefaultLayout } from "./defaultLayout"

let t: TestPayload
let payload: Payload

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(payload, "layouts", "_layouts_v")
})

const allLayouts = async () =>
  (await payload.find({ collection: "layouts", depth: 0, pagination: false }))
    .docs

describe("defaultLayoutData", () => {
  it("is the default, for every path, named for what it is", () => {
    const data = defaultLayoutData()
    expect(data.isDefault).toBe(true)
    expect(data.paths).toEqual([])
    expect(data.name.trim().length).toBeGreaterThan(0)
  })

  it("reproduces the old SiteFrame: Logo and phone up top, address, social and a Legal bar below", () => {
    const { header, footer } = defaultLayoutData()
    expect(header.map((block) => block.blockType)).toEqual([
      "logo",
      "headerActions",
    ])
    expect(header[1]).toMatchObject({ showPhone: true })

    expect(footer.map((block) => block.blockType)).toEqual([
      "footerColumns",
      "legalBar",
    ])
    const columns = footer[0]
    expect(columns?.blockType === "footerColumns" && columns.columns).toEqual([
      expect.objectContaining({ content: "address" }),
      expect.objectContaining({ content: "social" }),
    ])
    const legal = footer[1]
    expect(legal?.blockType === "legalBar" && legal.text).toContain("{name}")
  })

  it("is a fresh copy each time", () => {
    expect(defaultLayoutData()).not.toBe(defaultLayoutData())
    expect(defaultLayoutData()).toEqual(defaultLayoutData())
  })
})

describe("ensureDefaultLayout", () => {
  it("creates the default Layout on a Site that has none", async () => {
    expect(await ensureDefaultLayout(payload)).toBe("created")

    const layouts = await allLayouts()
    expect(layouts).toHaveLength(1)
    expect(layouts[0]).toMatchObject({ isDefault: true })
    expect(layouts[0]?.header?.map((b) => b.blockType)).toEqual([
      "logo",
      "headerActions",
    ])
    expect(layouts[0]?.footer?.map((b) => b.blockType)).toEqual([
      "footerColumns",
      "legalBar",
    ])
  })

  it("is idempotent: running it again changes nothing", async () => {
    await ensureDefaultLayout(payload)
    const [first] = await allLayouts()

    expect(await ensureDefaultLayout(payload)).toBe("exists")
    expect(await ensureDefaultLayout(payload)).toBe("exists")

    const layouts = await allLayouts()
    expect(layouts).toHaveLength(1)
    expect(layouts[0]?.id).toBe(first?.id)
    expect(layouts.filter((l) => l.isDefault)).toHaveLength(1)
  })

  it("leaves a Site that already has Layouts alone, whichever is the default", async () => {
    await payload.create({
      collection: "layouts",
      data: { name: "Mine", isDefault: true },
    })
    await payload.create({
      collection: "layouts",
      data: { name: "Other", paths: [{ path: "/stays" }] },
    })

    expect(await ensureDefaultLayout(payload)).toBe("exists")

    const layouts = await allLayouts()
    expect(layouts.map((l) => l.name).sort()).toEqual(["Mine", "Other"])
    expect(layouts.filter((l) => l.isDefault).map((l) => l.name)).toEqual([
      "Mine",
    ])
  })

  it("does not bring the default back after users edit it", async () => {
    await ensureDefaultLayout(payload)
    const [layout] = await allLayouts()
    await payload.update({
      collection: "layouts",
      id: layout!.id,
      data: { header: [], footer: [] },
    })
    await ensureDefaultLayout(payload)
    const [after] = await allLayouts()
    expect(after?.header).toEqual([])
  })
})

describe("before the Layouts table exists", () => {
  it("does nothing, so `payload migrate` and a first start never fail on it", async () => {
    // push: false leaves the database empty: there is no layouts table.
    const empty = await getTestPayload({ push: false })
    try {
      expect(await ensureDefaultLayout(empty.payload)).toBe("no-table")
    } finally {
      await empty.teardown()
    }
  })
})

describe("Payload's onInit", () => {
  it("creates the default Layout when the Site starts, once", async () => {
    const started = await getTestPayload({ seedDefaultLayout: true })
    try {
      const { docs } = await started.payload.find({
        collection: "layouts",
        depth: 0,
        pagination: false,
      })
      expect(docs).toHaveLength(1)
      expect(docs[0]?.isDefault).toBe(true)
    } finally {
      await started.teardown()
    }
  })

  it("starts without failing when the tables are not there yet", async () => {
    const empty = await getTestPayload({ push: false, seedDefaultLayout: true })
    await empty.teardown()
  })
})
