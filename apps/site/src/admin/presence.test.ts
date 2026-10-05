import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { truncateTables } from "../test/truncateTables"
import {
  parsePresenceTarget,
  presenceBody,
  presenceKey,
  PRESENCE_TTL_MS,
  readPresenceAs,
  releasePresenceAs,
  touchPresenceAs,
  type PresenceTarget,
} from "./presence"

/** Presence: who else is editing, stored as Payload's document locks. */

type Access = { overrideAccess: false; user: User & { collection: "users" } }

let t: TestPayload
let payload: Payload
let asSam: Access
let asAda: Access
let pageTarget: PresenceTarget
let layoutTarget: PresenceTarget
const theme: PresenceTarget = { kind: "theme" }

async function makeUser(email: string, name?: string): Promise<Access> {
  const user = await payload.create({
    collection: "users",
    data: { email, name, entraOid: email },
  })
  return { overrideAccess: false, user: { ...user, collection: "users" } }
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  asSam = await makeUser("sam@awayday.test", "Sam Taylor")
  asAda = await makeUser("ada@awayday.test")
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(
    payload,
    "payload_locked_documents",
    "pages",
    "_pages_v",
    "layouts",
    "_layouts_v"
  )
  const page = await payload.create({
    collection: "pages",
    data: { title: "Home", path: "/", _status: "published" },
    ...asSam,
  })
  const layout = await payload.create({
    collection: "layouts",
    data: { name: "Main" } as never,
    ...asSam,
  })
  pageTarget = { kind: "page", id: page.id }
  layoutTarget = { kind: "layout", id: layout.id }
})

const rows = async () =>
  (
    await payload.find({
      collection: "payload-locked-documents",
      pagination: false,
      depth: 0,
    })
  ).docs

describe("presence on a Page", () => {
  it("shows who holds it to everyone else", async () => {
    expect(await touchPresenceAs(payload, asSam, pageTarget)).toEqual({
      status: "yours",
    })
    expect(await readPresenceAs(payload, asAda, pageTarget)).toEqual({
      status: "other",
      name: "Sam Taylor",
    })
    expect(await readPresenceAs(payload, asSam, pageTarget)).toEqual({
      status: "yours",
    })
  })

  it("names a User with no name by their email", async () => {
    await touchPresenceAs(payload, asAda, pageTarget)
    expect(await readPresenceAs(payload, asSam, pageTarget)).toEqual({
      status: "other",
      name: "ada@awayday.test",
    })
  })

  it("leaves the holder alone when another User touches", async () => {
    await touchPresenceAs(payload, asSam, pageTarget)
    expect(await touchPresenceAs(payload, asAda, pageTarget)).toEqual({
      status: "other",
      name: "Sam Taylor",
    })
    const all = await rows()
    expect(all).toHaveLength(1)
    expect(all[0]?.user).toMatchObject({ value: asSam.user.id })
  })

  it("moves the hold on Take over, and tells the old holder", async () => {
    await touchPresenceAs(payload, asSam, pageTarget)
    expect(
      await touchPresenceAs(payload, asAda, pageTarget, { takeOver: true })
    ).toEqual({ status: "yours" })
    expect(await touchPresenceAs(payload, asSam, pageTarget)).toMatchObject({
      status: "other",
      name: "ada@awayday.test",
    })
    expect(await rows()).toHaveLength(1)
  })

  it("ignores rows older than five minutes", async () => {
    await touchPresenceAs(payload, asSam, pageTarget)
    const later = new Date(Date.now() + PRESENCE_TTL_MS + 1000)
    expect(
      await readPresenceAs(payload, asAda, pageTarget, { now: later })
    ).toEqual({ status: "free" })
    expect(
      await touchPresenceAs(payload, asAda, pageTarget, { now: later })
    ).toEqual({ status: "yours" })
    const all = await rows()
    expect(all).toHaveLength(1)
    expect(all[0]?.user).toMatchObject({ value: asAda.user.id })
  })

  it("is an upsert: a heartbeat refreshes the one row", async () => {
    await touchPresenceAs(payload, asSam, pageTarget)
    const [first] = await rows()
    await new Promise((resolve) => setTimeout(resolve, 20))
    await touchPresenceAs(payload, asSam, pageTarget)
    const all = await rows()
    expect(all).toHaveLength(1)
    expect(all[0]?.id).toBe(first?.id)
    expect(new Date(all[0]!.updatedAt).getTime()).toBeGreaterThan(
      new Date(first!.updatedAt).getTime()
    )
  })

  it("releases only the caller's own row", async () => {
    await touchPresenceAs(payload, asSam, pageTarget)
    await releasePresenceAs(payload, asAda, pageTarget)
    expect(await readPresenceAs(payload, asAda, pageTarget)).toMatchObject({
      status: "other",
    })
    await releasePresenceAs(payload, asSam, pageTarget)
    expect(await readPresenceAs(payload, asAda, pageTarget)).toEqual({
      status: "free",
    })
  })

  it("is cleared by a save, which is why the editor touches again", async () => {
    await touchPresenceAs(payload, asSam, pageTarget)
    await payload.update({
      collection: "pages",
      id: (pageTarget as { id: number }).id,
      data: { title: "Home 2" },
      ...asAda,
    })
    expect(await readPresenceAs(payload, asAda, pageTarget)).toEqual({
      status: "free",
    })
    expect(await touchPresenceAs(payload, asSam, pageTarget)).toEqual({
      status: "yours",
    })
  })
})

