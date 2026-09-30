import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Brand, Page, Seo } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import type { PageDocument } from "./editor/state"
import { emptyBlock } from "./pageForm"
import { savePageAs } from "./pageSave"

/** A Page document with nothing in it but what a test names. */
const pageDoc = (over: Partial<PageDocument> = {}): PageDocument => ({
  kind: "page",
  title: "",
  path: "",
  layout: { mode: "default" },
  blocks: [],
  seo: { title: "", description: "", image: null },
  ...over,
})
import {
  loadMediaDependents,
  loadPageDependents,
  mediaDependents,
  pagesLinkingTo,
} from "./usage"

const page = (
  id: number,
  title: string,
  extra: Partial<Page> = {}
): Pick<Page, "id" | "title" | "path" | "blocks" | "seo"> => ({
  id,
  title,
  path: `/p${id}`,
  blocks: [],
  ...extra,
})

describe("mediaDependents", () => {
  it("names the Brand logo, the SEO share image and the favicon", () => {
    const result = mediaDependents({
      brand: { logo: 5 } as Brand,
      seo: { image: 6, favicon: { id: 5 } } as unknown as Seo,
      pages: [],
    })
    expect(result.get(5)).toEqual([
      { kind: "Brand setting", name: "Logo", href: "/admin/settings/brand" },
      { kind: "SEO setting", name: "Favicon", href: "/admin/settings/seo" },
    ])
    expect(result.get(6)).toEqual([
      {
        kind: "SEO setting",
        name: "Social share image",
        href: "/admin/settings/seo",
      },
    ])
    expect(result.get(7)).toBeUndefined()
  })

  it("names a Page once when its Draft and Published copies both use the image", () => {
    const result = mediaDependents({
      brand: {} as Brand,
      seo: {} as Seo,
      pages: [
        page(1, "Home v2", { seo: { image: 9 } }),
        page(1, "Home", {
          blocks: [{ blockType: "hero", heading: "Hi", image: 9 }],
        }),
      ],
    })
    expect(result.get(9)).toEqual([
      {
        kind: "Page",
        name: "Home v2 (SEO image, hero image)",
        href: "/admin/pages/1",
      },
    ])
  })

  it("names each Page that uses the image once, and where", () => {
    const result = mediaDependents({
      brand: {} as Brand,
      seo: {} as Seo,
      pages: [
        page(1, "Home", {
          blocks: [
            { blockType: "hero", heading: "Hi", image: 9 },
            { blockType: "hero", heading: "Again", image: 9 },
          ],
          seo: { image: 9 },
        }),
        page(2, "About", { seo: { image: { id: 9 } as never } }),
        page(3, "Other", { seo: { image: 10 } }),
      ],
    })
    expect(result.get(9)).toEqual([
      {
        kind: "Page",
        name: "Home (hero image, SEO image)",
        href: "/admin/pages/1",
      },
      { kind: "Page", name: "About (SEO image)", href: "/admin/pages/2" },
    ])
  })
})

describe("pagesLinkingTo", () => {
  const withButton = (id: number, title: string, href: string, own = false) =>
    page(id, title, {
      path: own ? href : `/p${id}`,
      blocks: [
        {
          blockType: "callToAction",
          heading: "Go",
          style: "primary",
          button: { href },
        },
      ],
    })

  it("finds Pages whose buttons link to the path, however it is written", () => {
    const result = pagesLinkingTo("/stays", 99, [
      withButton(1, "Home", "/stays"),
      withButton(2, "About", "/stays/"),
      withButton(3, "Contact", "/stays?room=2#top"),
      withButton(4, "Elsewhere", "/other"),
      withButton(5, "External", "https://example.com/stays"),
    ])
    expect(result.map((d) => d.name)).toEqual(["Home", "About", "Contact"])
    expect(result[0]).toEqual({
      kind: "Page",
      name: "Home",
      href: "/admin/pages/1",
    })
  })

  it("ignores the Page itself and finds hero buttons too", () => {
    const result = pagesLinkingTo("/", 1, [
      withButton(1, "Home", "/"),
      page(2, "About", {
        blocks: [{ blockType: "hero", heading: "x", cta: { href: "/" } }],
      }),
    ])
    expect(result.map((d) => d.name)).toEqual(["About"])
  })
})

