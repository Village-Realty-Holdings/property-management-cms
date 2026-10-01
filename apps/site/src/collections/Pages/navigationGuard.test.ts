import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { Layout, User } from "../../payload-types"
import { linksOf } from "../../site/regions/links"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { truncateTables } from "../../test/truncateTables"
import { menusLinkingTo } from "./navigationGuard"

let t: TestPayload
let payload: Payload
let staff: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  staff = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(payload, "layouts", "_layouts_v", "pages", "_pages_v")
})

const asStaff = () =>
  ({
    overrideAccess: false,
    user: { ...staff, collection: "users" as const },
  }) as const

const makePage = (title: string, path: string) =>
  payload.create({
    collection: "pages",
    data: { title, path, _status: "published" },
    ...asStaff(),
  })

const makeLayout = (name: string, extra: Partial<Layout> = {}) =>
  payload.create({
    collection: "layouts",
    data: { name, ...extra },
    ...asStaff(),
  })

const pageLink = (page: number) => ({ type: "page" as const, page })

const navigation = (items: NonNullable<NavigationItems>): Layout["header"] => [
  { blockType: "navigation", items },
]
type NavigationItems = Extract<
  NonNullable<Layout["header"]>[number],
  { blockType: "navigation" }
>["items"]

/** The message and status of a rejected write. */
async function refusal(write: Promise<unknown>) {
  try {
    await write
  } catch (error) {
    const { message, status } = error as { message: string; status?: number }
    return { message, status }
  }
  throw new Error("Expected the delete to be refused")
}

describe("menusLinkingTo", () => {
  const layout = (overrides: Partial<Layout>) =>
    ({ id: 1, name: "Main", ...overrides }) as Layout

  it("finds a top-level Navigation link, and one inside a dropdown", () => {
    const layouts = [
      layout({
        id: 1,
        name: "Main",
        header: navigation([{ label: "Stays", link: pageLink(7) }]),
      }),
      layout({
        id: 2,
        name: "Seasonal",
        header: navigation([
          {
            label: "More",
            children: [{ label: "Guide", link: pageLink(7) }],
          },
        ]),
      }),
      layout({
        id: 3,
        name: "Other",
        header: navigation([{ label: "Elsewhere", link: pageLink(8) }]),
      }),
    ]
    expect(menusLinkingTo(7, layouts)).toEqual([
      { layoutId: 1, layoutName: "Main", menu: "Navigation" },
      { layoutId: 2, layoutName: "Seasonal", menu: "Navigation" },
    ])
  })

  it("ignores the hidden link of an item that has dropdown links", () => {
    // The item's own link is hidden in the Admin once it has dropdown links,
    // but Payload keeps the value; it must not block deleting the Page.
    const layouts = [
      layout({
        header: navigation([
          {
            label: "Stays",
            link: pageLink(7),
            children: [{ label: "Guide", link: pageLink(8) }],
          },
        ]),
      }),
    ]
    expect(menusLinkingTo(7, layouts)).toEqual([])
    expect(menusLinkingTo(8, layouts)).toHaveLength(1)
  })

  it("finds a Footer columns link, naming the column", () => {
    const layouts = [
      layout({
        footer: [
          {
            blockType: "footerColumns",
            columns: [
              { heading: "Explore", content: "links", links: [] },
              {
                heading: "Company",
                content: "links",
                links: [{ label: "About", link: pageLink(7) }],
              },
            ],
          },
        ],
      }),
    ]
    expect(menusLinkingTo(7, layouts)).toEqual([
      {
        layoutId: 1,
        layoutName: "Main",
        menu: 'Footer columns "Company"',
      },
    ])
  })

  it("names a menu once however many of its links point at the Page", () => {
    const layouts = [
      layout({
        header: navigation([
          { label: "A", link: pageLink(7) },
          { label: "B", link: pageLink(7) },
        ]),
      }),
    ]
    expect(menusLinkingTo(7, layouts)).toHaveLength(1)
  })

  it("reads a populated Page, and ignores a URL link that keeps an old Page", () => {
    const populated = [
      layout({
        header: navigation([
          {
            label: "A",
            link: { type: "page", page: { id: 7, path: "/a" } as never },
          },
        ]),
      }),
    ]
    expect(menusLinkingTo(7, populated)).toHaveLength(1)
    const onlyUrl = [
      layout({
        header: navigation([
          { label: "B", link: { type: "url", url: "/b", page: 7 } },
        ]),
      }),
    ]
    expect(menusLinkingTo(7, onlyUrl)).toEqual([])
  })

  it("ignores Blocks that hold no menu links", () => {
    const layouts = [
      layout({
        header: [{ blockType: "logo", size: "medium" }],
        footer: [{ blockType: "legalBar", text: "x" }],
      }),
    ]
    expect(menusLinkingTo(7, layouts)).toEqual([])
  })
})