describe("targets", () => {
  it("keeps a Page, a Layout and the Theme apart", async () => {
    // Their ids may well coincide.
    await touchPresenceAs(payload, asSam, pageTarget)
    expect(await readPresenceAs(payload, asAda, layoutTarget)).toEqual({
      status: "free",
    })
    expect(await readPresenceAs(payload, asAda, theme)).toEqual({
      status: "free",
    })

    await touchPresenceAs(payload, asAda, layoutTarget)
    await touchPresenceAs(payload, asAda, theme)
    expect(await readPresenceAs(payload, asSam, pageTarget)).toEqual({
      status: "yours",
    })
    expect(await readPresenceAs(payload, asSam, layoutTarget)).toMatchObject({
      status: "other",
    })
    expect(await readPresenceAs(payload, asSam, theme)).toMatchObject({
      status: "other",
    })
    expect(await rows()).toHaveLength(3)
  })

  it("fails for a Page that no longer exists", async () => {
    await expect(
      touchPresenceAs(payload, asSam, { kind: "page", id: 999_999 })
    ).rejects.toThrow()
  })
})

describe("parsePresenceTarget", () => {
  it("accepts the three kinds", () => {
    expect(parsePresenceTarget({ kind: "page", id: 3 })).toEqual({
      kind: "page",
      id: 3,
    })
    expect(parsePresenceTarget({ kind: "layout", id: "7" })).toEqual({
      kind: "layout",
      id: 7,
    })
    expect(parsePresenceTarget({ kind: "theme" })).toEqual({ kind: "theme" })
  })

  it.each([
    [{ kind: "post", id: 1 }],
    [{ kind: "page", id: 0 }],
    [{ kind: "page", id: -1 }],
    [{ kind: "page", id: 1.5 }],
    [{ kind: "layout", id: "abc" }],
    [{ kind: "page" }],
    [{ kind: "layout", id: null }],
    [null],
    ["page"],
  ])("rejects %j", (input) => {
    expect(parsePresenceTarget(input)).toBeNull()
  })
})

describe("the beacon body and key", () => {
  it("writes the target as a form body", () => {
    expect(presenceBody({ kind: "page", id: 3 }).toString()).toBe(
      "kind=page&id=3"
    )
    expect(presenceBody({ kind: "theme" }).toString()).toBe("kind=theme")
  })

  it("keys each target apart", () => {
    expect(presenceKey({ kind: "page", id: 12 })).toBe("page:12")
    expect(presenceKey({ kind: "layout", id: 3 })).toBe("layout:3")
    expect(presenceKey({ kind: "theme" })).toBe("theme")
  })
})
