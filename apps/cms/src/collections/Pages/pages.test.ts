import type { Payload, TypedUser } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Page } from "@workspace/cms-types"

import { validateHref } from "../../blocks/link"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { defaultPagePath } from "./defaultPath"
import { checkPagePath } from "./path"

describe("checkPagePath", () => {
  it.each(["/", "/about", "/company/team", "/faq-2", "/a/b/c"])(
    "accepts %s",
    (path) => {
      expect(checkPagePath(path)).toBe(true)
    }
  )

  it.each([
    ["", "required"],
    ["about", "start with"],
    ["/about/", "Only Home"],
    ["//about", "double slashes"],
    ["/company//team", "double slashes"],
    ["/About", "lower-case"],
    ["/about us", "lower-case"],
    ["/-about", "lower-case"],
    ["/about-", "lower-case"],
    ["/rentals", "used by the Site"],
    ["/rentals/cabins", "used by the Site"],
    ["/areas", "used by the Site"],
    ["/lists/pets", "used by the Site"],
    ["/guides", "used by the Site"],
    ["/specials", "used by the Site"],
    ["/api/preview", "used by the Site"],
  ])("rejects %j", (path, message) => {
    expect(checkPagePath(path)).toContain(message)
  })

  it("allows paths that only share a reserved prefix's letters", () => {
    expect(checkPagePath("/rentals-guide")).toBe(true)
    expect(checkPagePath("/apis")).toBe(true)
  })
})

describe("defaultPagePath", () => {
  it.each([
    ["About us", "/about-us"],
    ["Café & Bar", "/cafe-and-bar"],
    ["  FAQ! ", "/faq"],
    ["Home", "/"],
    ["", null],
    ["!!!", null],
    [undefined, null],
  ])("%j gives %j", (title, path) => {
    expect(defaultPagePath(title)).toBe(path)
  })
})

describe("validateHref", () => {
  it.each([
    "",
    null,
    "/rentals",
    "/about?x=1#faq",
    "#faq",
    "https://example.com/a",
    "mailto:hi@example.com",
    "tel:+1 555-0100",
  ])("accepts %j", (href) => {
    expect(validateHref(href)).toBe(true)
  })

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/a\\b",
    "javascript:alert(1)",
    "rentals",
    "/a b",
  ])("rejects %j", (href) => {
    expect(validateHref(href)).not.toBe(true)
  })
})

type ID = number
type User = TypedUser | null

let t: TestPayload
let payload: Payload
let siteA: ID
let siteB: ID
let editorA: User
let readerA: User
let listA: ID
let listB: ID
let locationA: ID
let locationB: ID
let mediaA: ID
let mediaB: ID

const richText = (text: string) => ({
  root: {
    type: "root",
    direction: null,
    format: "" as const,
    indent: 0,
    version: 1,
    children: [
      {
        type: "paragraph",
        direction: null,
        format: "" as const,
        indent: 0,
        version: 1,
        textFormat: 0,
        children: [
          {
            type: "text",
            text,
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            version: 1,
          },
        ],
      },
    ],
  },
})

type PageData = Omit<Page, "id" | "createdAt" | "updatedAt" | "site"> & {
  site: ID
}

/**
 * `layout` is loosely typed so tests can send what an API client might,
 * e.g. a Block without its defaulted fields.
 */
function pageData(
  site: ID,
  path: string,
  layout: Record<string, unknown>[] = []
): PageData {
  return {
    site,
    title: `Page ${path}`,
    path,
    layout: layout as unknown as Page["layout"],
  }
}

