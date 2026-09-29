import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import { createLocalReq, type Payload, type TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Submission } from "@workspace/cms-types"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { retryForwardingEndpoint, signBody, type ForwardOutcome } from "."

/**
 * Submissions are stored, then forwarded (ADR-0014). Creates go through the
 * Local API as the Site's reader with `overrideAccess: false` (the same
 * rules as REST); the webhook destination is a local HTTP server.
 */

type User = TypedUser | null
type ID = number

let t: TestPayload
let payload: Payload
let server: Server

let siteA: ID
let siteB: ID
let readerA: User
let readerB: User
let editorA: User
let editorB: User

const SECRET = "webhook-secret"

/** What the webhook server answers, and what it received. */
const hook = {
  status: 200,
  requests: [] as { body: string; signature: string | undefined }[],
  /** Requests to /ok, which always accepts. */
  ok: 0,
}

async function readerFor(key: string): Promise<User> {
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `site-readers API-Key ${key}` }),
  })
  return user
}

async function staff(email: string, site: ID): Promise<User> {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "password", role: "editor", tenants: [{ site }] },
  })
  return { ...doc, collection: "users" } as User
}

function submit(data: Record<string, unknown>, user: User = readerA) {
  return payload.create({
    collection: "submissions",
    data: {
      kind: "inquiry",
      name: "Guest",
      email: "guest@example.com",
      payload: {},
      ...data,
    } as Omit<Submission, "id" | "createdAt" | "updatedAt">,
    overrideAccess: false,
    user,
  })
}

/** Waits for the background forwarding to leave `pending`. */
async function settled(id: ID, attempts = 1): Promise<Submission> {
  for (let i = 0; i < 100; i++) {
    const doc = await payload.findByID({
      collection: "submissions",
      id,
      depth: 0,
    })
    if ((doc.forwardingAttempts ?? 0) >= attempts) return doc
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Submission ${id} was not forwarded`)
}

async function retry(id: ID, user: User) {
  const req = await createLocalReq({ user: user ?? undefined }, payload)
  req.routeParams = { id: String(id) }
  const response = await retryForwardingEndpoint.handler(req)
  return {
    status: response.status,
    body: (await response.json()) as ForwardOutcome,
  }
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = ""
    req.on("data", (chunk: Buffer) => (body += chunk.toString()))
    req.on("end", () => {
      if (req.url === "/ok") {
        hook.ok++
        res.writeHead(200).end()
        return
      }
      const signature = req.headers["x-signature"]
      hook.requests.push({
        body,
        signature: typeof signature === "string" ? signature : undefined,
      })
      res.writeHead(hook.status).end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo

  t = await getTestPayload()
  payload = t.payload

  const a = await payload.create({
    collection: "sites",
    data: {
      name: "Site A",
      slug: "site-a",
      forwarding: {
        destinations: [
          {
            kind: "inquiry",
            type: "webhook",
            url: `http://127.0.0.1:${port}/hook`,
            secret: SECRET,
          },
        ],
      },
    },
  })
  const b = await payload.create({
    collection: "sites",
    data: {
      name: "Site B",
      slug: "site-b",
      forwarding: {
        destinations: [
          { kind: "all", type: "webhook", url: `http://127.0.0.1:${port}/ok` },
          {
            kind: "all",
            type: "webhook",
            url: `http://127.0.0.1:${port}/hook`,
          },
        ],
      },
    },
  })
  siteA = a.id
  siteB = b.id

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "fwd-reader-a" },
  })
  await payload.create({
    collection: "site-readers",
    data: { site: siteB, enableAPIKey: true, apiKey: "fwd-reader-b" },
  })
  readerA = await readerFor("fwd-reader-a")
  readerB = await readerFor("fwd-reader-b")
  editorA = await staff("fwd-editor-a@example.com", siteA)
  editorB = await staff("fwd-editor-b@example.com", siteB)
})

afterAll(async () => {
  await t?.teardown()
  await new Promise((resolve) => server?.close(resolve))
})

describe("storing", () => {
  it("stores a reader's Submission on its own Site, whatever it names", async () => {
    hook.status = 200
    const doc = await submit({ site: siteB, kind: "contact" })
    const stored = await payload.findByID({
      collection: "submissions",
      id: doc.id,
      depth: 0,
    })
    expect(stored.site).toBe(siteA)
    expect(stored.name).toBe("Guest")
    expect(new Date(stored.retainUntil ?? 0).getTime()).toBeGreaterThan(
      Date.now() + 364 * 24 * 60 * 60 * 1000
    )
  })

  it("requires a name and an email", async () => {
    await expect(submit({ name: undefined })).rejects.toThrow()
    await expect(submit({ email: "not-an-email" })).rejects.toThrow()
  })

  it("accepts only a Property on the reader's own Site", async () => {
    const [own, other] = await Promise.all(
      [siteA, siteB].map((site, i) =>
        payload.create({
          collection: "properties",
          data: { site, feedId: `p${i}`, feedName: "Cabin", status: "active" },
        })
      )
    )
    const doc = await submit({ kind: "contact", property: own!.id })
    expect(doc.property).toBeTruthy()
    await expect(
      submit({ kind: "contact", property: other!.id })
    ).rejects.toThrow()
  })

  it("rejects a filled-in honeypot and stores nothing", async () => {
    const before = await payload.count({ collection: "submissions" })
    await expect(
      submit({ website: "http://spam.example", name: "Bot" })
    ).rejects.toThrow()
    const after = await payload.count({ collection: "submissions" })
    expect(after.totalDocs).toBe(before.totalDocs)
  })

  it("staff of Site B can't read Site A's Submissions", async () => {
    await settled((await submit({})).id)
    const asB = await payload.find({
      collection: "submissions",
      overrideAccess: false,
      user: editorB,
    })
    expect(asB.docs).toEqual([])
    const asA = await payload.find({
      collection: "submissions",
      overrideAccess: false,
      user: editorA,
    })
    expect(asA.docs.length).toBeGreaterThan(0)
  })
})

