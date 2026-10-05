import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { truncateTables } from "../test/truncateTables"
import { duplicateLayout, makeLayoutFromPage } from "./duplicate"
import { listLayoutHistory } from "./record"

let t: TestPayload
let payload: Payload
let testUser: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  testUser = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", registryUserId: 368570 },
  })
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(payload, "layouts", "_layouts_v", "pages", "_pages_v")
})

const user = () => ({ ...testUser, collection: "users" as const })
const asUser = () => ({ overrideAccess: false, user: user() }) as const

const makeLayout = (name: string, extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: "layouts",
    data: { name, ...extra },
    ...asUser(),
  })

const names = async () =>
  (
    await payload.find({
      collection: "layouts",
      pagination: false,
      sort: "id",
      ...asUser(),
    })
  ).docs.map((doc) => doc.name)

describe("duplicateLayout", () => {
  it("copies the Header and Footer under '<name> (copy)', never the default, with no paths", async () => {
    const main = await makeLayout("Main", {
      header: [{ blockType: "utilityStrip", text: "Summer sale" }],
      footer: [{ blockType: "legalBar", text: "© Awayday" }],
      paths: [{ path: "/stays" }],
    })
    expect(main.isDefault).toBe(true)

    const copy = await duplicateLayout(payload, { user: user(), id: main.id })
    expect(copy.id).not.toBe(main.id)
    expect(copy.name).toBe("Main (copy)")
    expect(copy.isDefault).toBe(false)
    expect(copy.paths ?? []).toEqual([])
    expect(copy.header).toMatchObject([{ text: "Summer sale" }])
    expect(copy.footer).toMatchObject([{ text: "© Awayday" }])
    // The copy's rows are its own.
    expect(copy.header?.[0]?.id).not.toBe(main.header?.[0]?.id)

    // The original keeps everything, including its routes.
    const original = await payload.findByID({
      collection: "layouts",
      id: main.id,
      ...asUser(),
    })
    expect(original.isDefault).toBe(true)
    expect(original.paths?.map((p) => p.path)).toEqual(["/stays"])
  })

  it("starts its own history", async () => {
    const main = await makeLayout("Main")
    const copy = await duplicateLayout(payload, { user: user(), id: main.id })
    const history = await listLayoutHistory(payload, {
      user: user(),
      id: copy.id,
    })
    expect(history).toHaveLength(1)
    expect(history[0]!.summary).toBe("Created the Layout")
  })

  it("numbers the name when '(copy)' is taken", async () => {
    const main = await makeLayout("Main")
    await duplicateLayout(payload, { user: user(), id: main.id })
    await duplicateLayout(payload, { user: user(), id: main.id })
    await duplicateLayout(payload, { user: user(), id: main.id })
    expect(await names()).toEqual([
      "Main",
      "Main (copy)",
      "Main (copy 2)",
      "Main (copy 3)",
    ])
  })

  it("uses the name it is given, trimmed", async () => {
    const main = await makeLayout("Main")
    const copy = await duplicateLayout(payload, {
      user: user(),
      id: main.id,
      name: "  Holiday  ",
    })
    expect(copy.name).toBe("Holiday")
  })

  it("refuses a given name another Layout has, or an empty one", async () => {
    const main = await makeLayout("Main")
    await expect(
      duplicateLayout(payload, { user: user(), id: main.id, name: "main" })
    ).rejects.toThrow(/already/)
    await expect(
      duplicateLayout(payload, { user: user(), id: main.id, name: "   " })
    ).rejects.toThrow(/name/i)
    expect(await names()).toEqual(["Main"])
  })
})

describe("makeLayoutFromPage", () => {
  const makePage = (title: string, path: string) =>
    payload.create({
      collection: "pages",
      data: { title, path, _status: "published" },
      ...asUser(),
    })

  it("copies the Layout and switches the Page's Draft to the copy", async () => {
    const main = await makeLayout("Main")
    const page = await makePage("Home", "/")

    const copy = await makeLayoutFromPage(payload, {
      user: user(),
      pageId: page.id,
      layoutId: main.id,
      name: "Home only",
    })
    expect(copy.name).toBe("Home only")
    expect(copy.isDefault).toBe(false)

    const draft = await payload.findByID({
      collection: "pages",
      id: page.id,
      draft: true,
      depth: 0,
      ...asUser(),
    })
    expect(draft.layout).toMatchObject({ mode: "specific", layout: copy.id })

    // Publishing is a separate step: the Published Page is as it was.
    const published = await payload.findByID({
      collection: "pages",
      id: page.id,
      draft: false,
      depth: 0,
      ...asUser(),
    })
    expect(published.layout?.mode).toBe("route")
  })

  it("leaves no stray copy when the Page can't be switched", async () => {
    const main = await makeLayout("Main")
    await expect(
      makeLayoutFromPage(payload, {
        user: user(),
        pageId: 999999,
        layoutId: main.id,
        name: "Orphan",
      })
    ).rejects.toThrow()
    expect(await names()).toEqual(["Main"])
  })
})
