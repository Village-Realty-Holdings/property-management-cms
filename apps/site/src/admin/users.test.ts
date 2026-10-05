import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { registerThisSite } from "../auth"
import type { User } from "../payload-types"
import {
  createUser,
  findUser,
  listUsers,
  registerSite,
  registryDb,
  type Db,
  type RegistrySite,
} from "../registry"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { registeredUser } from "../test/registeredUser"
import {
  deleteUserAs,
  loadUsersScreen,
  otherSitesFor,
  saveUserAs,
} from "./users"

let t: TestPayload
let db: Db
type Access = { overrideAccess: false; user: User & { collection: "users" } }
let admin: Access
let editor: Access
let here: RegistrySite
let other: RegistrySite

const asUser = (user: User): Access => ({
  overrideAccess: false,
  user: { ...user, collection: "users" },
})

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    for (const one of [value].flat()) data.append(key, one)
  }
  return data
}

beforeAll(async () => {
  t = await getTestPayload()
  db = registryDb(t.payload)
  admin = asUser(
    await registeredUser(t.payload, {
      email: "robin@awayday.test",
      name: "Robin",
    })
  )
  here = await registerThisSite(t.payload)
  other = await registerSite(db, {
    schema: "other_site",
    name: "Other Site",
    url: "https://other.example",
  })
  const sam = await createUser(db, { email: "sam@awayday.test", name: "Sam" })
  await saveUserAs(
    t.payload,
    admin,
    sam.id,
    form({ name: "Sam", site: String(here.id) })
  )
  editor = asUser(
    await registeredUser(t.payload, { email: "sam@awayday.test" })
  )
})

afterAll(async () => {
  await t?.teardown()
})

describe("the Users screen", () => {
  it("lets a Super Admin see and manage everyone", async () => {
    const screen = await loadUsersScreen(t.payload, admin)
    expect(screen.canManage).toBe(true)
    expect(screen.sites.map((s) => s.id)).toEqual(
      expect.arrayContaining([here.id, other.id])
    )
    expect(
      screen.rows.find((r) => r.email === "robin@awayday.test")
    ).toMatchObject({
      isYou: true,
      isSuperAdmin: true,
    })
  })

  it("shows anyone else who can use this Site, and lets them change nothing", async () => {
    const screen = await loadUsersScreen(t.payload, editor)
    expect(screen.canManage).toBe(false)
    expect(screen.rows.map((r) => r.email)).toEqual(
      expect.arrayContaining(["robin@awayday.test", "sam@awayday.test"])
    )
    expect(
      await saveUserAs(
        t.payload,
        editor,
        null,
        form({ email: "x@awayday.test" })
      )
    ).toMatchObject({ ok: false })
    expect(await findUser(db, { email: "x@awayday.test" })).toBeNull()
  })
})

describe("managing Users", () => {
  it("adds a User with a password and the Sites they may use", async () => {
    const result = await saveUserAs(
      t.payload,
      admin,
      null,
      form({
        email: "New@Awayday.test",
        name: "New Person",
        password: "a long enough password",
        site: [String(here.id), String(other.id), "99999"],
      })
    )
    expect(result).toMatchObject({ ok: true, message: "Added New Person." })
    const added = (await listUsers(db)).find(
      (u) => u.email === "new@awayday.test"
    )
    expect(added).toMatchObject({ hasPassword: true, isSuperAdmin: false })
    expect(added?.siteIds.sort()).toEqual([here.id, other.id].sort())
  })

  it("refuses a short password and a taken email", async () => {
    expect(
      await saveUserAs(
        t.payload,
        admin,
        null,
        form({ email: "short@awayday.test", password: "short" })
      )
    ).toMatchObject({
      ok: false,
      fieldErrors: { password: expect.any(String) },
    })
    expect(
      await saveUserAs(
        t.payload,
        admin,
        null,
        form({ email: "sam@awayday.test" })
      )
    ).toMatchObject({ ok: false, fieldErrors: { email: expect.any(String) } })
  })

  it("takes Site Access away, disables and removes a password", async () => {
    const user = await createUser(db, {
      email: "change@awayday.test",
      password: "a long enough password",
    })
    await saveUserAs(t.payload, admin, user.id, form({ site: String(here.id) }))
    const result = await saveUserAs(
      t.payload,
      admin,
      user.id,
      form({ name: "Changed", disabled: "on", removePassword: "on" })
    )
    expect(result).toMatchObject({ ok: true })
    const changed = (await listUsers(db)).find((u) => u.id === user.id)
    expect(changed).toMatchObject({
      name: "Changed",
      disabled: true,
      hasPassword: false,
      siteIds: [],
    })
  })

  it("won't let a Super Admin disable, demote or delete themselves", async () => {
    const id = admin.user.registryUserId
    expect(
      await saveUserAs(
        t.payload,
        admin,
        id,
        form({ disabled: "on", superAdmin: "on" })
      )
    ).toMatchObject({ ok: false })
    expect(await saveUserAs(t.payload, admin, id, form({}))).toMatchObject({
      ok: false,
    })
    expect(await deleteUserAs(t.payload, admin, id)).toMatchObject({
      ok: false,
    })
    expect(await findUser(db, { id })).toMatchObject({
      isSuperAdmin: true,
      disabled: false,
    })
  })

  it("deletes a User from the Registry", async () => {
    const user = await createUser(db, { email: "gone@awayday.test" })
    expect(await deleteUserAs(t.payload, admin, user.id)).toMatchObject({
      ok: true,
    })
    expect(await findUser(db, { id: user.id })).toBeNull()
  })
})

describe("the Site switcher", () => {
  it("lists the other Sites the User may use", async () => {
    expect((await otherSitesFor(t.payload, admin)).map((s) => s.id)).toContain(
      other.id
    )
    expect(await otherSitesFor(t.payload, editor)).toEqual([])
  })
})
