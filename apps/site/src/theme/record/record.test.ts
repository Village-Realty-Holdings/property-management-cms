import type { Payload } from "payload"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { importGoogleFont } from "../../fonts/importGoogleFont"
import type { FetchLike } from "../../fonts/googleFonts"
import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { truncateTables } from "../../test/truncateTables"
import { CLASSIC, HARBOUR, type ThemeInputs } from "../index"
import { formatSavedAt } from "./summary"
import {
  listThemeHistory,
  readLiveTheme,
  restoreThemeVersion,
  saveTheme,
} from "./index"

// Integration tests: a real Payload on a throwaway database. The Theme
// record is live on save (apps/site ADR-0004): every save is a version, and
// restoring saves an old one again as a new version.

const MAGIC = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])
const CSS2 = "https://fonts.googleapis.com/css2"
const face = (weight: number) => `/* latin */
@font-face {
  font-family: 'Roboto Slab';
  font-style: normal;
  font-weight: ${weight};
  src: url(https://fonts.gstatic.com/s/robotoslab/v34/rs-${weight}.woff2) format('woff2');
}
`
/** A fetch standing in for Google, so nothing here reaches the network. */
const googleFetch: FetchLike = async (input) => {
  const url = String(input)
  if (url.startsWith(`${CSS2}?family=Roboto+Slab:wght@`)) {
    const weights = /wght@([\d;]+)/.exec(url)![1]!.split(";").map(Number)
    return new Response(weights.map(face).join(""))
  }
  const file = /rs-(\d+)\.woff2$/.exec(url)
  if (file) return new Response(Buffer.concat([MAGIC, Buffer.from(file[1]!)]))
  return new Response("Not found", { status: 404 })
}

let t: TestPayload
let payload: Payload
let ada: User & { collection: "users" }
let grace: User & { collection: "users" }

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const make = async (name: string) => {
    const user = await payload.create({
      collection: "users",
      data: { email: `${name}@awayday.test`, entraOid: name, name },
    })
    return { ...user, collection: "users" as const }
  }
  ada = await make("Ada")
  grace = await make("Grace")
})

afterEach(async () => {
  vi.restoreAllMocks()
  // The Theme is a singleton: empty it (and its versions) between tests.
  await truncateTables(payload, "theme", "_theme_v")
  await payload.delete({ collection: "fonts", where: { id: { exists: true } } })
  await payload.delete({
    collection: "font-files",
    where: { id: { exists: true } },
  })
})

afterAll(async () => {
  await t?.teardown()
})

const CLASSIC_INPUTS = CLASSIC.inputs
const change = (patch: Partial<ThemeInputs>): ThemeInputs => ({
  ...CLASSIC_INPUTS,
  ...patch,
})

