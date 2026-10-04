import { describe, expect, it } from "vitest"

import { Pages } from "../../collections/Pages"
import { parseTextQuery, replaceText, type TextQuery } from "./text"

const query = (over: Partial<TextQuery> = {}): TextQuery => ({
  find: "Awayday",
  replaceWith: "Away Day",
  caseSensitive: false,
  wholeWord: false,
  ...over,
})

const run = (text: string, format = 0) => ({
  type: "text",
  version: 1,
  text,
  format,
  detail: 0,
  mode: "normal",
  style: "",
})

const rich = (...runs: object[]) => ({
  root: {
    type: "root",
    version: 1,
    direction: null,
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        children: runs,
      },
    ],
  },
})

const container = (children: object[], columns = "1") => ({
  blockType: "container",
  columns,
  children,
})

const replace = (page: object, over?: Partial<TextQuery>) =>
  replaceText(Pages.fields, page, query(over))

describe("replaceText", () => {
  it("replaces in a Page's title, its Blocks and its SEO, and says where", () => {
    const page = {
      title: "About Awayday",
      path: "/awayday",
      blocks: [
        { blockType: "hero", heading: "Awayday stays", subheading: "Welcome" },
        {
          blockType: "faq",
          questions: [
            { question: "Who?", answer: "Us" },
            { question: "Why awayday?", answer: "Awayday, awayday." },
          ],
        },
      ],
      seo: { title: "Awayday", description: "" },
    }
    const { data, hits } = replace(page)
    expect(data).toMatchObject({
      title: "About Away Day",
      path: "/awayday",
      blocks: [
        { heading: "Away Day stays", subheading: "Welcome" },
        {
          questions: [
            { question: "Who?", answer: "Us" },
            { question: "Why Away Day?", answer: "Away Day, Away Day." },
          ],
        },
      ],
      seo: { title: "Away Day" },
    })
    expect(
      hits.map((hit) => [hit.block ?? null, hit.where, hit.count])
    ).toEqual([
      [null, "Title", 1],
      ["Block 1, Hero", "Heading", 1],
      ["Block 2, FAQ", "Question 2: Question", 1],
      ["Block 2, FAQ", "Question 2: Answer", 2],
      [null, "SEO: SEO title", 1],
    ])
  })

  it("leaves a path, a link's URL and an icon's name alone", () => {
    const page = {
      title: "Home",
      path: "/awayday",
      blocks: [
        {
          blockType: "hero",
          heading: "Hello",
          cta: { label: "Awayday", href: "/awayday" },
        },
      ],
    }
    const { data, hits } = replace(page)
    expect(data).toMatchObject({
      path: "/awayday",
      blocks: [{ cta: { label: "Away Day", href: "/awayday" } }],
    })
    expect(hits).toHaveLength(1)
  })

  it("finds text in a Container three levels deep", () => {
    const page = {
      title: "Home",
      blocks: [
        container(
          [
            { blockType: "richText" },
            container([container([{ blockType: "hero", heading: "Awayday" }])]),
          ],
          "2"
        ),
      ],
    }
    const { data, hits } = replace(page)
    expect(hits).toEqual([
      {
        block:
          "Block 1, Container, Column 2, Container, Block 1, Container, Block 1, Hero",
        where: "Heading",
        count: 1,
      },
    ])
    expect(JSON.stringify(data)).toContain('"heading":"Away Day"')
  })

  it("replaces in the runs of rich text, keeping their formats", () => {
    const page = {
      title: "Home",
      blocks: [
        {
          blockType: "richText",
          content: rich(run("Stay with Awayday. "), run("Awayday", 1)),
        },
      ],
    }
    const { data, hits } = replace(page)
    expect(hits).toEqual([
      { block: "Block 1, Rich text", where: "Content", count: 2 },
    ])
    expect(data).toMatchObject({
      blocks: [
        {
          content: rich(run("Stay with Away Day. "), run("Away Day", 1)),
        },
      ],
    })
  })

  it("doesn't find a match split across two formats", () => {
    const page = {
      title: "Home",
      blocks: [
        { blockType: "richText", content: rich(run("Away"), run("day", 1)) },
      ],
    }
    expect(replace(page).hits).toEqual([])
  })

  it("matches any case unless asked to match the case", () => {
    const page = { title: "awayday AWAYDAY Awayday" }
    expect(replace(page).data).toEqual({
      title: "Away Day Away Day Away Day",
    })
    expect(replace(page, { caseSensitive: true }).data).toEqual({
      title: "awayday AWAYDAY Away Day",
    })
  })

  it("matches whole words only when asked", () => {
    const page = { title: "Awaydays at Awayday, Awayday's" }
    expect(replace(page, { wholeWord: true }).data).toEqual({
      title: "Awaydays at Away Day, Away Day's",
    })
  })

  it("reads the text to find as it is typed, not as a pattern", () => {
    const page = { title: "From $10 (a.b)" }
    expect(replace(page, { find: "a.b", replaceWith: "$&" }).data).toEqual({
      title: "From $10 ($&)",
    })
    expect(replace(page, { find: ".", replaceWith: "!" }).data).toEqual({
      title: "From $10 (a!b)",
    })
  })

  it("doesn't count text that is already the replacement", () => {
    const page = { title: "Awayday and awayday" }
    const { data, hits } = replace(page, {
      find: "awayday",
      replaceWith: "Awayday",
    })
    expect(data).toEqual({ title: "Awayday and Awayday" })
    expect(hits).toEqual([{ block: undefined, where: "Title", count: 1 }])
    const done = { title: "Awayday" }
    expect(
      replace(done, { find: "awayday", replaceWith: "Awayday" }).data
    ).toBe(done)
  })

  it("leaves the tokens the Site fills in alone", () => {
    const page = { title: "© {year} {name}. Your name here" }
    expect(replace(page, { find: "name", replaceWith: "title" }).data).toEqual({
      title: "© {year} {name}. Your title here",
    })
  })

  it("returns the document itself when nothing matches", () => {
    const page = { title: "Home", blocks: [{ blockType: "hero" }] }
    expect(replace(page).data).toBe(page)
  })
})

describe("parseTextQuery", () => {
  it("needs something to find", () => {
    expect(parseTextQuery({ find: "  ", replaceWith: "x" })).toEqual({
      ok: false,
      message: "Enter the text to find.",
    })
  })

  it("refuses a replacement that changes nothing", () => {
    expect(parseTextQuery({ find: "a", replaceWith: "a" }).ok).toBe(false)
  })

  it("keeps spaces, and allows replacing with nothing", () => {
    expect(parseTextQuery({ find: " Ltd", replaceWith: "" })).toEqual({
      ok: true,
      query: {
        find: " Ltd",
        replaceWith: "",
        caseSensitive: false,
        wholeWord: false,
      },
    })
  })
})
