import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { loadDashboard, loadPageRows } from "./queries"

let t: TestPayload
let payload: Payload
let as: { overrideAccess: false; user: User & { collection: "users" } }

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const staff = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  as = { overrideAccess: false, user: { ...staff, collection: "users" } }

  const create = (
    title: string,
    path: string,
    status: "draft" | "published",
    seo?: { title?: string; description?: string }
  ) =>
    payload.create({
      collection: "pages",
      data: { title, path, seo, _status: status },
      draft: status === "draft",
      ...as,
    })

  // Home: published, complete SEO.
  await create("Home", "/", "published", { title: "Home", description: "Hi" })
  // About: published, then edited as a Draft: Changes not published.
  const about = await create("About", "/about", "published", {
    title: "About",
    description: "About us",
  })
  await payload.update({
    collection: "pages",
    id: about.id,
    data: { title: "About us (new)" },
    draft: true,
    ...as,
  })
  // Stays: published with no SEO description.
  await create("Stays", "/stays", "published", { title: "Stays" })
  // Contact: never published, no SEO. It must not count in SEO health.
  await create("Contact", "/contact", "draft")
})

afterAll(() => t?.teardown())

describe("loadPageRows", () => {
  it("derives each Page's status from its published copy and newest version", async () => {
    const rows = await loadPageRows(payload, as)
    const byPath = Object.fromEntries(rows.map((r) => [r.path, r]))
    expect(byPath["/"]?.status).toBe("published")
    expect(byPath["/about"]?.status).toBe("changes")
    expect(byPath["/contact"]?.status).toBe("draft")
  })

  it("shows the Draft's title for a Page with unpublished changes", async () => {
    const rows = await loadPageRows(payload, as)
    expect(rows.find((r) => r.path === "/about")?.title).toBe("About us (new)")
  })

  it("lists the most recently changed first, each with No Layout for now", async () => {
    const rows = await loadPageRows(payload, as)
    expect(rows.map((r) => r.path)).toEqual([
      "/contact",
      "/stays",
      "/about",
      "/",
    ])
    expect(new Set(rows.map((r) => r.layout))).toEqual(new Set(["No Layout"]))
  })

  it("searches title and path on the server", async () => {
    expect(
      (await loadPageRows(payload, as, { q: "stay" })).map((r) => r.path)
    ).toEqual(["/stays"])
    expect(
      (await loadPageRows(payload, as, { q: "/contact" })).map((r) => r.path)
    ).toEqual(["/contact"])
    // the newest Draft's title is what is searched
    expect(
      (await loadPageRows(payload, as, { q: "new" })).map((r) => r.path)
    ).toEqual(["/about"])
  })

  it("ignores case and surrounding space, and a blank search lists everything", async () => {
    expect(
      (await loadPageRows(payload, as, { q: "  HOME " })).map((r) => r.path)
    ).toEqual(["/"])
    expect(await loadPageRows(payload, as, { q: "  " })).toHaveLength(4)
  })

  it("finds nothing for text no Page has", async () => {
    expect(await loadPageRows(payload, as, { q: "zzz" })).toEqual([])
  })
})

describe("loadDashboard", () => {
  it("gathers Continue editing, Waiting to publish and SEO health", async () => {
    const d = await loadDashboard(payload, as)
    expect(d.continueEditing.map((i) => i.title)).toEqual([
      "Contact",
      "Stays",
      "About us (new)",
      "Home",
    ])
    expect(d.continueEditing.every((i) => i.kind === "page")).toBe(true)
    expect(d.waiting.map((r) => r.path)).toEqual(["/contact", "/about"])
    expect(d.seoAttentionCount).toBe(1)
    expect(d.pageCount).toBe(4)
  })
})
