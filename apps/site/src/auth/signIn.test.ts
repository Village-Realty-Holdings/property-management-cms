import type { JWTPayload } from "jose"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  createUser,
  ensureRegistry,
  findUser,
  grantSite,
  registerSite,
  registryDb,
  revokeSite,
  updateUser,
  type Db,
  type RegistrySite,
} from "../registry"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import {
  assertNoDevSignInInProduction,
  DEV_USER,
  devSignIn,
  devSignInEnabled,
  finishHandoff,
  finishSignIn,
  passwordSignIn,
  readEntraConfig,
  SESSION_COOKIE,
  SITE_USER_ROLE,
  signOut,
  startHandoff,
  startSignIn,
  thisSiteSchema,
  type EntraConfig,
} from "."
import { startMockIssuer, type MockIssuer } from "./test/mockIssuer"

const ORIGIN = "http://site.test"
const DEV_ENV = { NODE_ENV: "development", DEV_SIGN_IN: "1" }

let t: TestPayload
let mock: MockIssuer
let config: EntraConfig
let db: Db
let here: RegistrySite

beforeAll(async () => {
  t = await getTestPayload()
  db = registryDb(t.payload)
  await ensureRegistry(db)
  // Someone is already Super Admin, so the Users these tests sign in aren't.
  await createUser(db, { email: "first@awayday.example", isSuperAdmin: true })
  here = await registerSite(db, {
    schema: thisSiteSchema(t.payload),
    url: ORIGIN,
  })
  mock = await startMockIssuer()
  config = {
    tenantId: mock.tenantId,
    clientId: mock.clientId,
    clientSecret: mock.clientSecret,
    issuer: mock.issuer,
  }
})

afterAll(async () => {
  await mock?.close()
  await t?.teardown()
})

/** A Registry User with Site Access to this Site, as a Super Admin adds one. */
async function allowed(email: string, password?: string) {
  const user = await createUser(db, { email, password })
  await grantSite(db, user.id, here.id)
  return user
}

let oidCounter = 0
beforeEach(async () => {
  oidCounter += 1
  mock.user = {
    oid: `oid-${oidCounter}`,
    email: `Staff${oidCounter}@Awayday.example`,
    name: `User ${oidCounter}`,
    roles: [SITE_USER_ROLE],
  }
  await allowed(`staff${oidCounter}@awayday.example`)
})

const cookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ")

/** Runs the whole flow against the mock issuer and returns the callback's response. */
async function signIn({
  claims = {},
  startPath = "/auth/entra/start",
  tamper,
}: {
  claims?: JWTPayload
  startPath?: string
  tamper?: (callback: URL, cookie: string) => { url: URL; cookie: string }
} = {}): Promise<Response> {
  mock.user = { ...mock.user, ...claims }
  const start = await startSignIn(
    new Request(`${ORIGIN}${startPath}`),
    t.payload,
    config
  )
  expect(start.status).toBe(302)
  const authorize = new URL(start.headers.get("location") ?? "")
  expect(authorize.origin + authorize.pathname).toBe(`${mock.issuer}/authorize`)
  expect(authorize.searchParams.get("code_challenge_method")).toBe("S256")
  expect(authorize.searchParams.get("redirect_uri")).toBe(
    `${ORIGIN}/auth/entra/callback`
  )

  const fromEntra = await fetch(authorize, { redirect: "manual" })
  let url = new URL(fromEntra.headers.get("location") ?? "")
  let cookie = cookieHeader(start)
  if (tamper) ({ url, cookie } = tamper(url, cookie))

  return finishSignIn(
    new Request(url, { headers: { cookie } }),
    t.payload,
    config
  )
}

const sessionCookie = (response: Response) =>
  response.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))

/** The User Payload authenticates from the response's cookies. */
async function me(response: Response) {
  const { user } = await t.payload.auth({
    headers: new Headers({ cookie: cookieHeader(response) }),
  })
  return user
}

const rejectedWith = (response: Response, error: string) => {
  expect(response.status).toBe(302)
  expect(response.headers.get("location")).toBe(`/admin/sign-in?error=${error}`)
  expect(sessionCookie(response)).toBeUndefined()
}

