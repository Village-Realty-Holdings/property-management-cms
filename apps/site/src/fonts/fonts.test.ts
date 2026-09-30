import { existsSync } from "node:fs"
import path from "node:path"

import { handleEndpoints, type Payload } from "payload"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { fontFilesStaticDir } from "../collections/FontFiles"
import { siteSchema } from "../database"
import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { getAvailableFonts, readStoredFonts } from "./available"
import { fontFaceCss } from "./fontFace"
import { getFontUsages, registerFontUsage } from "./fontUsage"
import type { FetchLike } from "./googleFonts"
import { GoogleFontError } from "./googleFonts"
import { importGoogleFont } from "./importGoogleFont"

// Integration tests: a real Payload on a throwaway database, and a fake
// fetch standing in for Google. Nothing here can reach the network.

/**
 * The first bytes of each format, as the type detection Payload runs on an
 * upload reads them (a WOFF2 file starts "wOF2", then its flavor).
 */
const MAGIC = {
  woff2: Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00]),
  woff: Buffer.from([0x77, 0x4f, 0x46, 0x46, 0x00, 0x01, 0x00, 0x00]),
  ttf: Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00]),
  otf: Buffer.from("OTTO\0"),
}

const GSTATIC = "https://fonts.gstatic.com/s/robotoslab/v34"
const CSS2 = "https://fonts.googleapis.com/css2"

const face = (weight: number) => `/* latin */
@font-face {
  font-family: 'Roboto Slab';
  font-style: normal;
  font-weight: ${weight};
  src: url(${GSTATIC}/rs-${weight}.woff2) format('woff2');
}
`

/** A fetch that serves Roboto Slab 400 and 700, and records what it was asked. */
function googleFetch(options: { failOn?: string } = {}) {
  const urls: string[] = []
  const fetch: FetchLike = async (input) => {
    const url = String(input)
    urls.push(url)
    if (options.failOn && url.includes(options.failOn)) {
      throw new TypeError("fetch failed")
    }
    if (url.startsWith(`${CSS2}?family=Roboto+Slab:wght@`)) {
      const weights = /wght@([\d;]+)/.exec(url)![1]!.split(";").map(Number)
      return new Response(weights.map(face).join(""))
    }
    const file = /rs-(\d+)\.woff2$/.exec(url)
    if (file) {
      return new Response(
        Buffer.concat([MAGIC.woff2, Buffer.from(`weight ${file[1]}`)])
      )
    }
    return new Response("Not found", { status: 404 })
  }
  return { fetch, urls }
}

let t: TestPayload
let payload: Payload
let staff: User & { collection: "users" }

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const user = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  staff = { ...user, collection: "users" }
})

