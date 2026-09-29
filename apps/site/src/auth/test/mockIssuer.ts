import { createHash, randomBytes } from "node:crypto"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose"

/**
 * A tiny Entra stand-in for tests and local e2e runs: OIDC discovery, JWKS,
 * an authorize endpoint that signs the configured user straight in, and a
 * token endpoint that checks the client secret and PKCE before returning a
 * signed ID token.
 */
export type MockIssuer = {
  issuer: string
  tenantId: string
  clientId: string
  clientSecret: string
  /** Claims for the next sign-in (merged over defaults: oid, tid, aud, …). */
  user: JWTPayload
  close: () => Promise<void>
}

type Pending = {
  nonce: string
  challenge: string
  redirectUri: string
  claims: JWTPayload
}

export async function startMockIssuer({
  port = 0,
  tenantId = "00000000-0000-4000-8000-00000000a1a1",
  clientId = "00000000-0000-4000-8000-00000000c1c1",
  clientSecret = "mock-client-secret",
}: {
  port?: number
  tenantId?: string
  clientId?: string
  clientSecret?: string
} = {}): Promise<MockIssuer> {
  const { privateKey, publicKey } = await generateKeyPair("RS256")
  const jwk = { ...(await exportJWK(publicKey)), kid: "mock", use: "sig" }
  const codes = new Map<string, Pending>()

  const mock: MockIssuer = {
    issuer: "",
    tenantId,
    clientId,
    clientSecret,
    user: {},
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  }

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", mock.issuer)
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" })
      res.end(JSON.stringify(body))
    }
    const path = url.pathname.slice(new URL(mock.issuer).pathname.length)

    if (path === "/.well-known/openid-configuration") {
      return json(200, {
        issuer: mock.issuer,
        authorization_endpoint: `${mock.issuer}/authorize`,
        token_endpoint: `${mock.issuer}/token`,
        jwks_uri: `${mock.issuer}/keys`,
      })
    }
    if (path === "/keys") return json(200, { keys: [jwk] })

    if (path === "/authorize") {
      const params = url.searchParams
      const redirectUri = params.get("redirect_uri") ?? ""
      if (
        params.get("client_id") !== clientId ||
        params.get("code_challenge_method") !== "S256" ||
        !redirectUri
      ) {
        return json(400, { error: "invalid_request" })
      }
      const code = randomBytes(16).toString("hex")
      codes.set(code, {
        nonce: params.get("nonce") ?? "",
        challenge: params.get("code_challenge") ?? "",
        redirectUri,
        claims: { ...mock.user },
      })
      const back = new URL(redirectUri)
      back.searchParams.set("code", code)
      back.searchParams.set("state", params.get("state") ?? "")
      res.writeHead(302, { location: back.toString() })
      return res.end()
    }

    if (path === "/token" && req.method === "POST") {
      let raw = ""
      for await (const chunk of req) raw += chunk
      const form = new URLSearchParams(raw)
      const pending = codes.get(form.get("code") ?? "")
      codes.delete(form.get("code") ?? "")
      const verifier = form.get("code_verifier") ?? ""
      const challenge = createHash("sha256")
        .update(verifier)
        .digest("base64url")
      if (
        !pending ||
        form.get("grant_type") !== "authorization_code" ||
        form.get("client_id") !== clientId ||
        form.get("client_secret") !== clientSecret ||
        form.get("redirect_uri") !== pending.redirectUri ||
        challenge !== pending.challenge
      ) {
        return json(400, { error: "invalid_grant" })
      }
      const idToken = await new SignJWT({
        tid: tenantId,
        nonce: pending.nonce,
        ...pending.claims,
      })
        .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
        .setIssuer((pending.claims.iss as string | undefined) ?? mock.issuer)
        .setAudience((pending.claims.aud as string | undefined) ?? clientId)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey)
      return json(200, { token_type: "Bearer", id_token: idToken })
    }

    json(404, { error: "not_found" })
  })

  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve)
  )
  const { port: bound } = server.address() as AddressInfo
  mock.issuer = `http://127.0.0.1:${bound}/${tenantId}/v2.0`
  return mock
}