/** The save fails with a validation error whose details match `message`. */
async function expectRejected(promise: Promise<unknown>, message: RegExp) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e as { message?: string; data?: unknown }
  )
  expect(error, "expected the save to be rejected").toBeTruthy()
  expect(
    JSON.stringify({ message: error?.message, data: error?.data })
  ).toMatch(message)
}

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload

  const a = await payload.create({
    collection: "sites",
    data: { name: "Site A", slug: "site-a", revalidationSecret: "secret-a" },
  })
  const b = await payload.create({
    collection: "sites",
    data: { name: "Site B", slug: "site-b", revalidationSecret: "secret-b" },
  })
  siteA = a.id
  siteB = b.id

  const editor = await payload.create({
    collection: "users",
    data: {
      email: "editor-a@example.com",
      password: "password",
      role: "editor",
      tenants: [{ site: siteA }],
    },
  })
  editorA = { ...editor, collection: "users" } as User

  await payload.create({
    collection: "site-readers",
    data: { site: siteA, enableAPIKey: true, apiKey: "pages-reader-a" },
  })
  const { user } = await payload.auth({
    headers: new Headers({
      Authorization: "site-readers API-Key pages-reader-a",
    }),
  })
  readerA = user

  for (const [site, key] of [
    [siteA, "A"],
    [siteB, "B"],
  ] as const) {
    const list = await payload.create({
      collection: "curated-lists",
      data: { site, title: `List ${key}`, _status: "published" },
    })
    const location = await payload.create({
      collection: "locations",
      data: {
        site,
        feedId: `loc-${key}`,
        name: `Location ${key}`,
        status: "active",
      },
    })
    if (key === "A") {
      listA = list.id
      locationA = location.id
    } else {
      listB = list.id
      locationB = location.id
    }
    // Straight to the database: an upload through Payload would write the
    // file to local disk.
    const media = await payload.db.create({
      collection: "media",
      data: { site, alt: `Media ${key}`, filename: `media-${key}.png` },
    })
    if (key === "A") mediaA = media.id as ID
    else mediaB = media.id as ID
  }
})

afterAll(() => t?.teardown())

describe("Page paths", () => {
  it("allows the same path on two Sites", async () => {
    const a = await payload.create({
      collection: "pages",
      data: pageData(siteA, "/about"),
    })
    const b = await payload.create({
      collection: "pages",
      data: pageData(siteB, "/about"),
    })
    expect(a.path).toBe("/about")
    expect(b.path).toBe("/about")
  })

  it("rejects a path already used on the same Site", async () => {
    await expectRejected(
      payload.create({ collection: "pages", data: pageData(siteA, "/about") }),
      /uses this path/
    )
  })

  it("lets a Page keep its own path when it is saved again", async () => {
    const page = await payload.create({
      collection: "pages",
      data: pageData(siteA, "/team"),
    })
    const updated = await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Our team", path: "/team" },
    })
    expect(updated.title).toBe("Our team")
  })

  it("defaults an empty path from the title on create", async () => {
    // No `path`, as an API client might send it.
    const page = await payload.create({
      collection: "pages",
      data: { site: siteA, title: "Meet the team" } as PageData,
    })
    expect(page.path).toBe("/meet-the-team")

    // An explicit path wins, and an update never rewrites it.
    const updated = await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Our people" },
    })
    expect(updated.path).toBe("/meet-the-team")
  })

  it("rejects invalid and reserved paths on save", async () => {
    await expectRejected(
      payload.create({ collection: "pages", data: pageData(siteA, "/About/") }),
      /Only Home/
    )
    await expectRejected(
      payload.create({
        collection: "pages",
        data: pageData(siteA, "/rentals"),
      }),
      /used by the Site/
    )
  })
})

describe("Drafts", () => {
  it("are validated too: a Draft can't take a path used on its Site", async () => {
    await expectRejected(
      payload.create({
        collection: "pages",
        draft: true,
        data: { ...pageData(siteA, "/about"), _status: "draft" },
      }),
      /uses this path/
    )
  })

  it("a SiteReader sees a Page only once it is Published", async () => {
    const page = await payload.create({
      collection: "pages",
      draft: true,
      data: { ...pageData(siteA, "/draft-then-published"), _status: "draft" },
    })

    const readerSees = async () =>
      (
        await payload.find({
          collection: "pages",
          user: readerA,
          overrideAccess: false,
          where: { path: { equals: "/draft-then-published" } },
        })
      ).docs.map((d) => d.id)

    expect(await readerSees()).toEqual([])

    await payload.update({
      collection: "pages",
      id: page.id,
      data: { _status: "published" },
    })
    expect(await readerSees()).toEqual([page.id])

    // Publishing again (another version) still works with the per-Site
    // unique path, and a newer Draft doesn't hide the Published version.
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Published twice", _status: "published" },
    })
    await payload.update({
      collection: "pages",
      id: page.id,
      draft: true,
      data: { title: "Unpublished edit" },
    })
    const { docs } = await payload.find({
      collection: "pages",
      user: readerA,
      overrideAccess: false,
      where: { id: { equals: page.id } },
    })
    expect(docs.map((d) => d.title)).toEqual(["Published twice"])
  })
})