describe("the live Theme", () => {
  it("is the Classic preset until a Theme is saved", async () => {
    const live = await readLiveTheme(payload)
    expect(live.source).toBe("default")
    expect(live.inputs).toEqual(CLASSIC_INPUTS)
    expect(await listThemeHistory(payload, { user: ada })).toEqual([])
  })

  it("is what was saved, at once, with no publish step", async () => {
    const inputs = change({ primary: "#0a7d5a", buttonCorners: "square" })
    await saveTheme(payload, { user: ada, inputs })

    const live = await readLiveTheme(payload)
    expect(live.source).toBe("saved")
    expect(live.inputs).toEqual(inputs)
  })

  it("is readable by a visitor", async () => {
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#0a7d5a" }),
    })
    const global = await payload.findGlobal({
      slug: "theme",
      overrideAccess: false,
      user: null,
    })
    expect(global.primary).toBe("#0a7d5a")
  })

  it("keeps an optional Third colour and a Dark surface unset, or set", async () => {
    await saveTheme(payload, {
      user: ada,
      inputs: change({ third: "#12a4b6", darkSurface: "#101820" }),
    })
    expect((await readLiveTheme(payload)).inputs).toMatchObject({
      third: "#12a4b6",
      darkSurface: "#101820",
    })
    await saveTheme(payload, {
      user: ada,
      inputs: change({ third: null, darkSurface: null }),
    })
    expect((await readLiveTheme(payload)).inputs).toMatchObject({
      third: null,
      darkSurface: null,
    })
  })

  it("stores every colour as #rrggbb", async () => {
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#ABC", text: "#1A2B3C" }),
    })
    expect((await readLiveTheme(payload)).inputs).toMatchObject({
      primary: "#aabbcc",
      text: "#1a2b3c",
    })
  })

  it.each([
    ["a colour that is not a hex", { primary: "teal" }],
    ["an unknown built-in font", { headingFont: "built-in:Comic Sans" }],
    ["a stored Font that does not exist", { bodyFont: "font:99999" }],
  ])("refuses %s", async (_name, patch) => {
    await expect(
      saveTheme(payload, { user: ada, inputs: change(patch) })
    ).rejects.toThrow()
    expect((await readLiveTheme(payload)).source).toBe("default")
  })

  it("can only be changed by a Staff User", async () => {
    await expect(
      payload.updateGlobal({
        slug: "theme",
        data: { primary: "#0a7d5a" },
        overrideAccess: false,
        user: null,
      })
    ).rejects.toThrow()
  })
})

describe("Theme history", () => {
  it("lists every version, newest first, with the time, the author and what changed", async () => {
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#0a7d5a" }),
    })
    await saveTheme(payload, {
      user: grace,
      inputs: change({ primary: "#0a7d5a", buttonCorners: "square" }),
    })
    await saveTheme(payload, {
      user: ada,
      inputs: change({
        primary: "#7a1fa2",
        buttonCorners: "square",
        headingCase: "uppercase",
      }),
    })

    const history = await listThemeHistory(payload, { user: ada })

    expect(history.map((v) => v.summary)).toEqual([
      "Primary colour, Heading case",
      "Button corners",
      "Primary colour",
    ])
    expect(history.map((v) => v.author?.name)).toEqual(["Ada", "Grace", "Ada"])
    expect(history.map((v) => v.isLive)).toEqual([true, false, false])
    const times = history.map((v) => Date.parse(v.savedAt))
    expect(times.every(Number.isFinite)).toBe(true)
    expect(times).toEqual([...times].sort((a, b) => b - a))
    expect(history[2]!.inputs.primary).toBe("#0a7d5a")
    expect(history[2]!.inputs.buttonCorners).toBe("pill")
  })

  it("says the first save is the Classic preset when nothing else changed", async () => {
    await saveTheme(payload, { user: ada, inputs: CLASSIC_INPUTS })
    const [first] = await listThemeHistory(payload, { user: ada })
    expect(first!.summary).toBe("Started from the Classic preset")
  })

  it("skips a save that changes nothing: no version, and the current Theme comes back", async () => {
    const first = await saveTheme(payload, {
      user: ada,
      inputs: HARBOUR.inputs,
    })
    expect(first.changed).toBe(true)

    const again = await saveTheme(payload, {
      user: grace,
      inputs: HARBOUR.inputs,
    })

    expect(again.changed).toBe(false)
    expect(again.source).toBe("saved")
    expect(again.inputs).toEqual(HARBOUR.inputs)
    expect(again.savedAt).toBe(first.savedAt)
    const history = await listThemeHistory(payload, { user: ada })
    expect(history).toHaveLength(1)
    expect(history.map((v) => v.summary)).not.toContain("No changes")
  })

  it("counts a colour typed differently as no change, and ignores a note on a skipped save", async () => {
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#0a7d5a" }),
    })
    const again = await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#0A7D5A" }),
      note: "Just checking",
    })
    expect(again.changed).toBe(false)
    expect(await listThemeHistory(payload, { user: ada })).toHaveLength(1)
  })

  it("still refuses an invalid value when the rest matches the live Theme", async () => {
    await saveTheme(payload, { user: ada, inputs: CLASSIC_INPUTS })
    await expect(
      saveTheme(payload, { user: ada, inputs: change({ primary: "teal" }) })
    ).rejects.toThrow()
    await expect(
      saveTheme(payload, {
        user: ada,
        inputs: change({ bodyFont: "font:99999" }),
      })
    ).rejects.toThrow()
    expect(await listThemeHistory(payload, { user: ada })).toHaveLength(1)
  })

  it("lets staff replace the automatic summary with a note, and the note is not carried to the next save", async () => {
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#0a7d5a" }),
      note: "  Spring refresh  ",
    })
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#0a7d5a", spacing: "spacious" }),
    })
    const history = await listThemeHistory(payload, { user: ada })
    expect(history.map((v) => v.summary)).toEqual(["Spacing", "Spring refresh"])
  })

  it("names a font by its label and lists a changed font like any control", async () => {
    await saveTheme(payload, { user: ada, inputs: CLASSIC_INPUTS })
    await saveTheme(payload, {
      user: ada,
      inputs: change({ headingFont: "built-in:Bricolage Grotesque" }),
    })
    expect((await listThemeHistory(payload, { user: ada }))[0]!.summary).toBe(
      "Heading font"
    )
  })

  it("is not readable by a visitor", async () => {
    await saveTheme(payload, { user: ada, inputs: CLASSIC_INPUTS })
    await expect(
      payload.findGlobalVersions({
        slug: "theme",
        overrideAccess: false,
        user: null,
      })
    ).rejects.toThrow()
  })
})

