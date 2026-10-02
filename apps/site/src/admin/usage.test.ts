import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { pageBlocks } from "../blocks"
import { Layouts } from "../collections/Layouts"
import type { Brand, Layout, Page, Seo } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import type { PageDocument } from "./editor/state"
import { hasMediaField } from "./mediaUses"
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

const layout = (
  id: number,
  name: string,
  extra: Partial<Layout> = {}
): Pick<Layout, "id" | "name" | "header" | "footer"> => ({
  id,
  name,
  header: [],
  footer: [],
  ...extra,
})

/**
 * A Layout's Header takes only the Layout's own Blocks, none of which has an
 * image yet. To prove an image in a Layout's Block is found whichever Block it
 * is, the Header here takes every Page Block.
 */
const layoutFieldsTakingEveryBlock = Layouts.fields.map((field) =>
  "name" in field && field.name === "header" && field.type === "blocks"
    ? { ...field, blocks: pageBlocks }
    : field
)

const IMAGE = 9
const OTHER = 10

/**
 * Each Block that has an image field: a Block holding the image (and
 * nothing else), the name the Admin gives the Block, and where in it the
 * image sits.
 */
const withImage: Record<
  string,
  { label: string; where: string; block: (media: number) => object }
> = {
  hero: {
    label: "Hero",
    where: "Image",
    block: (image) => ({ heading: "Welcome", image }),
  },
  searchHero: {
    label: "Search Hero",
    where: "Image",
    block: (image) => ({ heading: "Find your stay", image }),
  },
  amenities: {
    label: "Amenities",
    where: "Amenity 2: Image",
    block: (image) => ({
      heading: "Everything you need",
      variant: "mosaic",
      items: [{ label: "Wi-Fi" }, { label: "Pool", image }, { label: "Spa" }],
    }),
  },
  imageText: {
    label: "Image + text",
    where: "Image",
    block: (image) => ({ heading: "A home", text: "By the sea", image }),
  },
  location: {
    label: "Location",
    where: "Map image",
    block: (mapImage) => ({
      heading: "Find us",
      address: "12 Harbour Road",
      map: "image",
      mapImage,
    }),
  },
  trustStrip: {
    label: "Trust strip",
    where: "Logo 2: Image",
    block: (image) => ({
      variant: "logos",
      logos: [
        { name: "Other", image: 10 },
        { name: "Partner", image },
      ],
    }),
  },
  container: {
    label: "Container",
    where: "Hero 2: Image",
    block: (image) => ({
      children: [
        { blockType: "richText" },
        { blockType: "hero", heading: "Welcome", image },
      ],
    }),
  },
}

describe("which Blocks hold images", () => {
  it("has a case below for every Block with an image field (add one when a Block gains an image)", () => {
    const bearing = pageBlocks
      .filter((block) => hasMediaField(block.fields))
      .map((block) => block.slug)
    expect(bearing.sort()).toEqual(Object.keys(withImage).sort())
  })
})