describe("a menu link to a Page", () => {
  it("follows the Page when its path is renamed", async () => {
    const cottage = await makePage("Cottage", "/harbour-cottage")
    const main = await makeLayout("Main", {
      header: navigation([
        { label: "Our cottage", link: pageLink(cottage.id) },
      ]),
    })

    const hrefs = async () => {
      const layout = await payload.findByID({
        collection: "layouts",
        id: main.id,
        depth: 1,
      })
      const block = layout.header?.[0]
      if (block?.blockType !== "navigation") throw new Error("no menu")
      return linksOf(block.items).map((link) => link.href)
    }

    expect(await hrefs()).toEqual(["/harbour-cottage"])
    await payload.update({
      collection: "pages",
      id: cottage.id,
      data: { path: "/the-cottage" },
      ...asStaff(),
    })
    expect(await hrefs()).toEqual(["/the-cottage"])

    // What the Layout stores is still the relationship, never a path.
    const stored = await payload.findByID({
      collection: "layouts",
      id: main.id,
      depth: 0,
    })
    const block = stored.header?.[0]
    expect(block?.blockType === "navigation" && block.items?.[0]?.link).toEqual(
      expect.objectContaining({ type: "page", page: cottage.id })
    )
  })
})

describe("deleting a Page a menu links to", () => {
  const remove = (id: number) =>
    payload.delete({ collection: "pages", id, ...asStaff() })

  it("is refused, naming the Layout and the menu", async () => {
    const cottage = await makePage("Cottage", "/cottage")
    await makeLayout("Summer menu", {
      header: navigation([{ label: "Cottage", link: pageLink(cottage.id) }]),
    })
    const { message, status } = await refusal(remove(cottage.id))
    expect(message).toContain("Summer menu")
    expect(message).toContain("Navigation")
    expect(status).toBeGreaterThanOrEqual(400)
    expect(status).toBeLessThan(500)
    const still = await payload.find({
      collection: "pages",
      where: { id: { equals: cottage.id } },
    })
    expect(still.totalDocs).toBe(1)
  })

  it("is refused for a link inside a dropdown or a Footer column", async () => {
    const guide = await makePage("Guide", "/guide")
    const about = await makePage("About", "/about")
    await makeLayout("Dropdown layout", {
      header: navigation([
        {
          label: "More",
          children: [{ label: "Guide", link: pageLink(guide.id) }],
        },
      ]),
      footer: [
        {
          blockType: "footerColumns",
          columns: [
            {
              heading: "Company",
              content: "links",
              links: [{ label: "About", link: pageLink(about.id) }],
            },
          ],
        },
      ],
    })
    expect((await refusal(remove(guide.id))).message).toContain(
      "Dropdown layout"
    )
    const footer = await refusal(remove(about.id))
    expect(footer.message).toContain("Dropdown layout")
    expect(footer.message).toContain("Company")
  })

  it("lists every Layout that links to it", async () => {
    const cottage = await makePage("Cottage", "/cottage")
    for (const name of ["First", "Second"]) {
      await makeLayout(name, {
        header: navigation([{ label: "Cottage", link: pageLink(cottage.id) }]),
      })
    }
    const { message } = await refusal(remove(cottage.id))
    expect(message).toContain("First")
    expect(message).toContain("Second")
  })

  it("goes ahead for a Page no menu links to, and once the link is gone", async () => {
    const cottage = await makePage("Cottage", "/cottage")
    const other = await makePage("Other", "/other")
    const layout = await makeLayout("Main", {
      header: navigation([{ label: "Cottage", link: pageLink(cottage.id) }]),
    })
    await remove(other.id)
    await refusal(remove(cottage.id))
    await payload.update({
      collection: "layouts",
      id: layout.id,
      data: { header: navigation([]) },
      ...asStaff(),
    })
    await remove(cottage.id)
    const left = await payload.find({ collection: "pages", pagination: false })
    expect(left.totalDocs).toBe(0)
  })
})