describe("restoring a Theme version", () => {
  async function threeVersions() {
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#0a7d5a" }),
    })
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#7a1fa2", cardCorners: "rounded" }),
    })
    await saveTheme(payload, {
      user: ada,
      inputs: change({ primary: "#c2410c", third: "#12a4b6" }),
    })
    return listThemeHistory(payload, { user: ada })
  }

  it("makes the old version live again by saving it as a new version", async () => {
    const before = await threeVersions()
    const oldest = before.at(-1)!

    const restored = await restoreThemeVersion(payload, {
      user: grace,
      versionId: oldest.id,
    })

    const live = await readLiveTheme(payload)
    expect(live.inputs).toEqual(oldest.inputs)
    expect(restored.inputs).toEqual(oldest.inputs)

    const after = await listThemeHistory(payload, { user: grace })
    // Append-only: nothing was removed or rewritten.
    expect(after).toHaveLength(before.length + 1)
    expect(after.slice(1).map((v) => v.id)).toEqual(before.map((v) => v.id))
    expect(after.slice(1).map((v) => v.inputs)).toEqual(
      before.map((v) => v.inputs)
    )
    expect(after[0]!.id).not.toBe(oldest.id)
    expect(after[0]!.isLive).toBe(true)
    expect(after[0]!.author?.name).toBe("Grace")
    expect(after[0]!.summary).toMatch(
      /^Restored the version from .* UTC: Primary colour/
    )
    expect(after[0]!.summary).toContain(formatSavedAt(oldest.savedAt))
    expect(after[0]!.summary).toContain("Primary colour")
    expect(after[0]!.summary).toContain("Third colour")
  })

  it("adds no version when the restored one matches what is live", async () => {
    const before = await threeVersions()
    const result = await restoreThemeVersion(payload, {
      user: ada,
      versionId: before[0]!.id,
    })
    expect(result.changed).toBe(false)
    expect(result.inputs).toEqual(before[0]!.inputs)
    expect(await listThemeHistory(payload, { user: ada })).toHaveLength(
      before.length
    )
  })

  it("reports that a restore changed the Theme", async () => {
    const before = await threeVersions()
    const result = await restoreThemeVersion(payload, {
      user: ada,
      versionId: before.at(-1)!.id,
    })
    expect(result.changed).toBe(true)
  })

  it("refuses a version that does not exist", async () => {
    await threeVersions()
    await expect(
      restoreThemeVersion(payload, { user: ada, versionId: 987654 })
    ).rejects.toThrow(/no longer exists/)
  })
})

