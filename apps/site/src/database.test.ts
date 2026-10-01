import { describe, expect, it } from "vitest"

import { siteSchema } from "./database"

describe("siteSchema", () => {
  it("is DATABASE_SCHEMA", () => {
    expect(siteSchema({ DATABASE_SCHEMA: "warren_beach" })).toBe("warren_beach")
    expect(siteSchema({ DATABASE_SCHEMA: "ms_1_per_site_schema" })).toBe(
      "ms_1_per_site_schema"
    )
  })

  it("is undefined when unset or empty, meaning the public schema", () => {
    expect(siteSchema({})).toBeUndefined()
    expect(siteSchema({ DATABASE_SCHEMA: "" })).toBeUndefined()
    expect(siteSchema({ DATABASE_SCHEMA: "  " })).toBeUndefined()
  })

  it.each(["../x", "Avada", "a b", "a-b", "1abc", 'a"b', "x".repeat(64)])(
    "rejects %j, which couldn't be a schema, folder and bucket prefix",
    (name) => {
      expect(() => siteSchema({ DATABASE_SCHEMA: name })).toThrow(
        /DATABASE_SCHEMA/
      )
    }
  )
})
