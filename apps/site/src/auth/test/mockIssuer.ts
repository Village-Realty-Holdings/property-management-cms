import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose"

/**
 * A tiny Entra stand-in for tests: OIDC discovery and JWKS, and `token`,
 * which signs what MSAL would have got from Entra in the browser.
 */
export type MockIssuer = {
  issuer: string
  tenantId: string
  clientId: string
  /** A signed token with these claims over defaults (tid, aud, iss, …). */
  token: (claims?: JWTPayload) => Promise<string>
  close: () => Promise<void>
}

export async function startMockIssuer({
  tenantId = "00000000-0000-4000-8000-00000000a1a1",
  clientId = "00000000-0000-4000-8000-00000000c1c1",
}: {
  tenantId?: string
  clientId?: string
} = {}): Promise<MockIssuer> {
  const { privateKey, publicKey } = await generateKeyPair("RS256")
  const jwk = { ...(await exportJWK(publicKey)), kid: "mock", use: "sig" }

  const mock: MockIssuer = {
    issuer: "",
    tenantId,
    clientId,
    token: ({ iss, aud, exp, ...claims } = {}) =>
      new SignJWT({ tid: tenantId, ...claims })
        .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
        .setIssuer((iss as string | undefined) ?? mock.issuer)
        .setAudience((aud as string | undefined) ?? clientId)
        .setIssuedAt()
        .setExpirationTime(exp ?? "1h")
        .sign(privateKey),
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  }

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", mock.issuer)
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" })
      res.end(JSON.stringify(body))
    }
    const path = url.pathname.slice(new URL(mock.issuer).pathname.length)

    if (path === "/.well-known/openid-configuration") {
      return json(200, { issuer: mock.issuer, jwks_uri: `${mock.issuer}/keys` })
    }
    if (path === "/keys") return json(200, { keys: [jwk] })
    json(404, { error: "not_found" })
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  mock.issuer = `http://127.0.0.1:${port}/${tenantId}/v2.0`
  return mock
}