describe("mediaDependents: images in Blocks", () => {
  const blocks = (kind: string) =>
    [
      { id: "b0", blockType: "richText" },
      { id: "b1", blockType: kind, ...withImage[kind]!.block(IMAGE) },
    ] as never

  describe.each(Object.entries(withImage))("%s", (kind, { label, where }) => {
    const block = `Block 2, ${label}`

    it("is found in a Page's Draft", () => {
      const result = mediaDependents({
        brand: {} as Brand,
        seo: {} as Seo,
        pages: [
          { ...page(1, "Home", { blocks: blocks(kind) }), version: "draft" },
        ],
      })
      expect(result.get(IMAGE)).toEqual([
        {
          kind: "Page",
          name: `Home, ${block} (${where})`,
          href: "/admin/pages/1",
        },
      ])
    })

    it("is found in a Published Page, whatever the Draft shows", () => {
      const result = mediaDependents({
        brand: {} as Brand,
        seo: {} as Seo,
        pages: [
          { ...page(1, "Home v2"), version: "draft" },
          {
            ...page(1, "Home", { blocks: blocks(kind) }),
            version: "published",
          },
        ],
      })
      expect(result.get(IMAGE)).toEqual([
        {
          kind: "Page",
          name: `Home v2, ${block} (${where}, Published only)`,
          href: "/admin/pages/1",
        },
      ])
    })

    it("is found once when a Page's Draft and Published copies both use it", () => {
      const both = (version: "draft" | "published") => ({
        ...page(1, "Home", { blocks: blocks(kind) }),
        version,
      })
      const result = mediaDependents({
        brand: {} as Brand,
        seo: {} as Seo,
        pages: [both("draft"), both("published")],
      })
      expect(result.get(IMAGE)).toEqual([
        {
          kind: "Page",
          name: `Home, ${block} (${where})`,
          href: "/admin/pages/1",
        },
      ])
    })

    it("is found in a Layout", () => {
      const result = mediaDependents({
        brand: {} as Brand,
        seo: {} as Seo,
        pages: [],
        layouts: [layout(3, "Main", { header: blocks(kind) })],
        layoutFields: layoutFieldsTakingEveryBlock,
      })
      expect(result.get(IMAGE)).toEqual([
        {
          kind: "Layout",
          name: `Main, Header ${block} (${where})`,
          href: "/admin/layouts/3",
        },
      ])
    })
  })

  it("finds the other images of a Block too", () => {
    const result = mediaDependents({
      brand: {} as Brand,
      seo: {} as Seo,
      pages: [page(1, "Home", { blocks: blocks("trustStrip") })],
    })
    expect(result.get(OTHER)?.map((d) => d.name)).toEqual([
      "Home, Block 2, Trust strip (Logo 1: Image)",
    ])
  })

  it("says which copy of a Page uses the image when only one does", () => {
    const result = mediaDependents({
      brand: {} as Brand,
      seo: {} as Seo,
      pages: [
        { ...page(1, "Home", { blocks: blocks("hero") }), version: "draft" },
        {
          ...page(1, "Home", {
            blocks: [
              { id: "b9", blockType: "searchHero", heading: "x", image: IMAGE },
            ] as never,
          }),
          version: "published",
        },
      ],
    })
    expect(result.get(IMAGE)?.map((d) => d.name)).toEqual([
      "Home, Block 2, Hero (Image, Draft only)",
      "Home, Block 1, Search Hero (Image, Published only)",
    ])
  })

  it("names each Block once, however many of its tiles show the image", () => {
    const result = mediaDependents({
      brand: {} as Brand,
      seo: {} as Seo,
      pages: [
        page(1, "Home", {
          blocks: [
            {
              id: "a",
              blockType: "amenities",
              heading: "x",
              variant: "mosaic",
              items: [
                { label: "One", image: IMAGE },
                { label: "Two" },
                { label: "Three", image: { id: IMAGE } as never },
              ],
            },
            { id: "b", blockType: "hero", heading: "y", image: IMAGE },
          ] as never,
          seo: { image: IMAGE },
        }),
      ],
    })
    expect(result.get(IMAGE)?.map((d) => d.name)).toEqual([
      "Home, Block 1, Amenities (Amenity 1: Image, Amenity 3: Image)",
      "Home, Block 2, Hero (Image)",
      "Home, SEO image",
    ])
  })
})

describe("mediaDependents: Brand, SEO and Pages' SEO images", () => {
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

  it("names a Page's SEO image once, for its Draft and Published copies", () => {
    const result = mediaDependents({
      brand: {} as Brand,
      seo: {} as Seo,
      pages: [
        { ...page(1, "Home v2", { seo: { image: 9 } }), version: "draft" },
        { ...page(1, "Home", { seo: { image: 9 } }), version: "published" },
        page(2, "About", { seo: { image: { id: 9 } as never } }),
        page(3, "Other", { seo: { image: 10 } }),
      ],
    })
    expect(result.get(9)).toEqual([
      { kind: "Page", name: "Home v2, SEO image", href: "/admin/pages/1" },
      { kind: "Page", name: "About, SEO image", href: "/admin/pages/2" },
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
      "Home, Block 1, Hero (Image, Published only)",
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
