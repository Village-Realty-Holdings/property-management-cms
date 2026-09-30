import { ValidationError, type Payload } from "payload"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { FetchLike } from "../../fonts/googleFonts"
import { registerFontUsage } from "../../fonts/fontUsage"
import type { User } from "../../payload-types"
import { CLASSIC, HARBOUR } from "../../theme"
import { saveTheme } from "../../theme/record"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import {
  addGoogleFontAs,
  deleteFontAs,
  loadFontRows,
  uploadFontAs,
} from "./fontsScreen"

// The Fonts screen's actions against a real Payload on a throwaway database,
// as a Staff User, with a fake fetch standing in for Google: nothing here can
// reach the network.

const MAGIC = {
  woff2: Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00]),
  woff: Buffer.from([0x77, 0x4f, 0x46, 0x46, 0x00, 0x01, 0x00, 0x00]),
  ttf: Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00]),
  otf: Buffer.from("OTTO\0"),
}

const GSTATIC = "https://fonts.gstatic.com/s/robotoslab/v34"
const CSS2 = "https://fonts.googleapis.com/css2"

const face = (weight: number, style = "normal") => `/* latin */
@font-face {
  font-family: 'Roboto Slab';
  font-style: ${style};
  font-weight: ${weight};
  src: url(${GSTATIC}/rs-${weight}-${style}.woff2) format('woff2');
}
`

/** Serves Roboto Slab in 400 and 700 only; any other family is unknown. */
function googleFetch(options: { offline?: boolean } = {}): FetchLike {
  return async (input) => {
    const url = String(input)
    if (options.offline) throw new TypeError("fetch failed")
    if (url.startsWith(`${CSS2}?family=`)) {
      if (!url.startsWith(`${CSS2}?family=Roboto+Slab`)) {
        return new Response("Bad request", { status: 400 })
      }
      const weights = /wght@([\d;]+)/.exec(url)?.[1]?.split(";").map(Number)
      if (!weights) return new Response(face(400))
      if (weights.some((w) => w !== 400 && w !== 700)) {
        return new Response("Bad request", { status: 400 })
      }
      return new Response(weights.map((w) => face(w)).join(""))
    }
    const file = /rs-(\d+)-normal\.woff2$/.exec(url)
    if (file) {
      return new Response(
        Buffer.concat([MAGIC.woff2, Buffer.from(`weight ${file[1]}`)])
      )
    }
    return new Response("Not found", { status: 404 })
  }
}

function form(entries: [string, string | File][]): FormData {
  const data = new FormData()
  for (const [name, value] of entries) data.append(name, value)
  return data
}

const fontFile = (name: string, magic: Buffer) =>
  new File([Uint8Array.from(magic), name], name)

let t: TestPayload
let payload: Payload
let staff: User & { collection: "users" }
let as: { overrideAccess: false; user: typeof staff }
const cleanups: (() => void)[] = []

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const user = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  staff = { ...user, collection: "users" }
  as = { overrideAccess: false, user: staff }
})

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  await payload.delete({ collection: "fonts", where: { id: { exists: true } } })
  await payload.delete({
    collection: "font-files",
    where: { id: { exists: true } },
  })
})

afterAll(async () => {
  await t?.teardown()
})

const count = async (collection: "fonts" | "font-files") =>
  (await payload.count({ collection })).totalDocs

const googleForm = (family: string, weights: string[], kind = "slab") =>
  form([
    ["family", family],
    ["kind", kind],
    ...weights.map((w): [string, string] => ["weight", w]),
  ])