describe("Entra sign-in", () => {
  it("creates a User and a working session", async () => {
    const response = await signIn()

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("/admin")
    expect(sessionCookie(response)).toMatch(/HttpOnly/)
    // The single-use flow cookie is cleared.
    expect(
      response.headers
        .getSetCookie()
        .some((c) => c.startsWith("entra-signin=;") && /Max-Age=0/.test(c))
    ).toBe(true)

    const registryUser = await findUser(db, {
      email: `staff${oidCounter}@awayday.example`,
    })
    expect(registryUser).toMatchObject({ entraOid: `oid-${oidCounter}` })
    expect(await me(response)).toMatchObject({
      collection: "users",
      email: `staff${oidCounter}@awayday.example`,
      name: `User ${oidCounter}`,
      registryUserId: registryUser?.id,
    })
  })

  it("signs the same Entra user into the same User", async () => {
    const first = await me(await signIn())
    const second = await me(
      await signIn({ claims: { email: "renamed@awayday.example" } })
    )
    expect(second?.id).toBe(first?.id)
    expect(second).toMatchObject({ email: "renamed@awayday.example" })
    const { totalDocs } = await t.payload.count({
      collection: "users",
      where: { email: { equals: `staff${oidCounter}@awayday.example` } },
    })
    expect(totalDocs).toBe(0)
  })

  it("rejects users without the required app role", async () => {
    rejectedWith(await signIn({ claims: { roles: [] } }), "not-allowed")
    rejectedWith(
      await signIn({ claims: { roles: ["cms_user"] } }),
      "not-allowed"
    )
    const { totalDocs } = await t.payload.count({
      collection: "users",
      where: { email: { equals: `staff${oidCounter}@awayday.example` } },
    })
    expect(totalDocs).toBe(0)
  })

  it("rejects an Entra user with no Site Access, and remembers them", async () => {
    rejectedWith(
      await signIn({ claims: { email: "newcomer@awayday.example" } }),
      "not-assigned"
    )
    expect(
      await findUser(db, { email: "newcomer@awayday.example" })
    ).toMatchObject({ entraOid: `oid-${oidCounter}`, isSuperAdmin: false })
  })

  it("rejects a callback whose state doesn't match", async () => {
    const response = await signIn({
      tamper: (url, cookie) => {
        url.searchParams.set("state", "forged")
        return { url, cookie }
      },
    })
    rejectedWith(response, "state")
  })

  it("rejects a callback without the flow cookie", async () => {
    rejectedWith(
      await signIn({ tamper: (url) => ({ url, cookie: "" }) }),
      "state"
    )
  })

  it("rejects an ID token with the wrong nonce, audience, tenant or issuer", async () => {
    rejectedWith(await signIn({ claims: { nonce: "replayed" } }), "token")
    rejectedWith(await signIn({ claims: { aud: "someone-else" } }), "token")
    rejectedWith(await signIn({ claims: { tid: "other-tenant" } }), "token")
    rejectedWith(
      await signIn({ claims: { iss: "https://evil.example/v2.0" } }),
      "token"
    )
  })

  it("reports errors returned by Entra", async () => {
    const response = await signIn({
      tamper: (url, cookie) => {
        url.searchParams.delete("code")
        url.searchParams.set("error", "access_denied")
        return { url, cookie }
      },
    })
    rejectedWith(response, "entra")
  })

  it("rejects an email already linked to another Entra user", async () => {
    await signIn()
    rejectedWith(
      await signIn({ claims: { oid: "someone-else" } }),
      "account-conflict"
    )
  })

  it("returns to a same-origin path only", async () => {
    const back = await signIn({
      startPath: "/auth/entra/start?redirect=%2Fadmin%2Fpages",
    })
    expect(back.headers.get("location")).toBe("/admin/pages")

    const offsite = await signIn({
      startPath: "/auth/entra/start?redirect=%2F%2Fevil.example",
    })
    expect(offsite.headers.get("location")).toBe("/admin")
  })

  it("derives an https redirect URI behind a TLS-terminating proxy", async () => {
    const start = await startSignIn(
      new Request(`${ORIGIN}/auth/entra/start`, {
        headers: { "x-forwarded-proto": "https" },
      }),
      t.payload,
      config
    )
    const authorize = new URL(start.headers.get("location") ?? "")
    expect(authorize.searchParams.get("redirect_uri")).toBe(
      "https://site.test/auth/entra/callback"
    )
    expect(start.headers.getSetCookie()[0]).toMatch(/; Secure/)
  })

  it("answers 404 when Entra isn't configured", async () => {
    expect(readEntraConfig({})).toBeNull()
    const start = await startSignIn(
      new Request(`${ORIGIN}/auth/entra/start`),
      t.payload,
      readEntraConfig({ ENTRA_TENANT_ID: "t", ENTRA_CLIENT_ID: "c" })
    )
    expect(start.status).toBe(404)
    const callback = await finishSignIn(
      new Request(`${ORIGIN}/auth/entra/callback?code=x&state=y`),
      t.payload,
      null
    )
    expect(callback.status).toBe(404)
  })
})

