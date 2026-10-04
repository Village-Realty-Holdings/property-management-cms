import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { HARBOUR, MEADOW } from "../theme/presets"
import { listThemeHistory, readLiveTheme } from "../theme/record"
import {
  applyThemeAs,
  deleteSavedThemeAs,
  exportThemeAs,
  importThemeAs,
  loadThemes,
  renameSavedThemeAs,
  saveCurrentThemeAs,
  type ThemeFile,
} from "./savedThemes"

let t: TestPayload
let asUser: { overrideAccess: false; user: User & { collection: "users" } }

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
})

afterAll(async () => {
  await t?.teardown()
})

const cards = () => loadThemes(t.payload, asUser)
const card = async (name: string) =>
  (await cards()).find((entry) => entry.name === name)

describe("the Themes list", () => {
  it("starts with the presets, Classic live, before a Theme is saved", async () => {
    const all = await cards()
    expect(all.map((entry) => [entry.name, entry.kind])).toEqual([
      ["Harbour", "General"],
      ["Terracotta", "General"],
      ["Classic", "General"],
      ["Meadow", "General"],
      ["Warren Beach", "Brand"],
      ["Avada", "Brand"],
      ["Beachside", "Brand"],
    ])
    expect(
      all.filter((entry) => entry.live).map((entry) => entry.name)
    ).toEqual(["Classic"])
    expect(await card("Harbour")).toMatchObject({
      id: "preset:harbour",
      blurb: HARBOUR.blurb,
      fonts: "Bricolage Grotesque and Instrument Sans",
      swatches: [
        { name: "Primary", hex: "#2d4447" },
        { name: "Accent", hex: "#fcd900" },
        { name: "Text", hex: "#1a2a2c" },
      ],
    })
  })
})

describe("applying a Theme", () => {
  it("saves the Site's Theme, live at once, and the history says which", async () => {
    const result = await applyThemeAs(t.payload, asUser, "preset:harbour")
    expect(result).toEqual({
      ok: true,
      message: "“Harbour” is now live on your Site.",
    })
    expect((await readLiveTheme(t.payload)).inputs).toEqual(HARBOUR.inputs)
    expect((await card("Harbour"))?.live).toBe(true)
    expect((await card("Classic"))?.live).toBe(false)
    const [newest] = await listThemeHistory(t.payload, { user: asUser.user })
    expect(newest?.summary).toBe("Applied the Theme “Harbour”")
  })

  it("says so when it is the Theme already", async () => {
    expect(await applyThemeAs(t.payload, asUser, "preset:harbour")).toEqual({
      ok: true,
      message: "“Harbour” is already your Theme.",
    })
  })

  it("refuses one that isn't in the list", async () => {
    for (const id of ["preset:nope", "saved:999", "", null]) {
      expect((await applyThemeAs(t.payload, asUser, id)).ok).toBe(false)
    }
  })
})

describe("a Saved Theme", () => {
  it("keeps the Site's Theme under a name, listed first and marked live", async () => {
    expect(await saveCurrentThemeAs(t.payload, asUser, "  Summer  ")).toEqual({
      ok: true,
      message: "Saved as “Summer”.",
    })
    const all = await cards()
    expect(all[0]).toMatchObject({ name: "Summer", kind: "Saved", live: true })
  })

  it("needs a name of its own", async () => {
    const save = (name: unknown) => saveCurrentThemeAs(t.payload, asUser, name)
    expect(await save("  ")).toEqual({
      ok: false,
      message: "Give the Theme a name.",
    })
    expect(await save("x".repeat(61))).toMatchObject({ ok: false })
    expect(await save("harbour")).toEqual({
      ok: false,
      message: "“harbour” is a built-in Theme. Choose another name.",
    })
    expect(await save("Summer")).toEqual({
      ok: false,
      message: "Another Saved Theme is called “Summer”.",
    })
  })

  it("is applied again after the Theme has moved on", async () => {
    await applyThemeAs(t.payload, asUser, "preset:meadow")
    const summer = await card("Summer")
    expect(summer?.live).toBe(false)
    expect(await applyThemeAs(t.payload, asUser, summer!.id)).toMatchObject({
      ok: true,
      message: "“Summer” is now live on your Site.",
    })
    expect((await readLiveTheme(t.payload)).inputs).toEqual(HARBOUR.inputs)
  })

  it("is renamed and deleted, which leaves the Site's Theme alone", async () => {
    const summer = await card("Summer")
    expect(
      await renameSavedThemeAs(t.payload, asUser, summer!.id, "Autumn")
    ).toEqual({ ok: true, message: "Renamed to “Autumn”." })
    expect(await card("Summer")).toBeUndefined()
    expect(await deleteSavedThemeAs(t.payload, asUser, summer!.id)).toEqual({
      ok: true,
      message: "Deleted the Saved Theme “Autumn”.",
    })
    expect(await card("Autumn")).toBeUndefined()
    expect((await readLiveTheme(t.payload)).inputs).toEqual(HARBOUR.inputs)
    expect((await deleteSavedThemeAs(t.payload, asUser, summer!.id)).ok).toBe(
      false
    )
    expect(
      (await deleteSavedThemeAs(t.payload, asUser, "preset:harbour")).ok
    ).toBe(false)
  })

  it("is not listed for a visitor", async () => {
    await saveCurrentThemeAs(t.payload, asUser, "Private")
    const seen = await t.payload
      .find({
        collection: "saved-themes",
        overrideAccess: false,
        user: null,
      })
      .catch(() => ({ docs: [] }))
    expect(seen.docs).toEqual([])
  })
})

