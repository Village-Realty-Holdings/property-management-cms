// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import axe from "axe-core"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import type {
  FeaturedRentalsBlock,
  LargeGroupRentalsBlock,
} from "../../../payload-types"
import { fixtures as avada } from "../../fixtures/avada"
import type { Rental, SiteFixtures } from "../../fixtures/types"
import { Block } from ".."
import { featuredRentalsSample } from "../samples/featuredRentals"
import { largeGroupRentalsSample } from "../samples/largeGroupRentals"

afterEach(cleanup)

// jsdom has no layout observers, which the carousel (Embla) starts.
beforeAll(() => {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  window.IntersectionObserver ??=
    Observer as unknown as typeof IntersectionObserver
  window.ResizeObserver ??= Observer as unknown as typeof ResizeObserver
})

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

const empty: SiteFixtures = { rentals: [], posts: [] }

const featuredBlock = (
  overrides: Partial<FeaturedRentalsBlock> = {}
): FeaturedRentalsBlock => ({ ...featuredRentalsSample, ...overrides })

const largeGroupBlock = (
  overrides: Partial<LargeGroupRentalsBlock> = {}
): LargeGroupRentalsBlock => ({ ...largeGroupRentalsSample, ...overrides })

const cardNames = (scope: HTMLElement) =>
  within(scope)
    .queryAllByRole("article")
    .map((article) => within(article).getAllByRole("heading")[0]!.textContent)

const oneRental: Rental = {
  id: "solo",
  name: "Solo Cabin",
  type: "Cabin",
  location: "Gatlinburg",
  bedrooms: 1,
  baths: 1,
  sleeps: 2,
  petFriendly: true,
  rating: 4.5,
  reviews: 1,
  features: ["Hot Tub"],
  photo: { src: "/fixtures/avada/solo.webp", alt: "A cabin among trees" },
  url: "https://example.com/solo",
}

describe("Featured rentals", () => {
  it.each([1, 3, 5])("as a grid shows exactly %i cards", (count) => {
    const { container } = render(
      <Block
        block={featuredBlock({ variant: "grid", count })}
        index={1}
        fixtures={avada}
      />
    )
    expect(cardNames(container)).toEqual(
      avada.rentals.slice(0, count).map((r) => r.name)
    )
  })

  it("shows every Rental when the count is more than the Site has", () => {
    const { container } = render(
      <Block
        block={featuredBlock({ count: 12 })}
        index={1}
        fixtures={{ rentals: [oneRental], posts: [] }}
      />
    )
    expect(cardNames(container)).toEqual(["Solo Cabin"])
  })

  it("as a carousel shows the same cards, as slides, with labelled controls", () => {
    const { container } = render(
      <Block
        block={featuredBlock({ variant: "carousel", count: 6 })}
        index={1}
        fixtures={avada}
      />
    )
    expect(cardNames(container)).toHaveLength(6)
    const carousel = screen.getByRole("region", { name: /carousel/i })
    expect(carousel.getAttribute("aria-roledescription")).toBe("carousel")
    expect(within(carousel).getAllByRole("group")).toHaveLength(6)
    const previous = screen.getByRole("button", { name: /previous/i })
    const next = screen.getByRole("button", { name: /next/i })
    expect(previous.tagName).toBe("BUTTON")
    expect(next.tagName).toBe("BUTTON")
  })

  it("as a grid has no carousel controls", () => {
    render(
      <Block
        block={featuredBlock({ variant: "grid" })}
        index={1}
        fixtures={avada}
      />
    )
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("region", { name: /carousel/i })).toBeNull()
  })

  it("names its section by its heading, and the cards one level below it", () => {
    render(<Block block={featuredBlock()} index={1} fixtures={avada} />)
    const section = screen.getByRole("region", {
      name: featuredRentalsSample.heading,
    })
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(
      featuredRentalsSample.heading
    )
    for (const heading of within(section)
      .getAllByRole("article")
      .map((a) => within(a).getByRole("heading")))
      expect(heading.tagName).toBe("H3")
  })

  it("with no fixtures renders the heading and a friendly message, no cards", async () => {
    const { container } = render(
      <Block block={featuredBlock()} index={1} fixtures={empty} />
    )
    expect(screen.queryAllByRole("article")).toHaveLength(0)
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy()
    expect(
      container.textContent!.replace(featuredRentalsSample.heading, "").trim()
        .length
    ).toBeGreaterThan(10)
    expect(screen.getByText(/no rentals/i)).toBeTruthy()
    expect(await violations(container)).toEqual([])
  })

  it.each(["grid", "carousel"] as const)(
    "as a %s passes axe",
    async (variant) => {
      const { container } = render(
        <Block
          block={featuredBlock({ variant, count: 6 })}
          index={1}
          fixtures={avada}
        />
      )
      expect(await violations(container)).toEqual([])
    }
  )
})