afterEach(async () => {
  vi.restoreAllMocks()
  // Removes the font files from local disk too.
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

describe("importGoogleFont", () => {
  it("stores the Font and its files, which the Site then serves itself", async () => {
    const { fetch, urls } = googleFetch()

    const font = await importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400, 700] },
      { fetch }
    )

    expect(font).toMatchObject({
      family: "Roboto Slab",
      kind: "slab",
      source: "google",
    })
    expect(font.files.map((f) => [f.weight, f.style])).toEqual([
      [400, "normal"],
      [700, "normal"],
    ])

    // The files are in the Site's own font-files collection and on its disk.
    expect(await count("font-files")).toBe(2)
    const stored = await readStoredFonts(payload)
    expect(stored).toHaveLength(1)
    for (const file of stored[0]!.files) {
      // A path on the Site, not a URL on Google or a CDN.
      expect(file.url).toMatch(/^\/api\/font-files\/file\/roboto-slab-/)
      expect(new URL(file.url, "https://site.test").origin).toBe(
        "https://site.test"
      )
    }
    const doc = await payload.findByID({
      collection: "font-files",
      id:
        typeof font.files[0]!.file === "object"
          ? font.files[0]!.file.id
          : font.files[0]!.file,
    })
    expect(doc.mimeType).toBe("font/woff2")
    expect(
      existsSync(path.join(fontFilesStaticDir(siteSchema()), doc.filename!))
    ).toBe(true)

    // Google was asked only while importing: the CSS, then the two files.
    expect(urls).toHaveLength(3)
    expect(
      urls.every(
        (u) =>
          new URL(u).hostname.endsWith("google.com") ||
          new URL(u).hostname.endsWith("googleapis.com") ||
          new URL(u).hostname.endsWith("gstatic.com")
      )
    ).toBe(true)
  })

  it("serves each file from the Site's own file route, to anyone", async () => {
    const { fetch } = googleFetch()
    await importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400] },
      { fetch }
    )
    const [font] = await readStoredFonts(payload)

    // The request Next hands to src/app/(payload)/api/[...slug]/route.ts,
    // with no cookie: a visitor's browser loading the @font-face URL.
    const response = await handleEndpoints({
      config: payload.config,
      request: new Request(new URL(font!.files[0]!.url, "https://site.test")),
      payloadInstanceCacheKey: `${t.databaseUrl}#${siteSchema() ?? "public"}`,
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("font/woff2")
    expect(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 4)
        .toString("latin1")
    ).toBe("wOF2")
  })

  it("gives the layout @font-face rules that never leave the Site", async () => {
    const { fetch } = googleFetch()
    await importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400, 700] },
      { fetch }
    )
    const css = fontFaceCss(await readStoredFonts(payload))
    expect(css.match(/@font-face/g)).toHaveLength(2)
    expect(css).toContain('font-family:"Roboto Slab"')
    expect(css).toContain("font-display:swap")
    expect(css).not.toMatch(/https?:/)
    expect(css).toMatch(/url\("\/api\/font-files\/file\/roboto-slab-400/)
  })

  it("lists the stored Font next to the built-in quick picks", async () => {
    const { fetch } = googleFetch()
    const font = await importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400, 700] },
      { fetch }
    )
    const available = await getAvailableFonts(payload)
    expect(available.filter((f) => f.source === "built-in")).toHaveLength(6)
    expect(available.at(-1)).toMatchObject({
      key: `font:${font.id}`,
      family: "Roboto Slab",
      weights: [400, 700],
    })
  })

  it("leaves nothing behind when a download fails", async () => {
    const { fetch } = googleFetch({ failOn: "rs-700.woff2" })
    await expect(
      importGoogleFont(
        payload,
        { family: "Roboto Slab", kind: "slab", weights: [400, 700] },
        { fetch }
      )
    ).rejects.toBeInstanceOf(GoogleFontError)
    expect(await count("fonts")).toBe(0)
    expect(await count("font-files")).toBe(0)
  })

  it("removes the files it stored when saving the Font fails", async () => {
    const { fetch } = googleFetch()
    const create = payload.create.bind(payload)
    vi.spyOn(payload, "create").mockImplementation(((args: {
      collection: string
    }) =>
      args.collection === "fonts"
        ? Promise.reject(new Error("database went away"))
        : create(args as never)) as never)

    await expect(
      importGoogleFont(
        payload,
        { family: "Roboto Slab", kind: "slab", weights: [400, 700] },
        { fetch }
      )
    ).rejects.toThrow("database went away")
    vi.restoreAllMocks()
    expect(await count("fonts")).toBe(0)
    expect(await count("font-files")).toBe(0)
  })

  it("refuses a family that is already a Font, before asking Google", async () => {
    const first = googleFetch()
    await importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400] },
      { fetch: first.fetch }
    )
    const second = googleFetch()
    await expect(
      importGoogleFont(
        payload,
        { family: "Roboto Slab", kind: "slab", weights: [700] },
        { fetch: second.fetch }
      )
    ).rejects.toMatchObject({ code: "already-added" })
    expect(second.urls).toHaveLength(0)
    expect(await count("fonts")).toBe(1)
  })

  it.each([
    ["a family that is a URL", { family: "https://evil.test/x", kind: "sans" }],
    ["a family with URL syntax", { family: "Roboto&x=1", kind: "sans" }],
    ["an unknown kind", { family: "Roboto Slab", kind: "cursive" }],
  ])("refuses %s without asking Google", async (_name, input) => {
    const { fetch, urls } = googleFetch()
    await expect(
      importGoogleFont(payload, { weights: [400], ...input } as never, {
        fetch,
      })
    ).rejects.toMatchObject({ code: "invalid-input" })
    expect(urls).toHaveLength(0)
  })

  it("imports as the Staff User when given one, under the access rules", async () => {
    const { fetch } = googleFetch()
    const font = await importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400] },
      { fetch, as: { overrideAccess: false, user: staff } }
    )
    expect(font.family).toBe("Roboto Slab")

    await expect(
      importGoogleFont(
        payload,
        { family: "Roboto Mono", kind: "sans", weights: [400] },
        { fetch, as: { overrideAccess: false, user: undefined as never } }
      )
    ).rejects.toThrow()
    expect(await count("font-files")).toBe(1)
  })
})