describe("Fonts in the Theme", () => {
  const importSlab = () =>
    importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400, 700] },
      { fetch: googleFetch }
    )

  it("accepts a stored Font by key", async () => {
    const font = await importSlab()
    await saveTheme(payload, {
      user: ada,
      inputs: change({ headingFont: `font:${font.id}` }),
    })
    expect((await readLiveTheme(payload)).inputs.headingFont).toBe(
      `font:${font.id}`
    )
  })

  it("locks a Font the live Theme uses as its heading font, naming the Theme", async () => {
    const font = await importSlab()
    await saveTheme(payload, {
      user: ada,
      inputs: change({ headingFont: `font:${font.id}` }),
    })

    const error = await payload
      .delete({
        collection: "fonts",
        id: font.id,
        overrideAccess: false,
        user: ada,
      })
      .catch((e: unknown) => e as Error)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("Roboto Slab can't be deleted")
    expect((error as Error).message).toContain(
      "Used by the Theme (heading font)"
    )
    expect((error as Error).message).not.toContain("body font")
    expect((await payload.count({ collection: "fonts" })).totalDocs).toBe(1)
  })

  it("names both when the Font is the heading and the body font", async () => {
    const font = await importSlab()
    await saveTheme(payload, {
      user: ada,
      inputs: change({
        headingFont: `font:${font.id}`,
        bodyFont: `font:${font.id}`,
      }),
    })
    await expect(
      payload.delete({ collection: "fonts", id: font.id })
    ).rejects.toThrow(
      /Used by the Theme \(heading font\); Used by the Theme \(body font\)/
    )
  })

  it("allows deleting the Font once the live Theme stops using it", async () => {
    const font = await importSlab()
    await saveTheme(payload, {
      user: ada,
      inputs: change({ bodyFont: `font:${font.id}` }),
    })
    await expect(
      payload.delete({ collection: "fonts", id: font.id })
    ).rejects.toThrow(/Used by the Theme \(body font\)/)

    await saveTheme(payload, { user: ada, inputs: CLASSIC_INPUTS })

    await payload.delete({ collection: "fonts", id: font.id })
    expect((await payload.count({ collection: "fonts" })).totalDocs).toBe(0)
  })

  it("does not lock a Font only an old version used, and restoring that version falls back for the missing Font", async () => {
    const font = await importSlab()
    await saveTheme(payload, {
      user: ada,
      inputs: change({ headingFont: `font:${font.id}`, primary: "#0a7d5a" }),
    })
    await saveTheme(payload, { user: ada, inputs: CLASSIC_INPUTS })
    await payload.delete({ collection: "fonts", id: font.id })

    const history = await listThemeHistory(payload, { user: ada })
    const old = history.at(-1)!
    // The old version keeps its record of the Font, which is now gone.
    expect(old.inputs.headingFont).toBe(`font:${font.id}`)
    expect(old.missingFonts).toEqual(["Heading font"])

    const restored = await restoreThemeVersion(payload, {
      user: ada,
      versionId: old.id,
    })

    expect(restored.inputs.primary).toBe("#0a7d5a")
    expect(restored.inputs.headingFont).toBe(CLASSIC_INPUTS.headingFont)
    const [latest] = await listThemeHistory(payload, { user: ada })
    expect(latest!.summary).toContain("Heading font was deleted")
  })

  it("keeps a restored Font locked", async () => {
    const font = await importSlab()
    await saveTheme(payload, {
      user: ada,
      inputs: change({ headingFont: `font:${font.id}` }),
    })
    await saveTheme(payload, { user: ada, inputs: CLASSIC_INPUTS })
    const old = (await listThemeHistory(payload, { user: ada })).at(-1)!
    expect(old.missingFonts).toEqual([])

    await restoreThemeVersion(payload, { user: ada, versionId: old.id })

    await expect(
      payload.delete({ collection: "fonts", id: font.id })
    ).rejects.toThrow(/Used by the Theme \(heading font\)/)
  })
})