describe("exporting and importing", () => {
  const exported = async (id: string) => {
    const result = await exportThemeAs(t.payload, asUser, id)
    if (!result.ok) throw new Error(result.message)
    return result
  }

  it("writes a Theme as a file with its fonts by family name", async () => {
    const result = await exported("preset:meadow")
    expect(result.filename).toBe("meadow.theme.json")
    const file = JSON.parse(result.json) as ThemeFile
    expect(file).toEqual({
      awaydayTheme: 1,
      name: "Meadow",
      inputs: {
        ...MEADOW.inputs,
        headingFont: MEADOW.inputs.headingFont.replace("built-in:", ""),
        bodyFont: MEADOW.inputs.bodyFont.replace("built-in:", ""),
      },
    })
  })

  it("imports the file as a Saved Theme under a free name, applying nothing", async () => {
    const before = (await readLiveTheme(t.payload)).inputs
    const { json } = await exported("preset:meadow")
    expect(await importThemeAs(t.payload, asUser, json)).toEqual({
      ok: true,
      message: "Imported “Meadow 2”. Apply it to use it.",
    })
    expect((await readLiveTheme(t.payload)).inputs).toEqual(before)
    const imported = await card("Meadow 2")
    expect(imported).toMatchObject({ kind: "Saved", live: false })
    await applyThemeAs(t.payload, asUser, imported!.id)
    expect((await readLiveTheme(t.payload)).inputs).toEqual(MEADOW.inputs)
  })

  it("refuses a file that isn't a Theme, and says why", async () => {
    const load = (text: unknown) => importThemeAs(t.payload, asUser, text)
    expect((await load("not json")).message).toBe(
      "That file isn't a Theme: it isn't JSON."
    )
    expect((await load('{"name":"x"}')).message).toContain("isn't a Theme")
    expect((await load("x".repeat(20_001))).ok).toBe(false)
    const { json } = await exported("preset:meadow")
    const file = JSON.parse(json) as ThemeFile
    const wrong = await load(
      JSON.stringify({
        ...file,
        inputs: { ...file.inputs, primary: "blue", spacing: "huge", extra: 1 },
      })
    )
    expect(wrong.ok).toBe(false)
    expect(
      (await load(JSON.stringify({ ...file, script: "x" }))).message
    ).toContain("“script” is not part of a Theme file.")
    expect(wrong.message).toContain("“extra” is not a Theme setting.")
    expect(wrong.message).toContain("Primary colour must be a hex colour")
    expect(wrong.message).toContain("Spacing must be one of:")
  })

  it("refuses a font this Site doesn't have, naming it", async () => {
    const { json } = await exported("preset:meadow")
    const file = JSON.parse(json) as ThemeFile
    const result = await importThemeAs(
      t.payload,
      asUser,
      JSON.stringify({
        ...file,
        inputs: { ...file.inputs, headingFont: "Comic Neue" },
      })
    )
    expect(result).toEqual({
      ok: false,
      message:
        "This Site doesn't have the font “Comic Neue”. Add it under Settings, Assets, then import again.",
    })
  })
})
