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

import { registerFontUsage } from "../../fonts/fontUsage"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"

// The Server Actions the Fonts screen calls, end to end: the actions run for
// real, as a User, against a real Payload; only the session lookup and
// Next's cache are stood in for, and `fetch` is a fake Google.

const session = vi.hoisted(() => ({
  current: undefined as
    | undefined
    | {
        payload: Payload
        as: { overrideAccess: false; user: unknown }
      },
}))
const revalidatePath = vi.hoisted(() => vi.fn())

vi.mock("../session", () => ({ requireUser: async () => session.current }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { addGoogleFont, deleteFont, uploadFonts } from "./fonts"
import { loadFontRows } from "../fonts/fontsScreen"

const WOFF2 = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])
const css = (weight: number) => `/* latin */
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: ${weight};
  src: url(https://fonts.gstatic.com/s/lora/v1/lora-${weight}.woff2) format('woff2');
}
`

function fakeGoogle() {
  return vi.fn(async (input: string | URL) => {
    const url = String(input)
    if (url.startsWith("https://fonts.googleapis.com/css2?family=Lora")) {
      const weights = /wght@([\d;]+)/.exec(url)?.[1]?.split(";").map(Number)
      return new Response((weights ?? [400]).map(css).join(""))
    }
    const file = /lora-(\d+)\.woff2$/.exec(url)
    if (file) {
      return new Response(Buffer.concat([WOFF2, Buffer.from(file[1]!)]))
    }
    return new Response("Bad request", { status: 400 })
  })
}

function form(entries: [string, string | File][]): FormData {
  const data = new FormData()
  for (const [name, value] of entries) data.append(name, value)
  return data
}

let t: TestPayload
let payload: Payload
const cleanups: (() => void)[] = []

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const user = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  session.current = {
    payload,
    as: { overrideAccess: false, user: { ...user, collection: "users" } },
  }
})

afterEach(async () => {
  vi.unstubAllGlobals()
  revalidatePath.mockClear()
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

const rows = () =>
  loadFontRows(
    payload,
    session.current!.as as Parameters<typeof loadFontRows>[1]
  )

describe("addGoogleFont", () => {
  const lora = () =>
    form([
      ["family", "Lora"],
      ["kind", "serif"],
      ["weight", "400"],
      ["weight", "700"],
    ])

  it("imports the Font as the User and refreshes the screen and the Site", async () => {
    const google = fakeGoogle()
    vi.stubGlobal("fetch", google)

    const result = await addGoogleFont({}, lora())

    expect(result).toMatchObject({ ok: true, message: "Added Lora." })
    expect((await rows()).map((r) => r.family)).toEqual(["Lora"])
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/assets/fonts")
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("only ever asks Google while importing, and serves the files itself", async () => {
    vi.stubGlobal("fetch", fakeGoogle())
    await addGoogleFont({}, lora())
    const [font] = await rows()
    expect(font!.faces.every((f) => f.url.startsWith("/api/font-files/"))).toBe(
      true
    )
  })

  it("reports a failed import inline and refreshes nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )
    const result = await addGoogleFont({}, lora())
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/Couldn't reach Google Fonts/)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("uploadFonts", () => {
  it("stores the uploaded files as a Font", async () => {
    const result = await uploadFonts(
      {},
      form([
        ["family", "Acme Sans"],
        ["kind", "sans"],
        ["file", new File([Uint8Array.from(WOFF2), "x"], "acme.woff2")],
        ["weight", "400"],
        ["style", "normal"],
      ])
    )
    expect(result).toMatchObject({ ok: true, message: "Added Acme Sans." })
    expect((await rows()).map((r) => r.family)).toEqual(["Acme Sans"])
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/assets/fonts")
  })

  it("returns field errors and refreshes nothing when the form is wrong", async () => {
    const result = await uploadFonts({}, form([["family", ""]]))
    expect(result.ok).toBe(false)
    expect(result.fieldErrors).toHaveProperty("family")
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("deleteFont", () => {
  async function addLora() {
    vi.stubGlobal("fetch", fakeGoogle())
    await addGoogleFont(
      {},
      form([
        ["family", "Lora"],
        ["kind", "serif"],
        ["weight", "400"],
      ])
    )
    revalidatePath.mockClear()
    return (await rows())[0]!
  }

  it("deletes a Font nothing uses", async () => {
    const font = await addLora()
    const result = await deleteFont(font.id)
    expect(result).toMatchObject({ ok: true, message: "Deleted Lora." })
    expect(await rows()).toEqual([])
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/assets/fonts")
  })

  it("blocks deleting a Font in use, and the error names what uses it", async () => {
    const font = await addLora()
    cleanups.push(
      registerFontUsage((id) =>
        id === font.id ? ["Used by the Theme (body font)"] : []
      )
    )
    const result = await deleteFont(font.id)
    expect(result).toEqual({
      ok: false,
      message: "Lora can't be deleted. Used by the Theme (body font).",
    })
    expect(await rows()).toHaveLength(1)
    // The Font's files are still there for the Site to serve.
    expect((await payload.count({ collection: "font-files" })).totalDocs).toBe(
      1
    )
  })

  it("won't act on a nonsense id", async () => {
    const result = await deleteFont(Number.NaN)
    expect(result.ok).toBe(false)
  })
})
