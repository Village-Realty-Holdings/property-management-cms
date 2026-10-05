import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { truncateTables } from "../test/truncateTables"
import { listLayoutHistory, restoreLayoutVersion, saveLayout } from "./record"

let t: TestPayload
let payload: Payload
let testUser: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  testUser = await payload.create({
    collection: "users",
    data: {
      email: "staff@awayday.test",
      name: "Sam Taylor",
      registryUserId: 368570,
    },
  })
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(payload, "layouts", "_layouts_v")
})

const user = () => ({ ...testUser, collection: "users" as const })
const strip = (text: string) => [{ blockType: "utilityStrip" as const, text }]
const legal = (text: string) => [{ blockType: "legalBar" as const, text }]

/** The text of the first Block: what the tests change between saves. */
const stripText = (blocks: unknown) =>
  (blocks as { text?: string }[] | null | undefined)?.[0]?.text

const readLive = (id: number) =>
  payload.findByID({
    collection: "layouts",
    id,
    depth: 0,
    overrideAccess: false,
    user: null,
  })

describe("saveLayout", () => {
  it("creates a Layout that is live at once, with no Draft", async () => {
    const layout = await saveLayout(payload, {
      user: user(),
      data: { name: "Main", header: strip("Summer sale") },
    })
    expect(layout.name).toBe("Main")
    expect(layout).not.toHaveProperty("_status")
    // A visitor reads it without anything being published.
    const live = await readLive(layout.id)
    expect(stripText(live.header)).toBe("Summer sale")
  })

  it("updates a Layout and the change is live on the same call", async () => {
    const { id } = await saveLayout(payload, {
      user: user(),
      data: { name: "Main", header: strip("Summer sale") },
    })
    await saveLayout(payload, {
      user: user(),
      id,
      data: { header: strip("Winter sale") },
    })
    expect(stripText((await readLive(id)).header)).toBe("Winter sale")
  })

  it("replaces the automatic summary with a note", async () => {
    const { id } = await saveLayout(payload, {
      user: user(),
      data: { name: "Main" },
    })
    await saveLayout(payload, {
      user: user(),
      id,
      data: { header: strip("Sale") },
      note: "Black Friday",
    })
    const [newest] = await listLayoutHistory(payload, { user: user(), id })
    expect(newest!.summary).toBe("Black Friday")
  })

  it("refuses a write without a User", async () => {
    await expect(
      saveLayout(payload, { user: null as never, data: { name: "Main" } })
    ).rejects.toThrow()
  })
})

describe("listLayoutHistory", () => {
  it("lists every save newest first with time, author and summary", async () => {
    const { id } = await saveLayout(payload, {
      user: user(),
      data: { name: "Main", header: strip("Summer sale") },
    })
    await saveLayout(payload, {
      user: user(),
      id,
      data: { header: strip("Winter sale") },
    })

    const history = await listLayoutHistory(payload, { user: user(), id })
    expect(history).toHaveLength(2)
    expect(history.map((v) => stripText(v.header))).toEqual([
      "Winter sale",
      "Summer sale",
    ])
    expect(history.map((v) => v.summary)).toEqual([
      "Header changed",
      "Created the Layout",
    ])
    expect(history.map((v) => v.isLive)).toEqual([true, false])
    expect(history[0]!.author).toMatchObject({
      id: testUser.id,
      name: "Sam Taylor",
    })
    for (const version of history) {
      expect(Number.isNaN(Date.parse(version.savedAt))).toBe(false)
    }
  })

  it("lists only the versions of that Layout", async () => {
    const one = await saveLayout(payload, {
      user: user(),
      data: { name: "One" },
    })
    await saveLayout(payload, { user: user(), data: { name: "Two" } })
    const history = await listLayoutHistory(payload, {
      user: user(),
      id: one.id,
    })
    expect(history).toHaveLength(1)
  })
})

describe("restoreLayoutVersion", () => {
  it("saves the old version as a new one, so the history only grows", async () => {
    const { id } = await saveLayout(payload, {
      user: user(),
      data: {
        name: "Main",
        header: strip("Summer sale"),
        footer: legal("Summer footer"),
        paths: [{ path: "/stays" }],
      },
    })
    await saveLayout(payload, {
      user: user(),
      id,
      data: {
        header: strip("Winter sale"),
        footer: legal("Winter footer"),
        paths: [{ path: "/stays" }, { path: "/rooms" }],
      },
    })
    const before = await listLayoutHistory(payload, { user: user(), id })
    const summer = before.find((v) => stripText(v.header) === "Summer sale")!

    const restored = await restoreLayoutVersion(payload, {
      user: user(),
      id,
      versionId: summer.id,
    })
    expect(stripText(restored.header)).toBe("Summer sale")

    const live = await readLive(id)
    expect(stripText(live.header)).toBe("Summer sale")
    expect(stripText(live.footer)).toBe("Summer footer")
    expect(live.paths?.map((p) => p.path)).toEqual(["/stays"])

    const after = await listLayoutHistory(payload, { user: user(), id })
    expect(after).toHaveLength(before.length + 1)
    expect(after[0]!.isLive).toBe(true)
    expect(stripText(after[0]!.header)).toBe("Summer sale")
    expect(after[0]!.summary).toMatch(/^Restored the version from /)
    // The old versions are all still there.
    expect(after.slice(1).map((v) => v.id)).toEqual(before.map((v) => v.id))
  })

  it("keeps the current default flag, whatever the old version had", async () => {
    const first = await saveLayout(payload, {
      user: user(),
      data: { name: "First" },
    })
    const second = await saveLayout(payload, {
      user: user(),
      data: { name: "Second" },
    })
    await saveLayout(payload, {
      user: user(),
      id: second.id,
      data: { isDefault: true },
    })
    // First's oldest version was the default; it is not any more.
    const oldest = (
      await listLayoutHistory(payload, { user: user(), id: first.id })
    ).at(-1)!
    await restoreLayoutVersion(payload, {
      user: user(),
      id: first.id,
      versionId: oldest.id,
    })
    expect((await readLive(first.id)).isDefault).toBe(false)
    expect((await readLive(second.id)).isDefault).toBe(true)
  })

  it("refuses a version that belongs to another Layout or is gone", async () => {
    const one = await saveLayout(payload, {
      user: user(),
      data: { name: "One" },
    })
    const two = await saveLayout(payload, {
      user: user(),
      data: { name: "Two" },
    })
    const [twoVersion] = await listLayoutHistory(payload, {
      user: user(),
      id: two.id,
    })
    await expect(
      restoreLayoutVersion(payload, {
        user: user(),
        id: one.id,
        versionId: twoVersion!.id,
      })
    ).rejects.toThrow(/no longer exists/)
    await expect(
      restoreLayoutVersion(payload, {
        user: user(),
        id: one.id,
        versionId: 999999,
      })
    ).rejects.toThrow(/no longer exists/)
  })
})