describe("sessions", () => {
  it("rejects a forged or tampered session cookie", async () => {
    const response = await signIn()
    const cookie = cookieHeader(response)
    const forged = cookie.replace(/site-session=[^;]+/, (value) => value + "x")
    const { user } = await t.payload.auth({
      headers: new Headers({ cookie: forged }),
    })
    expect(user).toBeNull()
  })

  it("ends at once when Site Access is taken away or the User is disabled", async () => {
    const response = await signIn()
    const registryUser = await findUser(db, {
      email: `staff${oidCounter}@awayday.example`,
    })
    expect(await me(response)).not.toBeNull()

    await revokeSite(db, registryUser!.id, here.id)
    expect(await me(response)).toBeNull()

    await grantSite(db, registryUser!.id, here.id)
    expect(await me(response)).not.toBeNull()
    await updateUser(db, registryUser!.id, { disabled: true })
    expect(await me(response)).toBeNull()
  })

  it("lets a Super Admin in without Site Access", async () => {
    const response = await signIn()
    const registryUser = await findUser(db, {
      email: `staff${oidCounter}@awayday.example`,
    })
    await revokeSite(db, registryUser!.id, here.id)
    await updateUser(db, registryUser!.id, { isSuperAdmin: true })
    expect(await me(response)).not.toBeNull()
  })

  it("has no Payload password login", async () => {
    await expect(
      t.payload.login({
        collection: "users",
        data: { email: "anyone@awayday.example", password: "password" },
      })
    ).rejects.toThrow()
  })

  it("signs out by clearing the session cookie", () => {
    const response = signOut(new Request(`${ORIGIN}/auth/sign-out`))
    expect(response.headers.get("location")).toBe("/admin/sign-in")
    expect(sessionCookie(response)).toMatch(/Max-Age=0/)
  })
})

describe("dev sign-in", () => {
  it("signs in the dev User when enabled", async () => {
    const response = await devSignIn(
      new Request(`${ORIGIN}/auth/dev?redirect=%2Fadmin%2Fpages`),
      t.payload,
      DEV_ENV
    )
    expect(response.headers.get("location")).toBe("/admin/pages")
    expect(await me(response)).toMatchObject({ email: DEV_USER.email })
    expect(await findUser(db, { email: DEV_USER.email })).toMatchObject({
      isSuperAdmin: true,
    })
  })

  it("is off unless DEV_SIGN_IN=1, and always off in production", async () => {
    expect(devSignInEnabled(DEV_ENV)).toBe(true)
    expect(devSignInEnabled({ NODE_ENV: "development" })).toBe(false)
    expect(
      devSignInEnabled({ NODE_ENV: "development", DEV_SIGN_IN: "true" })
    ).toBe(false)
    expect(devSignInEnabled({ NODE_ENV: "production", DEV_SIGN_IN: "1" })).toBe(
      false
    )

    const off = await devSignIn(new Request(`${ORIGIN}/auth/dev`), t.payload, {
      NODE_ENV: "production",
      DEV_SIGN_IN: "1",
    })
    expect(off.status).toBe(404)
    expect(sessionCookie(off)).toBeUndefined()
  })

  it("refuses to start in production with DEV_SIGN_IN set", () => {
    expect(() =>
      assertNoDevSignInInProduction({
        NODE_ENV: "production",
        DEV_SIGN_IN: "1",
      })
    ).toThrow(/DEV_SIGN_IN/)
    expect(() =>
      assertNoDevSignInInProduction({ NODE_ENV: "production" })
    ).not.toThrow()
    expect(() => assertNoDevSignInInProduction(DEV_ENV)).not.toThrow()
  })
})