describe("Fonts access", () => {
  it("lets anyone read a Font but only a Staff User change one", async () => {
    const { fetch } = googleFetch()
    const font = await importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400] },
      { fetch }
    )
    const visitor = { overrideAccess: false as const }

    const read = await payload.findByID({
      collection: "fonts",
      id: font.id,
      ...visitor,
    })
    expect(read.family).toBe("Roboto Slab")
    await expect(
      payload.delete({ collection: "fonts", id: font.id, ...visitor })
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: "fonts",
        id: font.id,
        data: { kind: "serif" },
        ...visitor,
      })
    ).rejects.toThrow()
  })

  it("rejects two files with the same weight and style", async () => {
    const file = await payload.create({
      collection: "font-files",
      data: {},
      file: fontUpload("a.woff2"),
    })
    await expect(
      payload.create({
        collection: "fonts",
        data: {
          family: "Twice",
          kind: "sans",
          files: [
            { weight: 400, style: "normal", file: file.id },
            { weight: 400, style: "normal", file: file.id },
          ],
        },
      })
    ).rejects.toThrow()
    expect(await count("fonts")).toBe(0)
  })

  it("rejects a family name that could break out of CSS", async () => {
    const file = await payload.create({
      collection: "font-files",
      data: {},
      file: fontUpload("b.woff2"),
    })
    await expect(
      payload.create({
        collection: "fonts",
        data: {
          family: 'Evil"; }',
          kind: "sans",
          files: [{ weight: 400, style: "normal", file: file.id }],
        },
      })
    ).rejects.toThrow()
  })
})

/** A tiny file with a WOFF2 header, as Payload's Local API takes it. */
function fontUpload(
  name: string,
  header: Buffer | string = MAGIC.woff2,
  mimetype = "font/woff2"
) {
  const data = Buffer.concat([Buffer.from(header), Buffer.from("....data")])
  return { data, mimetype, name, size: data.length }
}

describe("font files", () => {
  it("accepts woff2, woff, ttf and otf", async () => {
    const files = [
      fontUpload("a.woff2"),
      fontUpload("a.woff", MAGIC.woff, "font/woff"),
      fontUpload("a.ttf", MAGIC.ttf, "font/ttf"),
      fontUpload("a.otf", MAGIC.otf, "font/otf"),
    ]
    for (const file of files) {
      const doc = await payload.create({
        collection: "font-files",
        data: {},
        file,
      })
      expect(doc.filename).toBe(file.name)
    }
  })

  it.each([
    ["a script", fontUpload("a.js", "//", "text/javascript"), /invalid/i],
    ["an image", fontUpload("a.png", "\u0089PNG", "image/png"), /invalid/i],
    [
      "a page named like a font",
      fontUpload("a.woff2", "<htm", "text/html"),
      /invalid/i,
    ],
    ["a font with the wrong extension", fontUpload("a.txt"), /must be \.woff2/],
    [
      "a TrueType font named .woff2",
      fontUpload("a.woff2", MAGIC.ttf, "font/ttf"),
      /aren.t a \.woff2/,
    ],
  ])("refuses %s", async (_name, file, message) => {
    await expect(
      payload.create({ collection: "font-files", data: {}, file })
    ).rejects.toThrow(message)
    expect(await count("font-files")).toBe(0)
  })

  it("can be read by anyone but only added by a Staff User", async () => {
    await expect(
      payload.create({
        collection: "font-files",
        data: {},
        file: fontUpload("c.woff2"),
        overrideAccess: false,
      })
    ).rejects.toThrow()
    const doc = await payload.create({
      collection: "font-files",
      data: {},
      file: fontUpload("c.woff2"),
      overrideAccess: false,
      user: staff,
    })
    const read = await payload.findByID({
      collection: "font-files",
      id: doc.id,
      overrideAccess: false,
    })
    expect(read.url).toBe("/api/font-files/file/c.woff2")
  })
})

