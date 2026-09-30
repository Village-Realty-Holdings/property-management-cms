import type { CollectionConfig, Config, Field } from "payload"
import { describe, expect, it } from "vitest"

import { Media } from "./collections/Media"
import { mediaFileURL, storagePlugins } from "./storage"

const s3Env = {
  S3_BUCKET: "sites",
  S3_ENDPOINT: "http://localhost:9100",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_PUBLIC_URL: "https://cdn.example.test/",
}

const upload = (slug: string): CollectionConfig => ({
  slug,
  upload: true,
  fields: [{ name: "alt", type: "text" }],
})

/** Runs the storage plugins over a config holding `collections`. */
function withStorage(
  collections: CollectionConfig[],
  env: Record<string, string | undefined>,
  extraSlugs?: string[]
): CollectionConfig[] {
  let config = { collections } as unknown as Config
  for (const plugin of storagePlugins(env, extraSlugs)) {
    config = plugin(config) as unknown as Config
  }
  return config.collections as CollectionConfig[]
}

const fieldNames = (collection: CollectionConfig | undefined) =>
  (collection?.fields ?? []).flatMap((f: Field) =>
    "name" in f ? [f.name] : []
  )

const prefixDefault = (collection: CollectionConfig | undefined) => {
  const field = collection?.fields.find(
    (f) => "name" in f && f.name === "prefix"
  )
  return field && "defaultValue" in field ? field.defaultValue : undefined
}

describe("storagePlugins", () => {
  it("adds nothing when no S3 variable is set", () => {
    expect(storagePlugins({})).toEqual([])
  })

  it("refuses a partly configured store", () => {
    expect(() => storagePlugins({ S3_BUCKET: "sites" })).toThrow(/partly/)
  })

  it("stores each Site's Media under its schema, in one shared bucket", () => {
    const [media] = withStorage([upload("media")], {
      ...s3Env,
      DATABASE_SCHEMA: "avada",
    })
    expect(prefixDefault(media)).toBe("avada")
  })

  it("stores Media at the bucket root when the schema is unset", () => {
    const [media] = withStorage([upload("media")], s3Env)
    expect(prefixDefault(media)).toBeUndefined()
  })

  it("rejects a schema that can't be a folder name", () => {
    expect(() =>
      storagePlugins({ ...s3Env, DATABASE_SCHEMA: "../other" })
    ).toThrow(/DATABASE_SCHEMA/)
  })

  it("covers more upload collections when asked, under the same prefix", () => {
    const [media, fontFiles] = withStorage(
      [upload("media"), upload("font-files")],
      { ...s3Env, DATABASE_SCHEMA: "avada" },
      ["media", "font-files"]
    )
    expect(prefixDefault(media)).toBe("avada")
    expect(prefixDefault(fontFiles)).toBe("avada")
    expect(fieldNames(fontFiles)).toContain("_objectKey")
  })

  it("leaves other upload collections on local disk", () => {
    const [, other] = withStorage([upload("media"), upload("other")], s3Env)
    expect(fieldNames(other)).not.toContain("_objectKey")
  })
})

describe("the media table", () => {
  it("has the same columns with and without S3, so one migration fits both", () => {
    const [withS3] = withStorage([Media], {
      ...s3Env,
      DATABASE_SCHEMA: "avada",
    })
    const [withS3NoSchema] = withStorage([Media], s3Env)
    const [local] = withStorage([Media], {})
    // Payload adds `url` to every upload collection itself; the plugin only
    // re-declares it with its hooks.
    const names = (c: CollectionConfig | undefined) =>
      fieldNames(c)
        .filter((name) => name !== "url")
        .sort()
    expect(names(withS3)).toEqual(names(local))
    expect(names(withS3NoSchema)).toEqual(names(local))
    expect(names(local)).toEqual(
      expect.arrayContaining(["_objectKey", "prefix"])
    )
  })
})

describe("mediaFileURL", () => {
  it("joins the public URL, prefix and encoded filename", () => {
    expect(
      mediaFileURL("https://cdn.example.test/", "avada", "my logo.png")
    ).toBe("https://cdn.example.test/avada/my%20logo.png")
  })

  it("leaves out a missing prefix", () => {
    expect(mediaFileURL("https://cdn.example.test", undefined, "a.png")).toBe(
      "https://cdn.example.test/a.png"
    )
  })
})