describe("password sign-in", () => {
  const PASSWORD = "correct horse battery"

  function post(
    fields: Record<string, string>,
    origin: string | null = ORIGIN
  ): Request {
    return new Request(`${ORIGIN}/auth/password`, {
      method: "POST",
      headers: origin ? { origin } : {},
      body: new URLSearchParams(fields),
    })
  }

  it("signs in with the Registry's email and password", async () => {
    const email = `pw${oidCounter}@awayday.example`
    await allowed(email, PASSWORD)
    const response = await passwordSignIn(
      post({
        email: email.toUpperCase(),
        password: PASSWORD,
        redirect: "/admin/pages",
      }),
      t.payload
    )
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("/admin/pages")
    expect(await me(response)).toMatchObject({ email })
  })

  it("gives one answer for a wrong password, an unknown email and a disabled User", async () => {
    const email = `pw${oidCounter}@awayday.example`
    const user = await allowed(email, PASSWORD)
    const failed = (response: Response) => {
      expect(response.status).toBe(303)
      expect(response.headers.get("location")).toMatch(
        /^\/admin\/sign-in\?error=password/
      )
      expect(sessionCookie(response)).toBeUndefined()
    }
    failed(
      await passwordSignIn(
        post({ email, password: "wrong password!" }),
        t.payload
      )
    )
    failed(
      await passwordSignIn(
        post({ email: "nobody@awayday.example", password: PASSWORD }),
        t.payload
      )
    )
    await updateUser(db, user.id, { disabled: true })
    failed(await passwordSignIn(post({ email, password: PASSWORD }), t.payload))
  })

  it("refuses a User without Site Access", async () => {
    const email = `pw${oidCounter}@awayday.example`
    await createUser(db, { email, password: PASSWORD })
    rejectedSeeOther(
      await passwordSignIn(post({ email, password: PASSWORD }), t.payload),
      "not-assigned"
    )
  })

  it("refuses a form posted from another site", async () => {
    const email = `pw${oidCounter}@awayday.example`
    await allowed(email, PASSWORD)
    const response = await passwordSignIn(
      post({ email, password: PASSWORD }, "https://evil.example"),
      t.payload
    )
    expect(sessionCookie(response)).toBeUndefined()
  })
})

describe("Site handoff", () => {
  async function signedIn(email: string) {
    const user = await allowed(email, "correct horse battery")
    const response = await passwordSignIn(
      new Request(`${ORIGIN}/auth/password`, {
        method: "POST",
        headers: { origin: ORIGIN },
        body: new URLSearchParams({ email, password: "correct horse battery" }),
      }),
      t.payload
    )
    return { user, cookie: cookieHeader(response) }
  }

  function start(cookie: string, siteId: number) {
    return startHandoff(
      new Request(`${ORIGIN}/auth/handoff/start`, {
        method: "POST",
        headers: { origin: ORIGIN, cookie },
        body: new URLSearchParams({ site: String(siteId) }),
      }),
      t.payload
    )
  }

  it("sends a User to another Site they may use, with a single-use token", async () => {
    const other = await registerSite(db, {
      schema: `other_${oidCounter}`,
      url: "https://other.example/",
    })
    const { user, cookie } = await signedIn(`hand${oidCounter}@awayday.example`)
    await grantSite(db, user.id, other.id)

    const response = await start(cookie, other.id)
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "")
    expect(location.origin + location.pathname).toBe(
      "https://other.example/auth/handoff"
    )
    expect(location.searchParams.get("token")).toBeTruthy()
  })

  it("won't hand off to a Site the User can't use", async () => {
    const other = await registerSite(db, {
      schema: `other_${oidCounter}`,
      url: "https://other.example",
    })
    const { cookie } = await signedIn(`hand${oidCounter}@awayday.example`)
    const response = await start(cookie, other.id)
    expect(response.headers.get("location")).toBe("/admin")
  })

  it("signs in on arrival, once, and only on the Site it was made for", async () => {
    const { user, cookie } = await signedIn(`hand${oidCounter}@awayday.example`)
    // A handoff to this same Site, to redeem it here.
    const response = await start(cookie, here.id)
    expect(response.status).toBe(303)
    const token = new URL(
      response.headers.get("location") ?? ORIGIN,
      ORIGIN
    ).searchParams.get("token")

    const arrive = () =>
      finishHandoff(
        new Request(`${ORIGIN}/auth/handoff?token=${token}`),
        t.payload
      )
    const first = await arrive()
    expect(first.headers.get("location")).toBe("/admin")
    expect(await me(first)).toMatchObject({ registryUserId: user.id })

    rejectedWith(await arrive(), "handoff")
  })
})

const rejectedSeeOther = (response: Response, error: string) => {
  expect(response.status).toBe(303)
  expect(response.headers.get("location")).toBe(`/admin/sign-in?error=${error}`)
  expect(sessionCookie(response)).toBeUndefined()
}
