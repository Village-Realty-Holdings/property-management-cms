import { describe, expect, it } from "vitest"

import { resolveSeedTarget } from "./seed"

const env = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/pm_milestone",
  DATABASE_SCHEMA: "avada",
}

describe("resolveSeedTarget", () => {
  it("names the database and the schema to seed", () => {
    expect(resolveSeedTarget(env)).toEqual({
      databaseUrl: env.DATABASE_URL,
      database: "pm_milestone",
      schema: "avada",
      site: "avada",
    })
  })

  it("refuses the property_management_site database", () => {
    expect(() =>
      resolveSeedTarget({
        ...env,
        DATABASE_URL:
          "postgres://postgres:postgres@localhost:5432/property_management_site",
      })
    ).toThrow(/property_management_site/)
  })

  it("needs a DATABASE_URL", () => {
    expect(() => resolveSeedTarget({ ...env, DATABASE_URL: "" })).toThrow(
      /DATABASE_URL/
    )
  })

  it("needs a DATABASE_SCHEMA: a seed never fills the public schema", () => {
    expect(() => resolveSeedTarget({ ...env, DATABASE_SCHEMA: "" })).toThrow(
      /DATABASE_SCHEMA/
    )
    expect(() =>
      resolveSeedTarget({ ...env, DATABASE_SCHEMA: "public" })
    ).toThrow(/DATABASE_SCHEMA/)
  })

  it("needs a schema that has a seed, and lists the ones that do", () => {
    expect(() =>
      resolveSeedTarget({ ...env, DATABASE_SCHEMA: "ms_seed_runner" })
    ).toThrow(/warren_beach, avada, beachside/)
  })

  it("lets a scratch ms_ schema borrow a Site's seed with SEED_SITE", () => {
    expect(
      resolveSeedTarget({
        ...env,
        DATABASE_SCHEMA: "ms_seed_runner",
        SEED_SITE: "beachside",
      })
    ).toMatchObject({ schema: "ms_seed_runner", site: "beachside" })
  })

  it("does not let SEED_SITE point a real schema at another Site's seed", () => {
    expect(() => resolveSeedTarget({ ...env, SEED_SITE: "beachside" })).toThrow(
      /SEED_SITE/
    )
    expect(() =>
      resolveSeedTarget({
        ...env,
        DATABASE_SCHEMA: "ms_seed_runner",
        SEED_SITE: "nope",
      })
    ).toThrow(/warren_beach, avada, beachside/)
  })

  it("rejects a schema name the Site can't use", () => {
    expect(() =>
      resolveSeedTarget({ ...env, DATABASE_SCHEMA: "warren-beach" })
    ).toThrow(/DATABASE_SCHEMA/)
  })
})
