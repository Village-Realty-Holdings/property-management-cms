// @vitest-environment jsdom
import { cleanup, render, within } from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import type { BlogTeaserBlock as BlogTeaserData } from "../../payload-types"
import { backgrounds } from "../../fields/background"
import { fixtures as avada } from "../fixtures/avada"
import type { BlogPost, SiteFixtures } from "../fixtures/types"
import { fixtures as warrenBeach } from "../fixtures/warren_beach"
import { Block } from "."

afterEach(cleanup)

const teaser = (overrides: Partial<BlogTeaserData> = {}): BlogTeaserData => ({
  blockType: "blogTeaser",
  heading: "From the journal",
  ...overrides,
})

const post = (n: number, overrides: Partial<BlogPost> = {}): BlogPost => ({
  title: `Post ${n}`,
  excerpt: `Excerpt of post ${n}.`,
  date: `2026-0${n}-09`,
  image: { src: `/fixtures/post-${n}.webp`, alt: `Picture for post ${n}` },
  url: `https://example.com/blog/post-${n}`,
  ...overrides,
})

const withPosts = (posts: BlogPost[]): SiteFixtures => ({
  rentals: [],
  posts,
})

const renderTeaser = (
  block: BlogTeaserData,
  fixtures: SiteFixtures,
  index = 1
) => render(<Block block={block} index={index} fixtures={fixtures} />)

async function violations(element: HTMLElement) {
  const results = await axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: { "color-contrast": { enabled: false } },
  })
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.html),
  }))
}

