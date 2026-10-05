import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { loadUserRows, removeUserAs } from "./users"

let t: TestPayload
type Access = { overrideAccess: false; user: User & { collection: "users" } }
let me: Access
let sam: User

const asUser = (user: User): Access => ({
  overrideAccess: false,
  user: { ...user, collection: "users" },
})

beforeAll(async () => {
  t = await getTestPayload()
  const mine = await t.payload.create({
    collection: "users",
    data: { email: "robin@awayday.test", name: "Robin", entraOid: "robin" },
  })
  me = asUser(mine)
  sam = await t.payload.create({
    collection: "users",
    data: { email: "sam@awayday.test", name: "Sam", entraOid: "sam" },
  })
  await t.payload.create({
    collection: "users",
    data: { email: "nameless@awayday.test", entraOid: "nameless" },
  })
})

afterAll(async () => {
  await t?.teardown()
})

describe("the Users list", () => {
  it("lists every User by name, falling back to email, and marks you", async () => {
    const rows = await loadUserRows(t.payload, me)
    expect(rows.map((r) => [r.name, r.email, r.isYou])).toEqual([
      ["", "nameless@awayday.test", false],
      ["Robin", "robin@awayday.test", true],
      ["Sam", "sam@awayday.test", false],
    ])
  })
})

describe("removing a User", () => {
  it("refuses your own id and keeps you", async () => {
    const result = await removeUserAs(t.payload, me, me.user.id)
    expect(result).toEqual({ ok: false, message: "You can’t remove yourself." })
    expect(
      await t.payload.findByID({ collection: "users", id: me.user.id })
    ).toBeTruthy()
  })

  it("refuses an id that isn't a User", async () => {
    for (const id of [0, -1, 1.5, "7", null, 999999]) {
      const result = await removeUserAs(t.payload, me, id)
      expect(result).toEqual({
        ok: false,
        message: "That User no longer exists.",
      })
    }
  })

  it("removes another User, even one who has saved something", async () => {
    await t.payload.create({
      collection: "layouts",
      data: { name: "Sam's Layout", updatedBy: sam.id } as never,
      overrideAccess: true,
    })
    const result = await removeUserAs(t.payload, me, sam.id)
    expect(result).toEqual({ ok: true, message: "Removed Sam." })
    const { totalDocs } = await t.payload.find({
      collection: "users",
      where: { id: { equals: sam.id } },
    })
    expect(totalDocs).toBe(0)
  })

  it("says it was already gone when the User has been removed", async () => {
    expect(await removeUserAs(t.payload, me, sam.id)).toEqual({
      ok: false,
      message: "That User no longer exists.",
    })
  })
})

describe("the Users collection's delete access", () => {
  it("refuses your own id over the Local API as you, by id and in bulk", async () => {
    await expect(
      t.payload.delete({ collection: "users", id: me.user.id, ...me })
    ).rejects.toThrow()
    await t.payload.delete({
      collection: "users",
      where: { email: { like: "@awayday.test" } },
      ...me,
    })
    const { docs } = await t.payload.find({ collection: "users" })
    expect(docs.map((d) => d.email)).toEqual(["robin@awayday.test"])
  })
})
