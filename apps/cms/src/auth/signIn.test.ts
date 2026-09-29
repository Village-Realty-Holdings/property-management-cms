import type { JWTPayload } from "jose"
import type { PayloadRequest } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import {
  capSessionAge,
  finishSignIn,
  readEntraConfig,
  SESSION_SECONDS,
  startSignIn,
  type EntraConfig,
} from "."
import { startMockIssuer, type MockIssuer } from "./test/mockIssuer"

const ORIGIN = "http://cms.test"

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
    name: `Staff ${oidCounter}`,
    roles: ["cms_user"],
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

const payloadCookie = (response: Response) =>
  response.headers.getSetCookie().find((c) => c.startsWith("payload-token="))

async function me(response: Response) {
  const { user } = await t.payload.auth({
    headers: new Headers({ cookie: cookieHeader(response) }),
  })
  return user
}

const rejectedWith = (response: Response, error: string) => {
  expect(response.status).toBe(302)
  expect(response.headers.get("location")).toBe(`/admin/login?error=${error}`)
  expect(payloadCookie(response)).toBeUndefined()
}

describe("Entra sign-in", () => {
  it("creates an Editor with no Site Assignment and a working session", async () => {
    const response = await signIn()

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("/admin")
    expect(payloadCookie(response)).toMatch(/HttpOnly/)
    // The single-use flow cookie is cleared.
    expect(
      response.headers
        .getSetCookie()
        .some((c) => c.startsWith("entra-signin=;") && /Max-Age=0/.test(c))
    ).toBe(true)

    const user = await me(response)
    expect(user).toMatchObject({
      collection: "users",
      email: `staff${oidCounter}@awayday.example`,
      name: `Staff ${oidCounter}`,
      entraOid: `oid-${oidCounter}`,
      role: "editor",
      superAdmin: false,
    })
    expect(user?.collection === "users" && user.tenants).toEqual([])
  })

  it("signs the same Entra user into the same Staff User", async () => {
    const first = await me(await signIn())
    const second = await me(await signIn())
    expect(second?.id).toBe(first?.id)
    const { totalDocs } = await t.payload.count({
      collection: "users",
      where: { entraOid: { equals: `oid-${oidCounter}` } },
    })
    expect(totalDocs).toBe(1)
  })

  it("rejects users without the cms_user app role", async () => {
    rejectedWith(await signIn({ claims: { roles: [] } }), "not-allowed")
    rejectedWith(
      await signIn({ claims: { roles: ["cms_super_admin"] } }),
      "not-allowed"
    )
    const { totalDocs } = await t.payload.count({
      collection: "users",
      where: { entraOid: { equals: `oid-${oidCounter}` } },
    })
    expect(totalDocs).toBe(0)
  })

  it("sets the Super Admin flag from cms_super_admin on every sign-in", async () => {
    const promoted = await me(
      await signIn({ claims: { roles: ["cms_user", "cms_super_admin"] } })
    )
    expect(promoted).toMatchObject({ superAdmin: true })

    const demoted = await me(await signIn({ claims: { roles: ["cms_user"] } }))
    expect(demoted?.id).toBe(promoted?.id)
    expect(demoted).toMatchObject({ superAdmin: false })
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

  it("rejects an ID token with the wrong nonce", async () => {
    rejectedWith(await signIn({ claims: { nonce: "replayed" } }), "token")
  })

  it("rejects an ID token for another audience", async () => {
    rejectedWith(await signIn({ claims: { aud: "someone-else" } }), "token")
  })

  it("rejects an ID token from another tenant or issuer", async () => {
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

  it("rejects an email already used by a Staff User without an Entra ID", async () => {
    await t.payload.create({
      collection: "users",
      data: {
        email: `staff${oidCounter}@awayday.example`,
        password: "password",
        role: "editor",
      },
    })
    rejectedWith(await signIn(), "account-conflict")
  })

  it("returns to a same-origin path only", async () => {
    const back = await signIn({
      startPath: "/auth/entra/start?redirect=%2Fadmin%2Fcollections%2Fpages",
    })
    expect(back.headers.get("location")).toBe("/admin/collections/pages")

    const offsite = await signIn({
      startPath: "/auth/entra/start?redirect=%2F%2Fevil.example",
    })
    expect(offsite.headers.get("location")).toBe("/admin")

    const tabbed = await signIn({
      startPath: "/auth/entra/start?redirect=%2F%09%2Fevil.example",
    })
    expect(tabbed.headers.get("location")).toBe("/admin")
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
      "https://cms.test/auth/entra/callback"
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

describe("password login", () => {
  it("still works for the break-glass Super Admin", async () => {
    await t.payload.create({
      collection: "users",
      data: {
        email: "glass@awayday.example",
        password: "glass-password",
        role: "admin",
        superAdmin: true,
      },
    })
    const result = await t.payload.login({
      collection: "users",
      data: { email: "glass@awayday.example", password: "glass-password" },
    })
    expect(result.token).toBeTruthy()
  })

  it("is rejected for Staff Users who aren't Super Admins", async () => {
    await t.payload.create({
      collection: "users",
      data: {
        email: "editor@awayday.example",
        password: "editor-password",
        role: "admin",
      },
    })
    await expect(
      t.payload.login({
        collection: "users",
        data: { email: "editor@awayday.example", password: "editor-password" },
      })
    ).rejects.toThrow()
  })

  it("is rejected for Entra users, even Super Admins with a password", async () => {
    await signIn({ claims: { roles: ["cms_user", "cms_super_admin"] } })
    const email = `staff${oidCounter}@awayday.example`
    const { docs } = await t.payload.find({
      collection: "users",
      where: { email: { equals: email } },
    })
    await t.payload.update({
      collection: "users",
      id: docs[0]!.id,
      data: { password: "known-password" },
    })
    await expect(
      t.payload.login({
        collection: "users",
        data: { email, password: "known-password" },
      })
    ).rejects.toThrow()
  })
})

describe("session lifetime", () => {
  const refresh = (createdAt: Date) =>
    capSessionAge({
      args: {},
      operation: "refresh",
      req: {
        user: { _sid: "s", sessions: [{ id: "s", createdAt }] },
        t: ((key: string) => key) as PayloadRequest["t"],
      } as unknown as PayloadRequest,
    } as Parameters<typeof capSessionAge>[0])

  it("allows refreshing a young session", () => {
    expect(() => refresh(new Date())).not.toThrow()
  })

  it("refuses to refresh a session past its lifetime", () => {
    expect(() =>
      refresh(new Date(Date.now() - (SESSION_SECONDS + 1) * 1000))
    ).toThrow()
  })
})