describe("addGoogleFontAs", () => {
  it("imports the Font, stores its files and lists it", async () => {
    const result = await addGoogleFontAs(
      payload,
      as,
      googleForm("Roboto Slab", ["400", "700"]),
      { fetch: googleFetch() }
    )

    expect(result).toMatchObject({ ok: true, message: "Added Roboto Slab." })
    expect(await count("fonts")).toBe(1)
    expect(await count("font-files")).toBe(2)

    const rows = await loadFontRows(payload, as)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      family: "Roboto Slab",
      kindLabel: "Slab serif",
      sourceLabel: "Google Fonts",
      summary: "2 weights (400, 700)",
      locked: false,
    })
    // The Site serves each file itself.
    for (const { url } of rows[0]!.faces) {
      expect(url).toMatch(/^\/api\/font-files\/file\/roboto-slab-/)
    }
  })

  it("shows what is wrong with the input on its field, and stores nothing", async () => {
    const result = await addGoogleFontAs(payload, as, googleForm("", []), {
      fetch: googleFetch(),
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBe("Some fields need attention.")
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "family",
      "weights",
    ])
    expect(await count("fonts")).toBe(0)
  })

  it("reports an unknown family on the family field", async () => {
    const result = await addGoogleFontAs(
      payload,
      as,
      googleForm("Nonexistent Sans", ["400"]),
      { fetch: googleFetch() }
    )
    expect(result.ok).toBe(false)
    expect(result.fieldErrors?.family).toMatch(/no family called/)
    expect(result.message).toBe(result.fieldErrors?.family)
    expect(await count("fonts")).toBe(0)
  })

  it("reports a weight the family doesn't have on the weights field", async () => {
    const result = await addGoogleFontAs(
      payload,
      as,
      googleForm("Roboto Slab", ["400", "300"]),
      { fetch: googleFetch() }
    )
    expect(result.ok).toBe(false)
    expect(result.fieldErrors?.weights).toMatch(/isn't offered in 300/)
    expect(await count("font-files")).toBe(0)
  })

  it("reports a network failure for the whole form, and stores nothing", async () => {
    const result = await addGoogleFontAs(
      payload,
      as,
      googleForm("Roboto Slab", ["400"]),
      { fetch: googleFetch({ offline: true }) }
    )
    expect(result).toEqual({
      ok: false,
      message:
        "Couldn't reach Google Fonts. Check the connection and try again.",
    })
    expect(await count("fonts")).toBe(0)
    expect(await count("font-files")).toBe(0)
  })

  it("won't add a family twice", async () => {
    const fetch = googleFetch()
    await addGoogleFontAs(payload, as, googleForm("Roboto Slab", ["400"]), {
      fetch,
    })
    const again = await addGoogleFontAs(
      payload,
      as,
      googleForm("Roboto Slab", ["400"]),
      { fetch }
    )
    expect(again.ok).toBe(false)
    expect(again.fieldErrors?.family).toBe("Roboto Slab is already in Fonts.")
    expect(await count("fonts")).toBe(1)
  })

  it("is refused without a signed-in Staff User", async () => {
    const result = await addGoogleFontAs(
      payload,
      { overrideAccess: false, user: null },
      googleForm("Roboto Slab", ["400"]),
      { fetch: googleFetch() }
    )
    expect(result.ok).toBe(false)
    expect(await count("fonts")).toBe(0)
  })
})

describe("uploadFontAs", () => {
  const upload = () =>
    form([
      ["family", "Acme Sans"],
      ["kind", "sans"],
      ["file", fontFile("acme-regular.woff2", MAGIC.woff2)],
      ["weight", "400"],
      ["style", "normal"],
      ["file", fontFile("acme-bold.ttf", MAGIC.ttf)],
      ["weight", "700"],
      ["style", "normal"],
      ["file", fontFile("acme-italic.otf", MAGIC.otf)],
      ["weight", "400"],
      ["style", "italic"],
    ])

  it("stores a Font from uploaded files, each with its weight and style", async () => {
    const result = await uploadFontAs(payload, as, upload())

    expect(result).toMatchObject({ ok: true, message: "Added Acme Sans." })
    const rows = await loadFontRows(payload, as)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      family: "Acme Sans",
      sourceLabel: "Uploaded",
      summary: "2 weights (400, 700), with italics",
    })
    expect(rows[0]!.faces.map((f) => f.label)).toEqual([
      "400 Regular",
      "400 Regular italic",
      "700 Bold",
    ])
    expect(await count("font-files")).toBe(3)
  })

  it("names the file that isn't a font, and stores nothing", async () => {
    const data = form([
      ["family", "Acme Sans"],
      ["kind", "sans"],
      ["file", fontFile("notes.woff2", Buffer.from("just some text"))],
      ["weight", "400"],
      ["style", "normal"],
    ])
    const result = await uploadFontAs(payload, as, data)
    expect(result.ok).toBe(false)
    expect(await count("fonts")).toBe(0)
    expect(await count("font-files")).toBe(0)
  })

  it("stores none of the files when a later one isn't the format its name says", async () => {
    const data = form([
      ["family", "Acme Sans"],
      ["kind", "sans"],
      ["file", fontFile("good.woff2", MAGIC.woff2)],
      ["weight", "400"],
      ["style", "normal"],
      // Named .woff2 but really TrueType: the Font files collection refuses it.
      ["file", fontFile("liar.woff2", MAGIC.ttf)],
      ["weight", "700"],
      ["style", "normal"],
    ])
    const result = await uploadFontAs(payload, as, data)
    expect(result.ok).toBe(false)
    expect(await count("font-files")).toBe(0)
    expect(await count("fonts")).toBe(0)
  })

  it("says a stored file that Payload refuses is not a font, and logs the detail", async () => {
    // Payload's own refusal ("The following field is invalid: file" with the
    // sniffed type inside) must not reach the person as it is.
    const refusing = new Proxy(payload, {
      get(target, prop) {
        if (prop === "create") {
          return (args: { collection: string }) =>
            args.collection === "font-files"
              ? Promise.reject(
                  new ValidationError({
                    errors: [
                      {
                        message: "Invalid MIME type: application/pdf.",
                        path: "file",
                      },
                    ],
                  })
                )
              : target.create(args as never)
        }
        const value = Reflect.get(target, prop)
        return typeof value === "function" ? value.bind(target) : value
      },
    })
    const warn = vi.spyOn(payload.logger, "warn").mockImplementation(() => {})

    const result = await uploadFontAs(refusing, as, upload())

    expect(result.ok).toBe(false)
    expect(result.message).toBe(
      "acme-regular.woff2: That file is not a WOFF2, WOFF, TTF or OTF font."
    )
    expect(result.fieldErrors).toEqual({
      "files.0.file": "That file is not a WOFF2, WOFF, TTF or OTF font.",
    })
    expect(JSON.stringify(result)).not.toMatch(/following field|MIME/)
    expect(JSON.stringify(warn.mock.calls)).toContain(
      "Invalid MIME type: application/pdf."
    )
    warn.mockRestore()
    expect(await count("font-files")).toBe(0)
    expect(await count("fonts")).toBe(0)
  })

  it("returns the form's field errors without touching the database", async () => {
    const data = form([
      ["family", ""],
      ["kind", "sans"],
      ["file", new File([], "")],
      ["weight", "400"],
      ["style", "normal"],
    ])
    const result = await uploadFontAs(payload, as, data)
    expect(result.ok).toBe(false)
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "family",
      "files.0.file",
    ])
    expect(await count("font-files")).toBe(0)
  })

  it("won't add a family twice", async () => {
    await uploadFontAs(payload, as, upload())
    const again = await uploadFontAs(payload, as, upload())
    expect(again.ok).toBe(false)
    expect(again.fieldErrors?.family).toBe("Acme Sans is already in Fonts.")
    expect(await count("fonts")).toBe(1)
    expect(await count("font-files")).toBe(3)
  })
})

