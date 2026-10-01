import type { Payload } from "payload"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { truncateTables } from "../../test/truncateTables"
import { CLASSIC, HARBOUR } from "../../theme"
import { listThemeHistory, readLiveTheme, saveTheme } from "../../theme/record"
import {
  loadThemeScreen,
  NO_CHANGES_MESSAGE,
  restoreThemeAs,
  saveThemeAs,
  substituteFamily,
} from "./themeScreen"

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
  await truncateTables(payload, "theme", "_theme_v")
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
    expect(screen.history[1]?.savedAt).toMatch(/^\d{4}-\d\d-\d\dT/)
  })
})

describe("restoreThemeAs", () => {
  it("puts an old version live again and says so", async () => {
    const [first] = await twoVersions()
    const result = await restoreThemeAs(payload, access(), first!)
    expect(result.ok).toBe(true)
    expect(result.message).toBe(
      "Restored that version. It is live on your Site."
    )
    expect((await readLiveTheme(payload)).inputs).toEqual(CLASSIC.inputs)
    // The history only grows: the restore is a third version, and is live.
    const screen = await loadThemeScreen(payload, access())
    expect(screen.history).toHaveLength(3)
    expect(screen.history[0]?.isLive).toBe(true)
    expect(screen.history[0]?.summary).toMatch(
      /^Restored the version from .* UTC: /
    )
  })

  it("adds no version, and says so, when the version already looks like the live one", async () => {
    await saveTheme(payload, { user: ada, inputs: CLASSIC.inputs })
    await saveTheme(payload, { user: ada, inputs: HARBOUR.inputs })
    await saveTheme(payload, { user: ada, inputs: CLASSIC.inputs })
    const history = await listThemeHistory(payload, { user: ada })
    const oldest = history.at(-1)!
    expect(oldest.isLive).toBe(false)

    const result = await restoreThemeAs(payload, access(), oldest.id)

    expect(result).toEqual({
      ok: true,
      message: "Your Site already looks like that version. Nothing to restore.",
    })
    expect(
      await listThemeHistory(payload, { user: ada }).then((h) => h.length)
    ).toBe(3)
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

describe("saveThemeAs", () => {
  it("saves the Theme and says it is live", async () => {
    const result = await saveThemeAs(payload, access(), HARBOUR.inputs)
    expect(result).toEqual({
      ok: true,
      message: "Theme saved. It is live on your Site.",
    })
    expect((await readLiveTheme(payload)).inputs).toEqual(HARBOUR.inputs)
  })

  it("says there is nothing to save, and makes no version, when nothing changed", async () => {
    await saveThemeAs(payload, access(), HARBOUR.inputs)
    const result = await saveThemeAs(payload, access(), HARBOUR.inputs)
    expect(result).toEqual({ ok: true, message: "No changes to save" })
    expect(NO_CHANGES_MESSAGE).toBe("No changes to save")
    expect(
      await listThemeHistory(payload, { user: ada }).then((h) => h.length)
    ).toBe(1)
  })

  it("shows the field errors when a value is refused", async () => {
    const result = await saveThemeAs(payload, access(), {
      ...HARBOUR.inputs,
      primary: "teal",
    })
    expect(result.ok).toBe(false)
    expect(result.fieldErrors).toHaveProperty("primary")
  })
})

describe("substituteFamily", () => {
  it("is the Classic font of the slot a restore replaces", () => {
    expect(substituteFamily("Heading font")).toBe("Newsreader")
    expect(substituteFamily("Body font")).toBe("Public Sans")
  })
})
