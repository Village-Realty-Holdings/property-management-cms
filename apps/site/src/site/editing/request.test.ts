import { beforeEach, describe, expect, it, vi } from "vitest"

/** What `payload.auth` does in the test at hand. */
const session = vi.hoisted(() => ({
  read: (): Promise<unknown> => Promise.resolve({ user: null }),
  calls: 0,
}))
vi.mock("@payload-config", () => ({ default: {} }))
vi.mock("payload", () => ({
  getPayload: async () => ({
    auth: () => {
      session.calls++
      return session.read()
    },
  }),
}))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
// `cache` dedupes per request; each test is its own request.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}))

import { isEditingCanvasRequest, isStaffRequest } from "./request"

const signedInAs = (collection: string | null) => {
  session.read = () =>
    Promise.resolve({ user: collection ? { collection } : null })
}

beforeEach(() => {
  session.calls = 0
  signedInAs(null)
})

describe("isStaffRequest", () => {
  it("is true for a signed-in Staff User", async () => {
    signedInAs("users")
    expect(await isStaffRequest()).toBe(true)
  })

  it("is false for a visitor", async () => {
    expect(await isStaffRequest()).toBe(false)
  })

  it("is false for a session of any other kind", async () => {
    signedInAs("other")
    expect(await isStaffRequest()).toBe(false)
  })

  it("is false, not an error, when the session cannot be read", async () => {
    session.read = () => Promise.reject(new Error("database down"))
    expect(await isStaffRequest()).toBe(false)
  })
})

describe("isEditingCanvasRequest", () => {
  it("needs both the flag and a Staff User", async () => {
    signedInAs("users")
    expect(await isEditingCanvasRequest({ __edit: "1" })).toBe(true)
    expect(await isEditingCanvasRequest({})).toBe(false)

    signedInAs(null)
    expect(await isEditingCanvasRequest({ __edit: "1" })).toBe(false)
  })

  it("does not look the session up when there is no flag", async () => {
    await isEditingCanvasRequest({})
    expect(session.calls).toBe(0)
  })
})
