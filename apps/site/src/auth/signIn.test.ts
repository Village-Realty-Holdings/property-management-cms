import type { JWTPayload } from "jose"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import {
  assertNoDevSignInInProduction,
  DEV_USER,
  devSignIn,
  devSignInEnabled,
  finishSignIn,
  readEntraConfig,
  SESSION_COOKIE,
  signOut,
  startSignIn,
  type EntraConfig,
} from "."
import { startMockIssuer, type MockIssuer } from "./test/mockIssuer"

const ORIGIN = "http://site.test"
const DEV_ENV = { NODE_ENV: "development", DEV_SIGN_IN: "1" }

let t: TestPayload
let mock: MockIssuer
let config: EntraConfig

beforeAll(async () => {
  t = await getTestPayload()
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

let oidCounter = 0
beforeEach(() => {
  oidCounter += 1
  mock.user = {
    oid: `oid-${oidCounter}`,
    email: `Staff${oidCounter}@Awayday.example`,
    name: `User ${oidCounter}`,
    roles: ["site_user"],
  }
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

    expect(await me(response)).toMatchObject({
      collection: "users",
      email: `staff${oidCounter}@awayday.example`,
      name: `User ${oidCounter}`,
      entraOid: `oid-${oidCounter}`,
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
      where: { entraOid: { equals: `oid-${oidCounter}` } },
    })
    expect(totalDocs).toBe(1)
  })

  it("rejects users without the site_user app role", async () => {
    rejectedWith(await signIn({ claims: { roles: [] } }), "not-allowed")
    rejectedWith(
      await signIn({ claims: { roles: ["cms_user"] } }),
      "not-allowed"
    )
    const { totalDocs } = await t.payload.count({
      collection: "users",
      where: { entraOid: { equals: `oid-${oidCounter}` } },
    })
    expect(totalDocs).toBe(0)
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

  it("rejects an email already used by another Entra user", async () => {
    await t.payload.create({
      collection: "users",
      data: {
        email: `staff${oidCounter}@awayday.example`,
        entraOid: "someone-else",
      },
    })
    rejectedWith(await signIn(), "account-conflict")
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

  it("has no password login", async () => {
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
    expect(await me(response)).toMatchObject({
      email: DEV_USER.email,
      entraOid: DEV_USER.entraOid,
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
