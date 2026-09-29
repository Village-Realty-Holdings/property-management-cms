import type { CollectionConfig, Config } from "payload"
import { describe, expect, it } from "vitest"

import { Media } from "./collections/Media"
import { mediaFileURL, storagePlugins } from "./storage"

const s3Env = {
  S3_BUCKET: "media",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_PUBLIC_URL: "https://media.example.com/",
}

/** Runs the plugins over a config holding only Media (no network). */
async function applied(env: Record<string, string>) {
  let config: Config = { collections: [{ ...Media }] } as Config
  for (const plugin of storagePlugins(env)) config = await plugin(config)
  return config.collections![0] as CollectionConfig
}

describe("storagePlugins", () => {
  it("returns no plugin without object storage env (local disk)", () => {
    expect(storagePlugins({})).toEqual([])
  })

  it("throws when object storage is only partly configured", () => {
    expect(() => storagePlugins({ S3_BUCKET: "media" })).toThrow(
      /S3_ENDPOINT/
    )
  })

  it("stores Media in S3 with public per-Site URLs when configured", async () => {
    expect(storagePlugins(s3Env)).toHaveLength(1)
    const media = await applied(s3Env)
    const upload = media.upload as Exclude<CollectionConfig["upload"], boolean>
    expect(upload?.disableLocalStorage).toBe(true)
    expect(upload?.adapter).toBe("s3")

    const url = media.fields.find((f) => "name" in f && f.name === "url")
    const afterRead = (url as { hooks?: { afterRead?: unknown[] } }).hooks
      ?.afterRead?.[0] as (args: object) => Promise<string>
    await expect(
      afterRead({ data: { filename: "hero 1.jpg", prefix: "site-a" } })
    ).resolves.toBe("https://media.example.com/site-a/hero%201.jpg")
  })
})

describe("mediaFileURL", () => {
  it("joins the public URL, prefix and filename", () => {
    expect(mediaFileURL("https://m.example.com", "site-a", "a.png")).toBe(
      "https://m.example.com/site-a/a.png"
    )
    expect(mediaFileURL("https://m.example.com/", "", "a.png")).toBe(
      "https://m.example.com/a.png"
    )
  })
})