describe("loadFontRows and deleteFontAs", () => {
  async function addSlab() {
    await addGoogleFontAs(payload, as, googleForm("Roboto Slab", ["400"]), {
      fetch: googleFetch(),
    })
    const [font] = await loadFontRows(payload, as)
    return font!
  }

  it("shows a Font in use as locked, with what uses it", async () => {
    const font = await addSlab()
    cleanups.push(
      registerFontUsage((id) =>
        id === font.id ? ["Used by the Theme (heading font)"] : []
      )
    )
    const [row] = await loadFontRows(payload, as)
    expect(row).toMatchObject({
      locked: true,
      usages: ["Used by the Theme (heading font)"],
    })
    expect(row!.deleteBlockedReason).toContain("is in use")
  })

  it("lists the earlier Theme versions that used a Font, not the live one", async () => {
    const font = await addSlab()
    const withFont = (over: object = {}) => ({
      ...HARBOUR.inputs,
      headingFont: `font:${font.id}`,
      ...over,
    })
    await saveTheme(payload, { user: staff, inputs: withFont() })
    await saveTheme(payload, {
      user: staff,
      inputs: withFont({ primary: "#0a7d5a" }),
    })
    // Live now uses it too: the two saved versions are the live one's past.
    const [locked] = await loadFontRows(payload, as)
    expect(locked!.locked).toBe(true)
    expect(locked!.earlierThemeVersions).toHaveLength(1)

    await saveTheme(payload, { user: staff, inputs: CLASSIC.inputs })
    const [row] = await loadFontRows(payload, as)
    expect(row).toMatchObject({ locked: false, deleteBlockedReason: null })
    expect(row!.earlierThemeVersions).toHaveLength(2)
    expect(row!.earlierThemeVersions.every((when) => /UTC$/.test(when))).toBe(
      true
    )
  })

  it("lists no earlier Theme version when none used the Font", async () => {
    await addSlab()
    await saveTheme(payload, { user: staff, inputs: HARBOUR.inputs })
    const [row] = await loadFontRows(payload, as)
    expect(row!.earlierThemeVersions).toEqual([])
  })

  it("deletes a Font nothing uses, with its files", async () => {
    const font = await addSlab()
    const result = await deleteFontAs(payload, as, font.id)
    expect(result).toMatchObject({ ok: true, message: "Deleted Roboto Slab." })
    expect(await loadFontRows(payload, as)).toEqual([])
    expect(await count("font-files")).toBe(0)
  })

  it("refuses to delete a Font in use, naming what uses it", async () => {
    const font = await addSlab()
    cleanups.push(
      registerFontUsage(() => [
        "Used by the Theme (heading font)",
        "Used by the Theme (body font)",
      ])
    )
    const result = await deleteFontAs(payload, as, font.id)
    expect(result.ok).toBe(false)
    expect(result.message).toBe(
      "Roboto Slab can't be deleted. Used by the Theme (heading font); Used by the Theme (body font)."
    )
    expect(await count("fonts")).toBe(1)
    expect(await count("font-files")).toBe(1)
  })

  it("reports a Font that is already gone", async () => {
    const result = await deleteFontAs(payload, as, 999_999)
    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
  })

  it("is refused without a signed-in Staff User", async () => {
    // Fonts are readable by anyone, but deleting one takes a Staff User.
    const font = await addSlab()
    const result = await deleteFontAs(
      payload,
      { overrideAccess: false, user: null },
      font.id
    )
    expect(result.ok).toBe(false)
    expect(await count("fonts")).toBe(1)
  })
})
