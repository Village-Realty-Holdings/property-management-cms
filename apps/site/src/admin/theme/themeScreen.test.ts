import type { Payload } from "payload"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { CLASSIC, HARBOUR } from "../../theme"
import { listThemeHistory, readLiveTheme, saveTheme } from "../../theme/record"
import { loadThemeScreen, restoreThemeAs } from "./themeScreen"

// The Theme screen's read and its Restore action, against a real Payload on a
// throwaway database, as a Staff User (apps/site ADR-0002).

let t: TestPayload
let payload: Payload
let ada: User & { collection: "users" }

const access = () => ({ overrideAccess: false as const, user: ada })

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const user = await payload.create({
    collection: "users",
    data: { email: "ada@awayday.test", entraOid: "ada", name: "Ada" },
  })
  ada = { ...user, collection: "users" }
})

afterEach(async () => {
  await payload.db.pool.query('TRUNCATE "theme", "_theme_v" CASCADE')
})

afterAll(async () => {
  await t?.teardown()
})

/** Saves Classic, then Harbour; returns the version ids, oldest first. */
async function twoVersions() {
  await saveTheme(payload, { user: ada, inputs: CLASSIC.inputs })
  await saveTheme(payload, { user: ada, inputs: HARBOUR.inputs })
  const history = await listThemeHistory(payload, { user: ada })
  return history.map((version) => version.id).reverse()
}

describe("loadThemeScreen", () => {
  it("shows the default preset and an empty history before any save", async () => {
    const screen = await loadThemeScreen(payload, access())
    expect(screen.saved).toBe(false)
    expect(screen.summary.savedAt).toBeNull()
    expect(screen.summary.swatches[0]?.hex).toBe(CLASSIC.inputs.primary)
    expect(screen.details.find((d) => d.label === "Heading font")?.value).toBe(
      "Newsreader"
    )
    expect(screen.history).toEqual([])
  })

  it("lists every version newest first, the first one live", async () => {
    await twoVersions()
    const screen = await loadThemeScreen(payload, access())
    expect(screen.saved).toBe(true)
    expect(screen.summary.swatches[0]?.hex).toBe(HARBOUR.inputs.primary)
    expect(screen.history).toHaveLength(2)
    expect(screen.history.map((row) => row.isLive)).toEqual([true, false])
    expect(screen.history[0]).toMatchObject({
      author: "Ada",
      summary: expect.stringContaining("Primary colour"),
    })
    expect(screen.history[1]?.when).toMatch(/UTC$/)
  })
})

describe("restoreThemeAs", () => {
  it("puts an old version live again and says so", async () => {
    const [first] = await twoVersions()
    const result = await restoreThemeAs(payload, access(), first!)
    expect(result.ok).toBe(true)
    expect(result.message).toMatch(/^Restored the version from .* UTC\./)
    expect((await readLiveTheme(payload)).inputs).toEqual(CLASSIC.inputs)
    // The history only grows: the restore is a third version, and is live.
    const screen = await loadThemeScreen(payload, access())
    expect(screen.history).toHaveLength(3)
    expect(screen.history[0]?.isLive).toBe(true)
    expect(screen.history[0]?.summary).toMatch(/^Restored an earlier version/)
  })

  it("refuses the version that is already live", async () => {
    const [, live] = await twoVersions()
    const result = await restoreThemeAs(payload, access(), live!)
    expect(result).toMatchObject({ ok: false })
    expect(result.message).toMatch(/already live/)
    expect(
      await listThemeHistory(payload, { user: ada }).then((h) => h.length)
    ).toBe(2)
  })

  it.each([0, -3, 1.5, Number.NaN])("refuses the id %s", async (id) => {
    await twoVersions()
    expect(await restoreThemeAs(payload, access(), id)).toMatchObject({
      ok: false,
      message: "That version no longer exists.",
    })
  })

  it("refuses a version that does not exist", async () => {
    await twoVersions()
    expect(await restoreThemeAs(payload, access(), 987654)).toMatchObject({
      ok: false,
      message: "That version no longer exists.",
    })
  })
})