describe("looking things up in the database", () => {
  let t: TestPayload
  let access: {
    overrideAccess: false
    user: Parameters<typeof savePageAs>[1]["user"]
  }
  let logo: number

  beforeAll(async () => {
    t = await getTestPayload()
    const user = await t.payload.create({
      collection: "users",
      data: { email: "staff@awayday.test", entraOid: "staff" },
    })
    access = { overrideAccess: false, user: { ...user, collection: "users" } }
    const media = await t.payload.create({
      collection: "media",
      data: { alt: "Logo" },
      file: {
        data: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
          "base64"
        ),
        mimetype: "image/png",
        name: `usage-${Date.now()}.png`,
        size: 70,
      },
      ...access,
    })
    logo = media.id
  })

  afterAll(async () => {
    await t?.payload.delete({
      collection: "media",
      where: { id: { exists: true } },
    })
    await t?.teardown()
  })

  it("finds the Brand logo and both the Draft and Published uses in Pages", async () => {
    await t.payload.updateGlobal({
      slug: "brand",
      data: { name: "Test", logo },
      ...access,
    })
    // Published with the image, then a Draft that dropped it: visitors still
    // see it, so it still counts.
    const hero = { ...emptyBlock("hero"), heading: "Hi", image: logo }
    const saved = await savePageAs(t.payload, access, {
      id: null,
      intent: "publish",
      document: pageDoc({ title: "Home", path: "/", blocks: [hero] }),
    })
    await savePageAs(t.payload, access, {
      id: saved.id!,
      intent: "draft",
      document: {
        ...saved.document!,
        blocks: [{ ...saved.document!.blocks[0]!, image: null } as never],
      },
    })

    const usage = await loadMediaDependents(t.payload, access)
    expect(usage.get(logo)?.map((d) => d.name)).toEqual([
      "Logo",
      "Home (hero image)",
    ])
  })

  it("finds Pages that link to a Page's path", async () => {
    await savePageAs(t.payload, access, {
      id: null,
      intent: "draft",
      document: pageDoc({
        title: "Stays",
        path: "/stays",
        blocks: [
          {
            ...emptyBlock("callToAction"),
            heading: "Book",
            button: { label: "Rooms", href: "/rooms" },
          } as never,
        ],
      }),
    })
    const rooms = await savePageAs(t.payload, access, {
      id: null,
      intent: "draft",
      document: pageDoc({ title: "Rooms", path: "/rooms" }),
    })
    const dependents = await loadPageDependents(t.payload, access, {
      id: rooms.id!,
      path: "/rooms",
    })
    expect(dependents.map((d) => d.name)).toEqual(["Stays"])
  })

  it("finds the Layouts whose menus link to a Page", async () => {
    const team = await savePageAs(t.payload, access, {
      id: null,
      intent: "publish",
      document: pageDoc({ title: "Team", path: "/team" }),
    })
    const layout = await t.payload.create({
      collection: "layouts",
      data: {
        name: "Usage menu",
        header: [
          {
            blockType: "navigation",
            items: [
              {
                label: "More",
                children: [
                  { label: "Team", link: { type: "page", page: team.id! } },
                ],
              },
            ],
          },
        ],
        footer: [
          {
            blockType: "footerColumns",
            columns: [
              {
                heading: "Company",
                content: "links",
                links: [
                  { label: "Team", link: { type: "page", page: team.id! } },
                ],
              },
            ],
          },
        ],
      },
      ...access,
    })
    const dependents = await loadPageDependents(t.payload, access, {
      id: team.id!,
      path: "/team",
    })
    expect(dependents).toEqual([
      {
        kind: "Layout",
        name: "Usage menu (Navigation)",
        href: `/admin/layouts/${layout.id}`,
      },
      {
        kind: "Layout",
        name: 'Usage menu (Footer columns "Company")',
        href: `/admin/layouts/${layout.id}`,
      },
    ])
    await t.payload.update({
      collection: "layouts",
      id: layout.id,
      data: { header: [], footer: [] },
      ...access,
    })
  })
})
