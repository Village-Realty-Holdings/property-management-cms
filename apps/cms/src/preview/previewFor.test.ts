import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { issueSession } from "../auth/session"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { previewFor, type Preview } from "."

/**
 * Preview through its interface: a request's headers (a Staff User's
 * session, a SiteReader's key, or nothing) and the route's params.
 */

type ID = number

let t: TestPayload
let payload: Payload

let siteA: ID
let siteB: ID
let pageA: ID
let pageB: ID
let draftOnlyA: ID
let guideA: ID

const anonymous = new Headers()
const readerHeaders = new Headers({
  Authorization: "site-readers API-Key reader-key-a",
})
let editorA: Headers
let editorB: Headers
let editorAB: Headers

/** An Editor on `sites`, signed in as Entra sign-in would (a session cookie). */
async function staff(email: string, sites: ID[]): Promise<Headers> {
  const user = await payload.create({
    collection: "users",
    data: {
      email,
      password: "password",
      role: "editor",
      tenants: sites.map((site) => ({ site })),
    },
  })
  const setCookie = await issueSession(payload, user.id)
  return new Headers({ cookie: setCookie.split(";")[0]! })
}

const preview = (
  headers: Headers,
  site: string,
  collection: string,
  id: ID | string
) => previewFor({ payload, headers }, { site, collection, id: String(id) })

async function expectPreview(
  result: Awaited<ReturnType<typeof preview>>
): Promise<Preview> {
  expect(result.kind).toBe("preview")
  return result as Preview
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload

  const site = async (name: string, slug: string, promo: string) =>
    (
      await payload.create({
        collection: "sites",
        data: {
          name,
          slug,
          customVariables: [{ key: "promo", value: promo }],
        } as { name: string; slug: string },
      })
    ).id
  siteA = await site("Site A", "site-a", "SUN")
  siteB = await site("Site B", "site-b", "SNOW")

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "reader-key-a" },
  })
  editorA = await staff("editor-a@example.com", [siteA])
  editorB = await staff("editor-b@example.com", [siteB])
  editorAB = await staff("editor-ab@example.com", [siteA, siteB])

  // The same path on both Sites, published, with a newer Draft on Site A.
  const page = (site: ID, title: string, extra: Record<string, unknown> = {}) =>
    payload.create({
      collection: "pages",
      data: {
        site,
        title,
        path: "/about",
        showInNav: true,
        _status: "published",
        ...extra,
      } as never,
    })
  pageA = (await page(siteA, "About A")).id
  pageB = (await page(siteB, "About B")).id
  await payload.update({
    collection: "pages",
    id: pageA,
    draft: true,
    data: {
      title: "About A, {promo} edition",
      layout: [{ blockType: "callToAction", heading: "{promo} deals now" }],
      _status: "draft",
    } as never,
  })

  // Never published: a Preview's navigation leaves it out, as the Site does.
  draftOnlyA = (
    await payload.create({
      collection: "pages",
      draft: true,
      data: {
        site: siteA,
        title: "Secret plans",
        path: "/secret",
        showInNav: true,
        _status: "draft",
      } as never,
    })
  ).id

  // The Sync creates Properties (overrideAccess).
  for (const [feedId, site, status] of [
    ["cabin", siteA, "active"],
    ["gone", siteA, "withdrawn"],
    ["other-site", siteB, "active"],
  ] as const) {
    await payload.create({
      collection: "properties",
      data: { site, feedId, feedName: `Cabin ${feedId}`, status },
    })
  }

  guideA = (
    await payload.create({
      collection: "guides",
      data: {
        site: siteA,
        title: "Walks",
        slug: "walks",
        _status: "published",
      } as never,
    })
  ).id
  await payload.update({
    collection: "guides",
    id: guideA,
    draft: true,
    data: { title: "Walks for {promo} days", _status: "draft" } as never,
  })
})

afterAll(() => t?.teardown())