describe("Blocks", () => {
  it("saves a Page with every Block type", async () => {
    const page = await payload.create({
      collection: "pages",
      user: editorA,
      overrideAccess: false,
      data: pageData(siteA, "/", [
        {
          blockType: "hero",
          heading: "Stay by the sea",
          subheading: "Cabins and condos",
          cta: { label: "Browse", href: "/rentals" },
        },
        { blockType: "richText", content: richText("Hello") },
        {
          blockType: "propertyGrid",
          source: "curatedList",
          curatedList: listA,
        },
        {
          blockType: "propertyGrid",
          source: "location",
          location: locationA,
          limit: 3,
        },
        { blockType: "curatedListCards", heading: "Themes", lists: [listA] },
        {
          blockType: "callToAction",
          heading: "Own a home?",
          button: { label: "Talk to us", href: "https://example.com/owners" },
          style: "secondary",
        },
        {
          blockType: "faq",
          items: [{ question: "Pets?", answer: richText("Some homes.") }],
        },
      ]),
    })

    const layout = page.layout ?? []
    expect(layout.map((b) => b.blockType)).toEqual([
      "hero",
      "richText",
      "propertyGrid",
      "propertyGrid",
      "curatedListCards",
      "callToAction",
      "faq",
    ])
    const grid = layout[2]
    expect(grid?.blockType === "propertyGrid" && grid.limit).toBe(6)
  })

  it.each([
    [
      "propertyGrid curatedList",
      () => ({
        blockType: "propertyGrid",
        source: "curatedList",
        curatedList: listB,
      }),
    ],
    [
      "propertyGrid location",
      () => ({
        blockType: "propertyGrid",
        source: "location",
        location: locationB,
      }),
    ],
    [
      "curatedListCards lists",
      () => ({ blockType: "curatedListCards", lists: [listA, listB] }),
    ],
  ] as const)(
    "rejects a %s reference to another Site's document",
    async (_, block) => {
      const data = pageData(siteA, "/cross-site", [block()])
      // As the Editor, and even with overrideAccess (as the Sync would).
      await expectRejected(
        payload.create({
          collection: "pages",
          user: editorA,
          overrideAccess: false,
          data,
        }),
        /invalid selections/
      )
      await expectRejected(
        payload.create({ collection: "pages", data }),
        /invalid selections/
      )
    }
  )

  it("rejects adding another Site's document to an existing Page", async () => {
    const page = await payload.create({
      collection: "pages",
      data: pageData(siteA, "/themes", [
        { blockType: "curatedListCards", lists: [listA] },
      ]),
    })
    await expectRejected(
      payload.update({
        collection: "pages",
        id: page.id,
        user: editorA,
        overrideAccess: false,
        data: { layout: [{ blockType: "curatedListCards", lists: [listB] }] },
      }),
      /invalid selections/
    )
  })

  it("rejects another Site's Media as the Hero or SEO image", async () => {
    const ok = await payload.create({
      collection: "pages",
      data: {
        ...pageData(siteA, "/images", [
          { blockType: "hero", heading: "Hi", image: mediaA },
        ]),
        seo: { image: mediaA },
      },
    })
    expect(ok.id).toBeTruthy()

    await expectRejected(
      payload.create({
        collection: "pages",
        data: pageData(siteA, "/hero-b", [
          { blockType: "hero", heading: "Hi", image: mediaB },
        ]),
      }),
      /invalid selections/
    )
    await expectRejected(
      payload.create({
        collection: "pages",
        data: { ...pageData(siteA, "/seo-b"), seo: { image: mediaB } },
      }),
      /invalid selections/
    )
  })

  it("clears the Property Grid relationship its source doesn't use", async () => {
    const page = await payload.create({
      collection: "pages",
      depth: 0,
      data: pageData(siteA, "/grid", [
        {
          blockType: "propertyGrid",
          source: "location",
          location: locationA,
          // Left over from the other source, and on another Site.
          curatedList: listB,
        },
      ]),
    })
    const grid = page.layout?.[0]
    expect(grid).toMatchObject({ location: locationA, curatedList: null })
  })

  it("requires the relationship its source uses", async () => {
    await expectRejected(
      payload.create({
        collection: "pages",
        data: pageData(siteA, "/grid-empty", [
          { blockType: "propertyGrid", source: "location", limit: 6 },
        ]),
      }),
      /Location.*required/
    )
  })
})
