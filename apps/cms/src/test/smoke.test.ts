import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { seedBreakGlassAdmin } from "../breakGlass"
import { getTestPayload, type TestPayload } from "./getTestPayload"

let t: TestPayload

beforeAll(async () => {
  t = await getTestPayload()
})

afterAll(() => t?.teardown())

describe("scaffold smoke test", () => {
  it("creates a user and logs in with the Local API", async () => {
    await t.payload.create({
      collection: "users",
      data: { email: "smoke@example.com", password: "smoke-password" },
    })

    const result = await t.payload.login({
      collection: "users",
      data: { email: "smoke@example.com", password: "smoke-password" },
    })

    expect(result.token).toBeTruthy()
    expect(result.user?.email).toBe("smoke@example.com")
  })

  it("only seeds the break-glass admin when there are no users", async () => {
    const created = await seedBreakGlassAdmin(t.payload, {
      email: "glass@example.com",
      password: "glass-password",
    })

    expect(created).toBe(false)
  })
})

describe("break-glass admin", () => {
  let empty: TestPayload

  beforeAll(async () => {
    empty = await getTestPayload({
      breakGlass: { email: "glass@example.com", password: "glass-password" },
    })
  })

  afterAll(() => empty?.teardown())

  it("is created on init when there are no users", async () => {
    const result = await empty.payload.login({
      collection: "users",
      data: { email: "glass@example.com", password: "glass-password" },
    })

    expect(result.token).toBeTruthy()
  })
})