describe("Large-group rentals", () => {
  it.each([12, 16, 99])("shows every Rental that sleeps at least %i", (min) => {
    const { container } = render(
      <Block
        block={largeGroupBlock({ minSleeps: min })}
        index={1}
        fixtures={avada}
      />
    )
    const expected = avada.rentals
      .filter((r) => r.sleeps >= min)
      .map((r) => r.name)
    expect(cardNames(container)).toEqual(expected)
  })

  it("says so when no Rental is that large, and still names the section", async () => {
    const { container } = render(
      <Block
        block={largeGroupBlock({ minSleeps: 99 })}
        index={1}
        fixtures={avada}
      />
    )
    expect(screen.queryAllByRole("article")).toHaveLength(0)
    expect(screen.getByText(/99/)).toBeTruthy()
    expect(
      screen.getByRole("region", { name: largeGroupRentalsSample.heading })
    ).toBeTruthy()
    expect(await violations(container)).toEqual([])
  })

  it("with no fixtures renders a friendly message", () => {
    render(<Block block={largeGroupBlock()} index={1} fixtures={empty} />)
    expect(screen.queryAllByRole("article")).toHaveLength(0)
    expect(screen.getByText(/no rentals/i)).toBeTruthy()
  })

  it("passes axe with cards", async () => {
    const { container } = render(
      <Block block={largeGroupBlock()} index={1} fixtures={avada} />
    )
    expect(cardNames(container).length).toBeGreaterThan(0)
    expect(await violations(container)).toEqual([])
  })
})

describe("a Rental card", () => {
  const card = () => {
    render(
      <Block
        block={featuredBlock({ count: 1 })}
        index={1}
        fixtures={{ rentals: [oneRental], posts: [] }}
      />
    )
    return screen.getByRole("article")
  }

  it("shows the photo with its alt text", () => {
    const img = within(card()).getByRole("img")
    expect(img.getAttribute("alt")).toBe("A cabin among trees")
  })

  it("names the Rental, its type and where it is", () => {
    const article = card()
    expect(
      within(article).getByRole("heading", { name: "Solo Cabin" })
    ).toBeTruthy()
    expect(article.textContent).toContain("Cabin")
    expect(article.textContent).toContain("Gatlinburg")
  })

  it("says bedrooms, baths and how many it sleeps, in singular when one", () => {
    const article = card()
    expect(within(article).getByText("1 bedroom")).toBeTruthy()
    expect(within(article).getByText("1 bath")).toBeTruthy()
    expect(within(article).getByText("Sleeps 2")).toBeTruthy()
  })

  it("gives the rating and reviews as readable text", () => {
    const article = card()
    expect(within(article).getByText(/4\.5 out of 5.*1 review\b/i)).toBeTruthy()
  })

  it("says a Rental with no reviews has none yet, rather than a rating", () => {
    render(
      <Block
        block={featuredBlock({ count: 1 })}
        index={1}
        fixtures={{
          rentals: [{ ...oneRental, rating: 0, reviews: 0 }],
          posts: [],
        }}
      />
    )
    const article = screen.getByRole("article")
    expect(article.textContent).toMatch(/no reviews yet/i)
    expect(article.textContent).not.toMatch(/out of 5/)
  })

  it("lists its features", () => {
    expect(within(card()).getByText("Hot Tub")).toBeTruthy()
  })

  it("links out to the Rental's page by its name", () => {
    const link = within(card()).getByRole("link", { name: /Solo Cabin/ })
    expect(link.getAttribute("href")).toBe("https://example.com/solo")
  })

  it("does not link a url that is not http(s) or a path", () => {
    render(
      <Block
        block={featuredBlock({ count: 1 })}
        index={1}
        fixtures={{
          rentals: [{ ...oneRental, url: "javascript:alert(1)" }],
          posts: [],
        }}
      />
    )
    expect(within(screen.getByRole("article")).queryByRole("link")).toBeNull()
  })
})
