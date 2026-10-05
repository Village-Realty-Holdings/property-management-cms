import { describe, expect, it, vi } from "vitest"

const context = vi.hoisted(() => ({
  env: {} as Record<string, unknown>,
}))
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: context.env }),
}))

import { databaseUrlForRuntime } from "./database"

const ENV = { DATABASE_URL: "postgres://direct/db" }

describe("databaseUrlForRuntime", () => {
  it("is DATABASE_URL on Node", async () => {
    context.env = {
      HYPERDRIVE: { connectionString: "postgres://hyperdrive/db" },
    }
    expect(await databaseUrlForRuntime(ENV, "node")).toBe(
      "postgres://direct/db"
    )
  })

  it("is the Hyperdrive binding's on Workers", async () => {
    context.env = {
      HYPERDRIVE: { connectionString: "postgres://hyperdrive/db" },
    }
    expect(await databaseUrlForRuntime(ENV, "workers")).toBe(
      "postgres://hyperdrive/db"
    )
  })

  it("falls back to DATABASE_URL on a Worker without the binding", async () => {
    context.env = {}
    expect(await databaseUrlForRuntime(ENV, "workers")).toBe(
      "postgres://direct/db"
    )
  })
})
