import { rm } from "node:fs/promises"
import path from "node:path"
import { deflateSync } from "node:zlib"

import type { Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"

/**
 * Media (ADR-0008): editorial images, one Site each, stored under the Site's
 * slug. Uploads go through the Local API with a generated PNG buffer.
 */

type ID = number

let t: TestPayload
let payload: Payload
let siteA: ID
let siteB: ID
let readerA: TypedUser | null
let editorA: TypedUser | null

// Distinct per run: local disk (apps/cms/media) outlives the test database.
const filename = `hero-${Date.now()}.png`

/** A valid 1x1 RGBA PNG. */
function tinyPng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data])
    const out = Buffer.alloc(body.length + 8)
    out.writeUInt32BE(data.length, 0)
    body.copy(out, 4)
    out.writeUInt32BE(crc(body), body.length + 4)
    return out
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1, 0) // width
  header.writeUInt32BE(1, 4) // height
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from([0, 255, 0, 0, 255]))),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function staticDir(): string {
  const upload = payload.collections.media.config.upload
  return upload.staticDir as string
}

function upload(site: ID, name = filename, extra: object = {}) {
  const data = tinyPng()
  return payload.create({
    collection: "media",
    data: { alt: "A beach", site },
    file: { data, mimetype: "image/png", name, size: data.length },
    ...extra,
  })
}

beforeAll(async () => {
  // Local disk only, even when apps/cms/.env configures a bucket: these
  // tests never touch object storage (see storage.test.ts).
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("S3_")) delete process.env[name]
  }
  t = await getTestPayload()
  payload = t.payload

  const a = await payload.create({
    collection: "sites",
    data: { name: "Site A", slug: "site-a" },
  })
  const b = await payload.create({
    collection: "sites",
    data: { name: "Site B", slug: "site-b" },
  })
  siteA = a.id
  siteB = b.id

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "media-reader-a" },
  })
  const { user } = await payload.auth({
    headers: new Headers({
      Authorization: "site-readers API-Key media-reader-a",
    }),
  })
  readerA = user

  const editor = await payload.create({
    collection: "users",
    data: {
      email: "media-editor-a@example.com",
      password: "password",
      role: "editor",
      tenants: [{ site: siteA }],
    },
  })
  editorA = { ...editor, collection: "users" } as TypedUser
})

afterAll(async () => {
  if (!t) return
  // Removes the files from local disk too.
  await payload.delete({ collection: "media", where: { id: { exists: true } } })
  await t.teardown()
})

describe("Media", () => {
  let mediaA: { id: ID; filename?: string | null; prefix?: string | null }
  let mediaB: { id: ID; filename?: string | null; prefix?: string | null }

  it("lets two Sites upload a file with the same name", async () => {
    mediaA = await upload(siteA)
    mediaB = await upload(siteB)
    expect(mediaA.filename).toBe(filename)
    // Local disk is one folder, so Payload renames the second file on disk.
    // Under object storage, the prefix keeps both keys apart.
    expect(mediaB.filename).toMatch(/^hero-\d+(-\d+)?\.png$/)
  })

  it("sets the prefix from the Site's slug, whatever the caller sends", async () => {
    expect(mediaA.prefix).toBe("site-a")
    expect(mediaB.prefix).toBe("site-b")

    const spoofed = await upload(siteA, `spoof-${filename}`, {
      data: { alt: "x", site: siteA, prefix: "site-b" },
      overrideAccess: false,
      user: editorA,
    })
    expect(spoofed.prefix).toBe("site-a")
  })

  it("keeps the prefix on metadata updates", async () => {
    const updated = await payload.update({
      collection: "media",
      id: mediaA.id,
      data: { caption: "Sunset", credit: "Jane Doe", prefix: "elsewhere" },
      overrideAccess: false,
      user: editorA,
    })
    expect(updated.prefix).toBe("site-a")
    expect(updated.caption).toBe("Sunset")
    expect(updated.credit).toBe("Jane Doe")
  })

  it("allows the same filename under different Site prefixes only", async () => {
    // overwriteExistingFiles skips Payload's rename, so this checks the
    // database: `filename` is unique per `prefix`, not globally.
    const same = await upload(siteB, filename, {
      overwriteExistingFiles: true,
    })
    expect(same.filename).toBe(filename)
    expect(same.prefix).toBe("site-b")

    await expect(
      upload(siteA, filename, { overwriteExistingFiles: true })
    ).rejects.toThrow()
  })

  it("checks for taken filenames within the Site's prefix only", async () => {
    // Object storage has no shared folder, so only the database check runs.
    // Simulate that by removing Site A's file from local disk.
    const name = `only-${filename}`
    const first = await upload(siteA, name)
    await rm(path.join(staticDir(), name))
    const second = await upload(siteB, name)
    expect(first.filename).toBe(name)
    expect(second.filename).toBe(name)
    expect(second.prefix).toBe("site-b")
  })

  it("only shows a Site's reader its own Site's media", async () => {
    const { docs } = await payload.find({
      collection: "media",
      overrideAccess: false,
      user: readerA,
      depth: 0,
      limit: 100,
    })
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.every((doc) => doc.site === siteA)).toBe(true)

    await expect(
      payload.findByID({
        collection: "media",
        id: mediaB.id,
        overrideAccess: false,
        user: readerA,
      })
    ).rejects.toThrow()
  })

  it("rejects files that aren't images", async () => {
    const data = Buffer.from("not an image")
    await expect(
      payload.create({
        collection: "media",
        data: { alt: "x", site: siteA },
        file: {
          data,
          mimetype: "text/plain",
          name: "a.txt",
          size: data.length,
        },
      })
    ).rejects.toThrow()
  })

  it("rejects SVG and GIF images", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>'
    )
    await expect(
      payload.create({
        collection: "media",
        data: { alt: "x", site: siteA },
        file: {
          data: svg,
          mimetype: "image/svg+xml",
          name: `logo-${Date.now()}.svg`,
          size: svg.length,
        },
      })
    ).rejects.toThrow()
    const gif = Buffer.from("R0lGODlhAQABAAAAACw=", "base64")
    await expect(
      payload.create({
        collection: "media",
        data: { alt: "x", site: siteA },
        file: {
          data: gif,
          mimetype: "image/gif",
          name: `anim-${Date.now()}.gif`,
          size: gif.length,
        },
      })
    ).rejects.toThrow()
  })
})
