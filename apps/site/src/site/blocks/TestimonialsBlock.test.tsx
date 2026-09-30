// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import { Block } from "."
import { samples } from "./samples"
import { carouselOptions, starsOf } from "./testimonials"
import type { BlockOf } from "./types"

afterEach(cleanup)

const sample = samples.testimonials

function withVariant(
  variant: "carousel" | "grid",
  overrides: Partial<BlockOf<"testimonials">> = {}
): BlockOf<"testimonials"> {
  return { ...sample, variant, ...overrides }
}

/** WCAG 2.2 AA violations in `element` (colour contrast is for the browser tests, jsdom has no layout). */
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

describe("starsOf", () => {
  it("keeps whole ratings from 0 to 5", () => {
    expect([0, 1, 4, 5].map(starsOf)).toEqual([0, 1, 4, 5])
  })

  it("rounds a fractional rating and clamps one out of range", () => {
    expect([3.6, 7, -2, 4.4].map(starsOf)).toEqual([4, 5, 0, 4])
  })

  it("reads a missing or non-numeric rating as no stars", () => {
    expect([null, undefined, Number.NaN].map(starsOf)).toEqual([0, 0, 0])
  })
})

describe("carouselOptions", () => {
  it("scrolls with a short animation, and with none under reduced motion", () => {
    expect(carouselOptions(false).duration).toBeGreaterThan(0)
    expect(carouselOptions(true).duration).toBe(0)
  })

  it("starts each slide at the left edge", () => {
    expect(carouselOptions(false).align).toBe("start")
  })
})

describe.each(["grid", "carousel"] as const)(
  "Testimonials as a %s",
  (variant) => {
    it("shows every quote with its name and role line, in a figure", () => {
      render(<Block block={withVariant(variant)} index={1} />)
      const quotes = screen.getAllByRole("blockquote")
      expect(quotes).toHaveLength(sample.testimonials.length)
      sample.testimonials.forEach((t, i) => {
        const figure = quotes[i]!.closest("figure")!
        expect(figure).not.toBeNull()
        expect(quotes[i]!.textContent).toBe(t.quote)
        const caption = figure.querySelector("figcaption")!
        expect(within(caption).getByText(t.name)).toBeTruthy()
        expect(within(caption).getByText(t.role)).toBeTruthy()
      })
    })

    it("gives each star rating a text equivalent, and hides the stars", () => {
      const { container } = render(
        <Block block={withVariant(variant)} index={1} />
      )
      const texts = screen.getAllByText(/out of 5/).map((el) => el.textContent)
      expect(texts).toEqual(
        sample.testimonials.map((t) => `Rated ${t.rating} out of 5`)
      )
      for (const star of container.querySelectorAll("svg"))
        expect(star.getAttribute("aria-hidden")).toBe("true")
    })

    it("is a section named by its heading", () => {
      const { container } = render(
        <Block block={withVariant(variant)} index={3} />
      )
      const section = container.querySelector("section")!
      const heading = screen.getByRole("heading", { level: 2 })
      expect(heading.textContent).toBe(sample.heading)
      expect(section.getAttribute("aria-labelledby")).toBe(heading.id)
    })

    it("passes axe", async () => {
      const { container } = render(
        <Block block={withVariant(variant)} index={1} />
      )
      expect(await violations(container)).toEqual([])
    })

    it("renders nothing without a heading or without quotes", () => {
      const noHeading = render(
        <Block block={withVariant(variant, { heading: " " })} index={1} />
      )
      expect(noHeading.container.innerHTML).toBe("")
      cleanup()
      const noQuotes = render(
        <Block block={withVariant(variant, { testimonials: [] })} index={1} />
      )
      expect(noQuotes.container.innerHTML).toBe("")
    })
  }
)

describe("Testimonials as a grid", () => {
  it("is a plain list of quotes, with no carousel controls", () => {
    render(<Block block={withVariant("grid")} index={1} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(
      sample.testimonials.length
    )
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("region", { name: /testimonials/i })).toBeNull()
  })
})

describe("Testimonials as a carousel", () => {
  it("is a named carousel region with one slide per quote", () => {
    render(<Block block={withVariant("carousel")} index={1} />)
    const carousel = screen.getByRole("region", { name: /testimonials/i })
    expect(carousel.getAttribute("aria-roledescription")).toBe("carousel")
    expect(
      carousel.querySelectorAll("[aria-roledescription=slide]")
    ).toHaveLength(sample.testimonials.length)
  })

  it("has Previous and Next as real buttons, so the keyboard reaches them", () => {
    render(<Block block={withVariant("carousel")} index={1} />)
    for (const name of [/previous/i, /next/i])
      expect(screen.getByRole("button", { name }).tagName).toBe("BUTTON")
  })
})
