import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { mediaStaticDir } from "./Media"

describe("mediaStaticDir", () => {
  it("keeps each Site's local uploads in media/<schema>", () => {
    expect(mediaStaticDir("avada")).toBe(path.resolve("media", "avada"))
    expect(mediaStaticDir("warren_beach")).toBe(
      path.resolve("media", "warren_beach")
    )
  })

  it("leaves Payload's default folder when there is no schema", () => {
    expect(mediaStaticDir(undefined)).toBeUndefined()
  })
})

// Integration test: a real Payload on a throwaway database.

/** A 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>Mark</title><path d="M0 0h10v10z"/></svg>`
const SCRIPTED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><path d="M0 0h10v10z"/></svg>`

const attribution = {
  author: "Jane Doe",
  sourceUrl: "https://unsplash.com/photos/a-beach-abc123",
  licence: "Unsplash License",
}

let t: TestPayload
let payload: Payload
let dir: string
const created: number[] = []

function upload(name: string, data: Buffer | string) {
  const file = path.join(dir, name)
  writeFileSync(file, data)
  return file
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  dir = mkdtempSync(path.join(tmpdir(), "media-test-"))
})

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: "media", id })
  }
  rmSync(dir, { recursive: true, force: true })
  await t.teardown()
})

describe("Media attribution", () => {
  it("is optional: a photo without it is stored as before", async () => {
    const doc = await payload.create({
      collection: "media",
      data: { alt: "A single pixel, for the test" },
      filePath: upload("no-attribution.png", PNG),
    })
    created.push(doc.id)
    expect(doc.attribution?.author ?? null).toBeNull()
  })

  it("stores the author, the source URL and the licence", async () => {
    const doc = await payload.create({
      collection: "media",
      data: { alt: "A single pixel, with its credit", attribution },
      filePath: upload("with-attribution.png", PNG),
    })
    created.push(doc.id)
    const found = await payload.findByID({
      collection: "media",
      id: doc.id,
      depth: 0,
    })
    expect(found.attribution).toEqual(attribution)
  })

  it("rejects a source URL that is not an http(s) link", async () => {
    await expect(
      payload.create({
        collection: "media",
        data: {
          alt: "A single pixel, with a bad link",
          attribution: { ...attribution, sourceUrl: "javascript:alert(1)" },
        },
        filePath: upload("bad-link.png", PNG),
      })
    ).rejects.toThrow()
  })
})

describe("Media SVG", () => {
  it("accepts an SVG, for a Brand's wordmark", async () => {
    const doc = await payload.create({
      collection: "media",
      data: { alt: "A mark" },
      filePath: upload("mark.svg", SVG),
    })
    created.push(doc.id)
    expect(doc.mimeType).toBe("image/svg+xml")
  })

  it("rejects an SVG that carries a script", async () => {
    await expect(
      payload.create({
        collection: "media",
        data: { alt: "A scripted mark" },
        filePath: upload("scripted.svg", SCRIPTED_SVG),
      })
    ).rejects.toThrow()
  })
})
