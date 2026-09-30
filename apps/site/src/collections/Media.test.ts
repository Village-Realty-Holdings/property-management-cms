import path from "node:path"

import { describe, expect, it } from "vitest"

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
