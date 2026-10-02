import { describe, expect, it } from "vitest"

import type { Page } from "../../../payload-types"
import type { PageDocument } from "../state"
import {
  NEW_PAGE_TITLE,
  freePath,
  newPageDocument,
  pageDataFromDocument,
  pageDocumentFromPage,
} from "./pageDocument"

const stored = (over: Partial<Page> = {}): Page => ({
  id: 4,
  title: "About",
  path: "/about",
  blocks: [
    {
      id: "b1",
      blockType: "hero",
      heading: "About us",
      subheading: null,
      image: 7,
      cta: { label: "", href: "" },
    },
    {
      id: "b2",
      blockType: "faq",
      heading: "Questions",
      items: [{ question: "Q?", answer: "A." }],
    } as never,
  ],
  layout: { mode: "route", layout: null },
  seo: { title: null, description: "About the place", image: null },
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
})

describe("pageDocumentFromPage", () => {
  it("holds every stored Block as stored, including Blocks the old form could not edit", () => {
    const doc = pageDocumentFromPage(stored())
    expect(doc.kind).toBe("page")
    expect(doc.blocks.map((b) => b.blockType)).toEqual(["hero", "faq"])
    expect(doc.blocks[1]).toMatchObject({ id: "b2", heading: "Questions" })
  })

  it("turns the Layout choice into the editor's", () => {
    expect(pageDocumentFromPage(stored()).layout).toEqual({ mode: "default" })
    expect(
      pageDocumentFromPage(stored({ layout: { mode: "none", layout: null } }))
        .layout
    ).toEqual({ mode: "none" })
    expect(
      pageDocumentFromPage(stored({ layout: { mode: "specific", layout: 9 } }))
        .layout
    ).toEqual({ mode: "layout", layoutId: 9 })
    expect(pageDocumentFromPage(stored({ layout: undefined })).layout).toEqual({
      mode: "default",
    })
  })

  it("reads an unset SEO as empty text", () => {
    expect(pageDocumentFromPage(stored()).seo).toEqual({
      title: "",
      description: "About the place",
      image: null,
    })
    expect(pageDocumentFromPage(stored({ seo: undefined })).seo).toEqual({
      title: "",
      description: "",
      image: null,
    })
  })

  it("reads a Page with no Blocks", () => {
    expect(pageDocumentFromPage(stored({ blocks: null })).blocks).toEqual([])
  })
})

describe("pageDataFromDocument", () => {
  const doc = (over: Partial<PageDocument> = {}): PageDocument => ({
    ...pageDocumentFromPage(stored()),
    ...over,
  })

  it("writes the Blocks as they are, leaving out the ids the editor made up", () => {
    const data = pageDataFromDocument(
      doc({
        blocks: [
          { id: "b1", blockType: "hero" } as never,
          { id: "new-3", blockType: "richText" } as never,
        ],
      })
    )
    expect(data.blocks).toEqual([
      { id: "b1", blockType: "hero" },
      { blockType: "richText" },
    ])
  })

  it("leaves out the ids the editor made up inside Containers too", () => {
    const data = pageDataFromDocument(
      doc({
        blocks: [
          {
            id: "new-1",
            blockType: "container",
            children: [
              { id: "c1", blockType: "button" },
              {
                id: "new-2",
                blockType: "container",
                children: [{ id: "new-3", blockType: "image" }],
              },
            ],
          } as never,
        ],
      })
    )
    expect(data.blocks).toEqual([
      {
        blockType: "container",
        children: [
          { id: "c1", blockType: "button" },
          { blockType: "container", children: [{ blockType: "image" }] },
        ],
      },
    ])
  })

  it("writes the Layout choice, and a Layout only for a specific one", () => {
    expect(pageDataFromDocument(doc()).layout).toEqual({ mode: "route" })
    expect(
      pageDataFromDocument(doc({ layout: { mode: "none" } })).layout
    ).toEqual({ mode: "none" })
    expect(
      pageDataFromDocument(doc({ layout: { mode: "layout", layoutId: 9 } }))
        .layout
    ).toEqual({ mode: "specific", layout: 9 })
  })

  it("writes empty SEO text as null", () => {
    expect(pageDataFromDocument(doc()).seo).toEqual({
      title: null,
      description: "About the place",
      image: null,
    })
  })

  it("carries the title and path", () => {
    expect(pageDataFromDocument(doc())).toMatchObject({
      title: "About",
      path: "/about",
    })
  })
})

describe("a new Page", () => {
  it("is Untitled Page with a Hero, using the Site's default Layout", () => {
    const doc = newPageDocument("/untitled-page")
    expect(doc).toMatchObject({
      kind: "page",
      title: NEW_PAGE_TITLE,
      path: "/untitled-page",
      layout: { mode: "default" },
    })
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0]).toMatchObject({ blockType: "hero" })
    expect((doc.blocks[0] as { heading: string }).heading).not.toBe("")
  })

  it("takes the first path no Page uses", () => {
    expect(freePath("/untitled-page", [])).toBe("/untitled-page")
    expect(freePath("/untitled-page", ["/untitled-page"])).toBe(
      "/untitled-page-2"
    )
    expect(
      freePath("/untitled-page", ["/untitled-page", "/untitled-page-2"])
    ).toBe("/untitled-page-3")
    expect(freePath("/untitled-page", ["/untitled-page-2"])).toBe(
      "/untitled-page"
    )
  })
})