describe("in the admin", () => {
  it("staff can't create Submissions", async () => {
    await expect(
      payload.create({
        collection: "submissions",
        data: {
          site: siteA,
          kind: "inquiry",
          name: "Staff",
          email: "staff@example.com",
          payload: {},
        } as Omit<Submission, "id" | "createdAt" | "updatedAt">,
        overrideAccess: false,
        user: editorA,
      })
    ).rejects.toMatchObject({ status: 403 })
  })

  it("staff can't change the guest's data or the forwarding status", async () => {
    hook.status = 500
    const doc = await submit({ name: "Ada", message: "Hello" })
    await settled(doc.id)
    await payload.update({
      collection: "submissions",
      id: doc.id,
      data: {
        name: "Changed",
        email: "changed@example.com",
        message: "Changed",
        kind: "contact",
        payload: { changed: true },
        sourceUrl: "https://changed.example",
        forwardingStatus: "sent",
        lastForwardingError: null,
      },
      overrideAccess: false,
      user: editorA,
    })
    const stored = await payload.findByID({
      collection: "submissions",
      id: doc.id,
      depth: 0,
    })
    expect(stored).toMatchObject({
      name: "Ada",
      email: "guest@example.com",
      message: "Hello",
      kind: "inquiry",
      payload: {},
      forwardingStatus: "failed",
    })
    expect(stored.sourceUrl).toBeFalsy()
    expect(stored.lastForwardingError).toMatch(/500/)
  })
})

describe("forwarding", () => {
  it("posts signed JSON to the webhook and marks the Submission sent", async () => {
    hook.status = 200
    hook.requests = []
    const doc = await submit({
      name: "Ada",
      message: "Is the cabin free in May?",
      guests: 4,
      sourceUrl: "https://site-a.example/cabins/one",
      payload: { newsletter: true },
    })
    const stored = await settled(doc.id)

    expect(stored.forwardingStatus).toBe("sent")
    expect(stored.forwardingAttempts).toBe(1)
    expect(stored.forwardedAt).toBeTruthy()
    expect(stored.lastForwardingError).toBeFalsy()

    expect(hook.requests).toHaveLength(1)
    const [request] = hook.requests
    expect(request!.signature).toBe(signBody(request!.body, SECRET))
    expect(JSON.parse(request!.body)).toMatchObject({
      id: doc.id,
      kind: "inquiry",
      site: { id: siteA, slug: "site-a" },
      name: "Ada",
      email: "guest@example.com",
      message: "Is the cabin free in May?",
      guests: 4,
      payload: { newsletter: true },
    })

    // Idempotent: a sent Submission isn't sent again.
    expect(await retry(doc.id, editorA)).toMatchObject({
      status: 200,
      body: { status: "skipped", reason: "already-sent" },
    })
    expect(hook.requests).toHaveLength(1)
  })

  it("marks a failed forward failed, and a retry sends it", async () => {
    hook.status = 500
    const doc = await submit({})
    const failed = await settled(doc.id)
    expect(failed.forwardingStatus).toBe("failed")
    expect(failed.forwardingAttempts).toBe(1)
    expect(failed.lastForwardingError).toMatch(/500/)

    // Still failing: attempts go up.
    const again = await retry(doc.id, editorA)
    expect(again.status).toBe(502)
    expect(again.body.status).toBe("failed")
    expect((await settled(doc.id, 2)).forwardingAttempts).toBe(2)

    // Staff of another Site can't retry it.
    expect((await retry(doc.id, editorB)).status).toBe(404)
    expect((await retry(doc.id, readerA)).status).toBe(401)

    hook.status = 200
    expect(await retry(doc.id, editorA)).toMatchObject({
      status: 200,
      body: { status: "sent", destinations: 1 },
    })
    const sent = await payload.findByID({
      collection: "submissions",
      id: doc.id,
    })
    expect(sent.forwardingStatus).toBe("sent")
    expect(sent.forwardingAttempts).toBe(3)
    expect(sent.lastForwardingError).toBeFalsy()
  })

  it("a retry after a partial failure skips destinations that accepted", async () => {
    hook.status = 500
    hook.ok = 0
    const doc = await submit({}, readerB)
    expect((await settled(doc.id)).forwardingStatus).toBe("failed")
    expect(hook.ok).toBe(1)

    hook.status = 200
    expect((await retry(doc.id, editorB)).body.status).toBe("sent")
    expect(hook.ok).toBe(1)
  })

  it("leaves a Submission pending when its kind has no destination", async () => {
    const doc = await submit({ kind: "ownerLead" })
    for (let i = 0; i < 100; i++) {
      const stored = await payload.findByID({
        collection: "submissions",
        id: doc.id,
      })
      if (stored.lastForwardingError) {
        expect(stored.forwardingStatus).toBe("pending")
        expect(stored.lastForwardingError).toMatch(/No Forwarding Destination/)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error("not attempted")
  })
})
