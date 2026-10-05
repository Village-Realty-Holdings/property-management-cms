import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  createUser,
  ensureRegistry,
  findUser,
  registryDb,
  type Db,
} from "../registry"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { passwordSignIn } from "."

const ORIGIN = "http://site.test"
const PASSWORD = "correct horse battery"

let t: TestPayload
let db: Db

beforeAll(async () => {
  t = await getTestPayload()
  db = registryDb(t.payload)
  await ensureRegistry(db)
})

afterAll(async () => {
  await t?.teardown()
})

const signIn = (email: string) =>
  passwordSignIn(
    new Request(`${ORIGIN}/auth/password`, {
      method: "POST",
      headers: { origin: ORIGIN },
      body: new URLSearchParams({ email, password: PASSWORD }),
    }),
    t.payload
  )

describe("the first Super Admin", () => {
  it("is whoever signs in first while the Registry has none", async () => {
    await createUser(db, { email: "first@awayday.example", password: PASSWORD })
    await createUser(db, {
      email: "second@awayday.example",
      password: PASSWORD,
    })

    const first = await signIn("first@awayday.example")
    expect(first.headers.get("location")).toBe("/admin")
    expect(
      await findUser(db, { email: "first@awayday.example" })
    ).toMatchObject({ isSuperAdmin: true })

    const second = await signIn("second@awayday.example")
    expect(second.headers.get("location")).toBe(
      "/admin/sign-in?error=not-assigned"
    )
    expect(
      await findUser(db, { email: "second@awayday.example" })
    ).toMatchObject({ isSuperAdmin: false })
  })
})