describe("previewFor", () => {
  it("asks anonymous requests to log in", async () => {
    expect(await preview(anonymous, "site-a", "pages", pageA)).toEqual({
      kind: "loginRequired",
    })
  })

  it("asks a SiteReader to log in: Preview is for Staff Users", async () => {
    expect(await preview(readerHeaders, "site-a", "pages", pageA)).toEqual({
      kind: "loginRequired",
    })
  })

  it("hides a document from a Staff User without its Site", async () => {
    expect(await preview(editorB, "site-a", "pages", pageA)).toEqual({
      kind: "notFound",
    })
  })

  it("hides a document asked for under another Site", async () => {
    expect(await preview(editorAB, "site-b", "pages", pageA)).toEqual({
      kind: "notFound",
    })
    expect(await preview(editorA, "site-b", "pages", pageB)).toEqual({
      kind: "notFound",
    })
  })

  it("finds nothing outside Pages, Guides and Curated Lists", async () => {
    expect(await preview(editorA, "site-a", "properties", 1)).toEqual({
      kind: "notFound",
    })
    expect(await preview(editorA, "site-a", "pages", 999999)).toEqual({
      kind: "notFound",
    })
  })

  it("shows the Draft when it's newer than the published version, Variables resolved", async () => {
    const result = await expectPreview(
      await preview(editorA, "site-a", "pages", pageA)
    )
    expect(result.site).toBe("site-a")
    if (result.collection !== "pages") throw new Error("expected a Page")
    expect(result.page.title).toBe("About A, SUN edition")
    expect(result.page.blocks).toMatchObject([
      { blockType: "callToAction", heading: "SUN deals now" },
    ])
  })

  it("reads the Site the document is on, for a Staff User with several Sites", async () => {
    const a = await expectPreview(
      await preview(editorAB, "site-a", "pages", pageA)
    )
    const b = await expectPreview(
      await preview(editorAB, "site-b", "pages", pageB)
    )
    if (a.collection !== "pages" || b.collection !== "pages") {
      throw new Error("expected Pages")
    }
    expect(a.page.title).toBe("About A, SUN edition")
    expect(b.page.title).toBe("About B")
    expect((await a.content.getSiteSettings()).slug).toBe("site-a")
    expect((await b.content.getSiteSettings()).variables.promo).toBe("SNOW")
  })

  it("shows the live navigation: published Pages of the Site only", async () => {
    const result = await expectPreview(
      await preview(editorA, "site-a", "pages", pageA)
    )
    const { navigation } = await result.content.getSiteSettings()
    expect(navigation.map((link) => link.href)).toEqual(["/about"])
    // The draft-only Page previews on its own, though.
    const secret = await expectPreview(
      await preview(editorA, "site-a", "pages", draftOnlyA)
    )
    if (secret.collection !== "pages") throw new Error("expected a Page")
    expect(secret.page.title).toBe("Secret plans")
  })

  it("shows only what the Site shows: Active Properties of that Site", async () => {
    const result = await expectPreview(
      await preview(editorAB, "site-a", "pages", pageA)
    )
    const { docs } = await result.content.searchProperties({ limit: 10 })
    expect(docs.map((property) => property.name)).toEqual(["Cabin cabin"])
  })

  it("previews a Guide's Draft", async () => {
    const result = await expectPreview(
      await preview(editorA, "site-a", "guides", guideA)
    )
    if (result.collection !== "guides") throw new Error("expected a Guide")
    expect(result.guide.title).toBe("Walks for SUN days")
  })

  it("never stores anything: forms can't submit from a Preview", async () => {
    const result = await expectPreview(
      await preview(editorA, "site-a", "pages", pageA)
    )
    await expect(
      result.content.submit({ kind: "contact", payload: {}, name: "A" })
    ).rejects.toThrow(/doesn't store/)
    expect(
      (await payload.find({ collection: "submissions", limit: 0 })).totalDocs
    ).toBe(0)
  })
})
