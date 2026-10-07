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
  entraCallback,
  finishHandoff,
  finishSignIn,
  passwordSignIn,
  readEntraConfig,
  SESSION_COOKIE,
  SITE_USER_ROLE,
  signOut,
  startHandoff,
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
    ...readEntraConfig({
      ENTRA_TENANT_ID: mock.tenantId,
      ENTRA_CLIENT_ID: mock.clientId,
      ENTRA_ISSUER: mock.issuer,
    })!,
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

/** The Microsoft account the next sign-in is for. */
let person: JWTPayload
let oidCounter = 0
beforeEach(async () => {
  oidCounter += 1
  person = {
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

/**
 * What the sign-in page does once MSAL has a token: posts it to the Site.
 * Returns the Site's answer.
 */
async function signIn({
  claims = {},
  entra = config,
  redirect = "",
  headers = {},
}: {
  claims?: JWTPayload
  entra?: EntraConfig
  redirect?: string
  headers?: Record<string, string>
} = {}): Promise<Response> {
  person = { ...person, ...claims }
  return finishSignIn(
    new Request(`${ORIGIN}/auth/entra/finish`, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        authorization: `Bearer ${await mock.token(person)}`,
        ...headers,
      },
      body: new URLSearchParams({ redirect }),
    }),
    t.payload,
    entra
  )
}

/** Where the Site's answer sends the browser. */
const locationOf = async (response: Response) =>
  ((await response.clone().json()) as { location: string }).location

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

async function rejectedWith(response: Response, error: string) {
  expect(response.status).toBe(401)
  expect(await locationOf(response)).toBe(`/admin/sign-in?error=${error}`)
  expect(sessionCookie(response)).toBeUndefined()
}

describe("Entra sign-in", () => {
  it("creates a User and a working session", async () => {
    const response = await signIn()

    expect(response.status).toBe(200)
    expect(await locationOf(response)).toBe("/admin")
    expect(sessionCookie(response)).toMatch(/HttpOnly/)

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

  it("requires the configured app role, read from the configured claim", async () => {
    const entra = { ...config, requiredRole: "cms_user", roleClaim: "groups" }
    await rejectedWith(
      await signIn({
        entra,
        claims: { roles: ["cms_user"], groups: [SITE_USER_ROLE] },
      }),
      "not-allowed"
    )
    const response = await signIn({
      entra,
      claims: { roles: [], groups: ["cms_user"] },
    })
    expect(await locationOf(response)).toBe("/admin")
  })

  it("rejects users without the required app role", async () => {
    await rejectedWith(await signIn({ claims: { roles: [] } }), "not-allowed")
    await rejectedWith(
      await signIn({ claims: { roles: ["cms_user"] } }),
      "not-allowed"
    )
    const { totalDocs } = await t.payload.count({
      collection: "users",
      where: { email: { equals: `staff${oidCounter}@awayday.example` } },
    })
    expect(totalDocs).toBe(0)
  })

  it("gives a new Entra user Site Access here, once", async () => {
    const email = "newcomer@awayday.example"
    expect(await locationOf(await signIn({ claims: { email } }))).toBe("/admin")
    const newcomer = await findUser(db, { email })
    expect(newcomer).toMatchObject({
      entraOid: `oid-${oidCounter}`,
      isSuperAdmin: false,
    })

    // Taken away in the Users screen, it stays taken away.
    await revokeSite(db, newcomer!.id, here.id)
    await rejectedWith(await signIn({ claims: { email } }), "not-assigned")
  })

  it("makes a new Entra user with the admin role a Super Admin, once", async () => {
    const entra = { ...config, adminRole: "cms_admin" }
    const email = "boss@awayday.example"
    const roles = [SITE_USER_ROLE, "cms_admin"]
    await signIn({ entra, claims: { email, roles } })
    const boss = await findUser(db, { email })
    expect(boss).toMatchObject({ isSuperAdmin: true })

    // Entra roles don't change an existing User.
    await updateUser(db, boss!.id, { isSuperAdmin: false })
    await signIn({ entra, claims: { email, roles } })
    expect(await findUser(db, { email })).toMatchObject({ isSuperAdmin: false })
  })

  it("leaves a User added by email as they were", async () => {
    const email = "added@awayday.example"
    const added = await createUser(db, { email })
    await rejectedWith(
      await signIn({
        entra: { ...config, adminRole: "cms_admin" },
        claims: { email, roles: [SITE_USER_ROLE, "cms_admin"] },
      }),
      "not-assigned"
    )
    expect(await findUser(db, { email })).toMatchObject({
      id: added.id,
      entraOid: `oid-${oidCounter}`,
      isSuperAdmin: false,
    })
  })

  it("rejects a token with the wrong audience, tenant or issuer, or expired", async () => {
    await rejectedWith(
      await signIn({ claims: { aud: "someone-else" } }),
      "token"
    )
    await rejectedWith(
      await signIn({ claims: { tid: "other-tenant" } }),
      "token"
    )
    await rejectedWith(
      await signIn({ claims: { iss: "https://evil.example/v2.0" } }),
      "token"
    )
    await rejectedWith(
      await signIn({ claims: { exp: Math.floor(Date.now() / 1000) - 600 } }),
      "token"
    )
  })

  it("rejects a forged token or none", async () => {
    const forged = (await mock.token(person)).replace(/.$/, "x")
    await rejectedWith(
      await signIn({ headers: { authorization: `Bearer ${forged}` } }),
      "token"
    )
    await rejectedWith(
      await signIn({ headers: { authorization: "" } }),
      "token"
    )
  })

  it("requires the API scope when one is set", async () => {
    const entra = readEntraConfig({
      ENTRA_TENANT_ID: mock.tenantId,
      ENTRA_CLIENT_ID: mock.clientId,
      ENTRA_ISSUER: mock.issuer,
      AUTH_REQUIRED_SCOPE: "payload.access",
    })!
    const aud = `api://${mock.clientId}`
    await rejectedWith(
      await signIn({ entra, claims: { aud, scp: "User.Read" } }),
      "token"
    )
    const response = await signIn({
      entra,
      claims: { aud, scp: "User.Read payload.access" },
    })
    expect(await locationOf(response)).toBe("/admin")
  })

  it("only takes a token posted from this Site", async () => {
    await rejectedWith(
      await signIn({ headers: { origin: "https://evil.example" } }),
      "token"
    )
  })

  it("rejects an email already linked to another Entra user", async () => {
    await signIn()
    await rejectedWith(
      await signIn({ claims: { oid: "someone-else" } }),
      "account-conflict"
    )
  })

  it("returns to a same-origin path only", async () => {
    expect(await locationOf(await signIn({ redirect: "/admin/pages" }))).toBe(
      "/admin/pages"
    )
    expect(await locationOf(await signIn({ redirect: "//evil.example" }))).toBe(
      "/admin"
    )
  })

  it("sets a Secure session cookie behind a TLS-terminating proxy", async () => {
    const response = await signIn({
      headers: { "x-forwarded-proto": "https", origin: "https://site.test" },
    })
    expect(sessionCookie(response)).toMatch(/; Secure/)
  })

  it("reads the Entra settings, with defaults", () => {
    const base = { ENTRA_TENANT_ID: "t", ENTRA_CLIENT_ID: "c" }
    expect(readEntraConfig(base)).toMatchObject({
      issuer: "https://login.microsoftonline.com/t/v2.0",
      issuers: [
        "https://login.microsoftonline.com/t/v2.0",
        "https://sts.windows.net/t/",
      ],
      audiences: ["c", "api://c"],
      requiredScope: undefined,
      requiredRole: SITE_USER_ROLE,
      roleClaim: "roles",
      adminRole: undefined,
    })
    expect(
      readEntraConfig({
        ...base,
        AUTH_AUDIENCE: "api://cms, c",
        AUTH_REQUIRED_SCOPE: "payload.access",
        AUTH_REQUIRED_ROLE: " payload_cms_user ",
        AUTH_ROLE_CLAIM: "groups",
        AUTH_ADMIN_ROLE: "payload_cms_admin",
      })
    ).toMatchObject({
      audiences: ["api://cms", "c"],
      requiredScope: { uri: "api://c/payload.access", name: "payload.access" },
      requiredRole: "payload_cms_user",
      roleClaim: "groups",
      adminRole: "payload_cms_admin",
    })
    expect(
      readEntraConfig({
        ...base,
        AUTH_REQUIRED_SCOPE: "api://cms/payload.access",
      })?.requiredScope
    ).toEqual({ uri: "api://cms/payload.access", name: "payload.access" })
  })

  it("answers 404 when Entra isn't configured", async () => {
    expect(readEntraConfig({})).toBeNull()
    expect(readEntraConfig({ ENTRA_TENANT_ID: "t" })).toBeNull()
    expect(entraCallback(null).status).toBe(404)
    const finish = await finishSignIn(
      new Request(`${ORIGIN}/auth/entra/finish`, { method: "POST" }),
      t.payload,
      null
    )
    expect(finish.status).toBe(404)
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

    const again = await arrive()
    expect(again.status).toBe(302)
    expect(again.headers.get("location")).toBe("/admin/sign-in?error=handoff")
    expect(sessionCookie(again)).toBeUndefined()
  })
})

const rejectedSeeOther = (response: Response, error: string) => {
  expect(response.status).toBe(303)
  expect(response.headers.get("location")).toBe(`/admin/sign-in?error=${error}`)
  expect(sessionCookie(response)).toBeUndefined()
}