describe("Blog teaser", () => {
  it("shows the Site's first three posts as cards", () => {
    const { getAllByRole } = renderTeaser(
      teaser(),
      withPosts([post(1), post(2), post(3), post(4)])
    )
    const cards = getAllByRole("article")
    expect(cards).toHaveLength(3)
    expect(
      cards.map((card) => within(card).getByRole("heading").textContent)
    ).toEqual(["Post 1", "Post 2", "Post 3"])
  })

  it("shows fewer cards when the Site has fewer posts", () => {
    const { getAllByRole } = renderTeaser(
      teaser(),
      withPosts([post(1), post(2)])
    )
    expect(getAllByRole("article")).toHaveLength(2)
  })

  it("gives each card its image, its date as a <time> and its excerpt", () => {
    const { getAllByRole } = renderTeaser(
      teaser(),
      withPosts([post(1, { date: "2026-05-18" })])
    )
    const card = getAllByRole("article")[0]!
    expect(within(card).getByRole("img").getAttribute("alt")).toBe(
      "Picture for post 1"
    )
    const time = card.querySelector("time")!
    expect(time.getAttribute("datetime")).toBe("2026-05-18")
    expect(time.textContent).toBe("May 18, 2026")
    expect(card.textContent).toContain("Excerpt of post 1.")
  })

  it("leaves the date out rather than showing a bad one", () => {
    const { getAllByRole } = renderTeaser(
      teaser(),
      withPosts([post(1, { date: "soon" })])
    )
    expect(getAllByRole("article")[0]!.querySelector("time")).toBeNull()
  })

  it("links each card's title out to its post, without handing over the opener", () => {
    const { getAllByRole } = renderTeaser(
      teaser(),
      withPosts([post(1), post(2), post(3)])
    )
    const hrefs = getAllByRole("article").map((card) => {
      const heading = within(card).getByRole("heading")
      const link = within(heading).getByRole("link", { name: /^Post \d$/ })
      expect(link.getAttribute("rel")).toMatch(/\bnoopener\b/)
      expect(link.getAttribute("rel")).toMatch(/\bnoreferrer\b/)
      return link.getAttribute("href")
    })
    expect(hrefs).toEqual([
      "https://example.com/blog/post-1",
      "https://example.com/blog/post-2",
      "https://example.com/blog/post-3",
    ])
  })

  it("keeps a post on this Site as a plain Site link", () => {
    const { getByRole } = renderTeaser(
      teaser(),
      withPosts([post(1, { url: "/blog/post-1" })])
    )
    const link = getByRole("link", { name: "Post 1" })
    expect(link.getAttribute("href")).toBe("/blog/post-1")
    expect(link.getAttribute("rel")).toBeNull()
  })

  it("has one link per card, so the card is a single tab stop", () => {
    const { getAllByRole } = renderTeaser(
      teaser(),
      withPosts([post(1), post(2), post(3)])
    )
    for (const card of getAllByRole("article")) {
      expect(within(card).getAllByRole("link")).toHaveLength(1)
    }
  })

  it("names its section by its heading, with the cards one level below", () => {
    const { getByRole, getAllByRole } = renderTeaser(
      teaser(),
      withPosts([post(1)])
    )
    const section = getByRole("region", { name: "From the journal" })
    expect(within(section).getByRole("heading", { level: 2 })).toBeTruthy()
    expect(
      within(getAllByRole("article")[0]!).getByRole("heading", { level: 3 })
    ).toBeTruthy()
  })

  it("shows a friendly message, and no cards, when the Site has no posts", () => {
    const { queryAllByRole, getByRole, getByText } = renderTeaser(
      teaser(),
      withPosts([])
    )
    expect(queryAllByRole("article")).toHaveLength(0)
    expect(getByRole("heading", { name: "From the journal" })).toBeTruthy()
    expect(getByText(/no posts yet/i)).toBeTruthy()
  })

  it("shows the all-posts link when it has a label and a link", () => {
    const { getByRole } = renderTeaser(
      teaser({ allPostsLink: { label: "Read all posts", href: "/blog" } }),
      withPosts([post(1)])
    )
    expect(
      getByRole("link", { name: "Read all posts" }).getAttribute("href")
    ).toBe("/blog")
  })

  it.each([
    ["has no label", { label: "", href: "/blog" }],
    ["has no link", { label: "Read all posts", href: "" }],
    ["has an unsafe link", { label: "Read all posts", href: "javascript:x" }],
  ])("leaves the all-posts link out when it %s", (_name, allPostsLink) => {
    const { queryByRole } = renderTeaser(
      teaser({ allPostsLink }),
      withPosts([post(1)])
    )
    expect(queryByRole("link", { name: "Read all posts" })).toBeNull()
  })

  it("renders nothing without a heading", () => {
    const { container } = renderTeaser(
      teaser({ heading: " " }),
      withPosts([post(1)])
    )
    expect(container.innerHTML).toBe("")
  })

  it("marks its heading for the Visual Editor", () => {
    const { container } = render(
      <Block
        block={teaser()}
        index={2}
        fixtures={withPosts([post(1)])}
        editing
      />
    )
    expect(
      container
        .querySelector('[data-editable-field="heading"]')!
        .getAttribute("data-block-index")
    ).toBe("2")
  })

  it.each([
    ["Avada", avada],
    ["Warren Beach", warrenBeach],
  ])("shows 3 cards from the %s fixtures", (_name, fixtures) => {
    const { getAllByRole } = renderTeaser(teaser(), fixtures)
    const hrefs = getAllByRole("article").map((card) =>
      within(card).getByRole("link").getAttribute("href")
    )
    expect(hrefs).toHaveLength(3)
    expect(new Set(hrefs).size).toBe(3)
  })

  it.each(backgrounds)(
    "passes axe on the %s background",
    async (background) => {
      const { container } = renderTeaser(
        teaser({
          background,
          allPostsLink: { label: "Read all posts", href: "/blog" },
        }),
        withPosts([post(1), post(2), post(3)])
      )
      expect(await violations(container)).toEqual([])
    }
  )

  it.each(backgrounds)(
    "passes axe on the %s background with no posts",
    async (background) => {
      const { container } = renderTeaser(teaser({ background }), withPosts([]))
      expect(await violations(container)).toEqual([])
    }
  )
})