describe("deleting a Font", () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    while (cleanups.length) cleanups.pop()!()
  })

  async function importSlab() {
    return importGoogleFont(
      payload,
      { family: "Roboto Slab", kind: "slab", weights: [400, 700] },
      { fetch: googleFetch().fetch }
    )
  }

  it("is blocked while the Theme uses the Font, and the error names what does", async () => {
    const font = await importSlab()
    cleanups.push(
      registerFontUsage((id) =>
        id === font.id ? ["Used by the Theme (heading font)"] : []
      ),
      registerFontUsage((id) =>
        id === font.id ? ["Used by the Footer Layout"] : []
      )
    )

    const error = await payload
      .delete({ collection: "fonts", id: font.id })
      .catch((e: unknown) => e as Error)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("Roboto Slab can't be deleted")
    expect((error as Error).message).toContain(
      "Used by the Theme (heading font)"
    )
    expect((error as Error).message).toContain("Used by the Footer Layout")
    // Nothing was deleted: the Font, and its files, are all still there.
    expect(await count("fonts")).toBe(1)
    expect(await count("font-files")).toBe(2)
  })

  it("is blocked for a Staff User too, through the access rules", async () => {
    const font = await importSlab()
    cleanups.push(registerFontUsage(() => ["Used by the Theme"]))
    await expect(
      payload.delete({
        collection: "fonts",
        id: font.id,
        overrideAccess: false,
        user: staff,
      })
    ).rejects.toThrow(/Used by the Theme/)
  })

  it("blocks a delete of many Fonts that includes one in use", async () => {
    const font = await importSlab()
    cleanups.push(registerFontUsage((id) => (id === font.id ? ["Used"] : [])))
    const result = await payload.delete({
      collection: "fonts",
      where: { id: { exists: true } },
    })
    expect(result.errors).toHaveLength(1)
    expect(await count("fonts")).toBe(1)
  })

  it("only blocks the Font that is used", async () => {
    const slab = await importSlab()
    const other = await payload.create({
      collection: "fonts",
      data: {
        family: "Unused",
        kind: "sans",
        files: [
          {
            weight: 400,
            style: "normal",
            file: (
              await payload.create({
                collection: "font-files",
                data: {},
                file: fontUpload("unused.woff2"),
              })
            ).id,
          },
        ],
      },
    })
    cleanups.push(registerFontUsage((id) => (id === slab.id ? ["Used"] : [])))
    await payload.delete({ collection: "fonts", id: other.id })
    expect(await count("fonts")).toBe(1)
  })

  it("lets the UI ask what uses a Font", async () => {
    const font = await importSlab()
    cleanups.push(registerFontUsage(() => ["Used by the Theme (body font)"]))
    expect(await getFontUsages(font.id, { payload })).toEqual([
      "Used by the Theme (body font)",
    ])
  })

  it("succeeds when nothing uses it, and removes its files", async () => {
    const font = await importSlab()
    cleanups.push(registerFontUsage(() => []))
    const stored = await readStoredFonts(payload)
    const [first] = await payload
      .find({ collection: "font-files", limit: 1 })
      .then((r) => r.docs)
    const onDisk = path.join(fontFilesStaticDir(siteSchema()), first!.filename!)
    expect(existsSync(onDisk)).toBe(true)
    expect(stored).toHaveLength(1)

    await payload.delete({ collection: "fonts", id: font.id })

    expect(await count("fonts")).toBe(0)
    expect(await count("font-files")).toBe(0)
    expect(existsSync(onDisk)).toBe(false)
  })
})
