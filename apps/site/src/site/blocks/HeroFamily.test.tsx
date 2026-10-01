// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import { backgrounds } from "../../fields/background"
import { Block } from "."
import { splitAccent } from "./accentWord"
import { samples } from "./samples"

afterEach(() => {
  cleanup()
  toast.dismiss()
  vi.restoreAllMocks()
})

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

describe("splitAccent", () => {
  it("splits the heading around the first match, keeping the heading's own casing", () => {
    expect(splitAccent("Welcome to the Coast", "coast")).toEqual([
      "Welcome to the ",
      "Coast",
      "",
    ])
    expect(splitAccent("Sea, sea, sea", "sea")).toEqual([
      "",
      "Sea",
      ", sea, sea",
    ])
  })

  it("takes a phrase", () => {
    expect(splitAccent("Stay by the sea, often", "by the sea")).toEqual([
      "Stay ",
      "by the sea",
      ", often",
    ])
  })

  it("is null when there is no accent word, or it is not in the heading", () => {
    expect(splitAccent("Welcome", undefined)).toBeNull()
    expect(splitAccent("Welcome", "  ")).toBeNull()
    expect(splitAccent("Welcome", "coast")).toBeNull()
  })

  it("reads the word literally, not as a pattern", () => {
    expect(splitAccent("Book (now) today", "(now)")).toEqual([
      "Book ",
      "(now)",
      " today",
    ])
    expect(splitAccent("Book now", ".*")).toBeNull()
  })
})

describe("Hero", () => {
  const hero = samples.hero

  it("renders from its sample: eyebrow, heading, subheading, image and button", async () => {
    const { container } = render(<Block block={hero} index={0} />)
    const section = container.querySelector("section")!
    const heading = within(section).getByRole("heading", { level: 1 })
    expect(heading.textContent).toBe(hero.heading)
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id)
    expect(section.textContent).toContain(hero.eyebrow)
    expect(section.textContent).toContain(hero.subheading)
    expect(section.querySelector("img")?.getAttribute("alt")).toBeTruthy()
    expect(
      within(section).getByRole("link", { name: hero.cta!.label! })
    ).toBeTruthy()
    expect(await violations(container)).toEqual([])
  })

  it("puts the eyebrow before the heading, as text and not a heading", () => {
    const { container } = render(<Block block={hero} index={0} />)
    const heading = container.querySelector("h1")!
    const eyebrow = screen.getByText(hero.eyebrow!)
    expect(
      eyebrow.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(eyebrow.closest("h1, h2, h3")).toBeNull()
  })

  it("marks the accent word up inside the heading, in the accent token, leaving the heading's text whole", () => {
    const { container } = render(<Block block={hero} index={0} />)
    const heading = container.querySelector("h1")!
    const accent = heading.querySelector("span")!
    expect(accent.textContent).toBe("coast")
    expect(accent.className).toContain("bg-accent")
    // The accent colour is a fill: its own derived text colour passes AA on it.
    expect(accent.className).toContain("text-accent-foreground")
    expect(heading.textContent).toBe(hero.heading)
  })

  it("marks up no accent word when there is none, or it is not in the heading", () => {
    for (const accentWord of [undefined, "", "lagoon"]) {
      const { container } = render(
        <Block block={{ ...hero, accentWord }} index={0} />
      )
      expect(container.querySelector("h1")!.querySelector("*")).toBeNull()
      cleanup()
    }
  })

  it("fuses its trust strip to the foot of the Hero, inside its section", () => {
    const { container } = render(<Block block={hero} index={0} />)
    const sections = container.querySelectorAll("section")
    expect(sections).toHaveLength(1)
    const lists = sections[0]!.querySelectorAll("ul")
    expect(lists).toHaveLength(1)
    const strip = lists[0]!
    expect(strip.querySelectorAll("li")).toHaveLength(hero.trustStrip!.length)
    expect(strip.textContent).toContain("4.9")
    expect(strip.textContent).toContain("Free cancellation")
    // The strip follows the Hero's content: it is the last thing in the section.
    expect(sections[0]!.lastElementChild!.contains(strip)).toBe(true)
  })

  it("has no strip without trust items", () => {
    for (const trustStrip of [undefined, null, []]) {
      const { container } = render(
        <Block block={{ ...hero, trustStrip }} index={0} />
      )
      expect(container.querySelector("ul")).toBeNull()
      cleanup()
    }
  })

  it("renders without an image, eyebrow, subheading or button", async () => {
    const { container } = render(
      <Block
        block={{
          blockType: "hero",
          heading: "Welcome",
          trustStrip: hero.trustStrip,
        }}
        index={1}
      />
    )
    expect(container.querySelector("h2")?.textContent).toBe("Welcome")
    expect(container.querySelector("img")).toBeNull()
    expect(await violations(container)).toEqual([])
  })

  it("marks the eyebrow, heading, subheading and button as editable in the Visual Editor", () => {
    const { container } = render(<Block block={hero} index={3} editing />)
    const fields = [...container.querySelectorAll("[data-editable-field]")]
    expect(fields.map((el) => el.getAttribute("data-editable-field"))).toEqual([
      "eyebrow",
      "heading",
      "subheading",
      "cta.label",
    ])
  })
})

describe("Trust strip", () => {
  const strip = samples.trustStrip

  it("renders its text and stat items from its sample", async () => {
    const { container } = render(<Block block={strip} index={1} />)
    const section = container.querySelector("section")!
    expect(
      within(section).getByRole("heading", { name: strip.heading! })
    ).toBeTruthy()
    const items = within(section).getAllByRole("listitem")
    expect(items).toHaveLength(strip.items!.length)
    // A stat is set apart from its text; an item without one is just text.
    expect(items[0]!.textContent).toContain("4.9")
    expect(items[0]!.querySelector("strong")?.textContent).toBe("4.9")
    expect(items[1]!.querySelector("strong")).toBeNull()
    expect(items[1]!.textContent).toContain("Free cancellation")
    // Its icons say nothing the text doesn't.
    for (const icon of section.querySelectorAll("svg"))
      expect(icon.getAttribute("aria-hidden")).toBe("true")
    expect(section.querySelector("img")).toBeNull()
    expect(await violations(container)).toEqual([])
  })

  it("renders partner logos, each named by its partner", async () => {
    const { container } = render(
      <Block block={{ ...strip, variant: "logos" }} index={1} />
    )
    const images = [...container.querySelectorAll("img")]
    expect(images.map((img) => img.getAttribute("alt"))).toEqual(
      strip.logos!.map((logo) => logo.name)
    )
    expect(container.querySelectorAll("li")).toHaveLength(strip.logos!.length)
    expect(container.textContent).not.toContain("Average guest rating")
    expect(await violations(container)).toEqual([])
  })

  it("is a named region with or without a heading", () => {
    const { container } = render(
      <Block block={{ ...strip, heading: undefined }} index={1} />
    )
    const section = container.querySelector("section")!
    expect(section.getAttribute("aria-label")).toBe("Trust strip")
    expect(section.querySelector("h2")).toBeNull()
  })

  it("renders nothing when it has nothing to show", () => {
    const { container } = render(
      <Block
        block={{
          blockType: "trustStrip",
          variant: "items",
          items: [],
        }}
        index={1}
      />
    )
    expect(container.innerHTML).toBe("")
  })

  it.each(["items", "logos"] as const)(
    "the %s variant passes axe on every background",
    async (variant) => {
      for (const background of backgrounds) {
        const { container } = render(
          <Block block={{ ...strip, variant, background }} index={1} />
        )
        expect(await violations(container), background).toEqual([])
        cleanup()
      }
    }
  )

  it("sets each partner logo on a card tile on the coloured backgrounds, and bare on the page", () => {
    for (const [background, tiled] of [
      ["default", false],
      ["muted", false],
      ["primary", true],
      ["dark", true],
    ] as const) {
      const { container } = render(
        <Block block={{ ...strip, variant: "logos", background }} index={1} />
      )
      for (const li of container.querySelectorAll("li"))
        expect(li.className.includes("bg-card"), background).toBe(tiled)
      cleanup()
    }
  })

  it("paints each background from the Theme's tokens", () => {
    const { container } = render(
      <Block block={{ ...strip, background: "dark" }} index={1} />
    )
    expect(container.querySelector("section")!.className).toContain(
      "bg-surface-dark"
    )
  })
})

describe("Search Hero", () => {
  const search = samples.searchHero

  /** The toast the search showed. */
  const shownToast = () =>
    waitFor(() => {
      const found = document.querySelector("[data-sonner-toast]")
      expect(found).not.toBeNull()
      return found!
    })

  it("renders from its sample: eyebrow, accent heading, subheading and a labelled search", async () => {
    const { container } = render(<Block block={search} index={0} />)
    const section = container.querySelector("section")!
    const heading = within(section).getByRole("heading", { level: 1 })
    expect(heading.textContent).toBe(search.heading)
    expect(heading.querySelector("span")?.textContent).toBe("sea")
    expect(section.textContent).toContain(search.eyebrow)
    expect(section.textContent).toContain(search.subheading)
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id)
    expect(await violations(container)).toEqual([])
  })

  it("has a labelled date, guests and location", () => {
    render(<Block block={search} index={0} />)
    expect(screen.getByLabelText(/check-in/i)).toBeTruthy()
    expect(screen.getByLabelText(/check-out/i)).toBeTruthy()
    expect(screen.getByLabelText(/guests/i)).toBeTruthy()
    const location = screen.getByLabelText(/location/i)
    // The places the Block suggests, after "any".
    expect(
      [...(location as HTMLSelectElement).options].map((o) => o.text)
    ).toEqual(["Any location", "Warren Beach", "Harbour Point", "The Dunes"])
    expect(
      screen.getByRole("button", { name: search.searchLabel })
    ).toBeTruthy()
  })

  it("keeps the check-out from starting before the check-in, without blocking the search", async () => {
    const user = userEvent.setup()
    render(<Block block={search} index={0} />)
    const checkOut = screen.getByLabelText(/check-out/i) as HTMLInputElement
    expect(checkOut.min).toBe("")
    await user.type(screen.getByLabelText(/check-in/i), "2026-10-10")
    expect(checkOut.min).toBe("2026-10-10")
    // A reversed range still searches: the form never blocks on its own validation.
    await user.type(checkOut, "2026-10-01")
    await user.click(screen.getByRole("button", { name: search.searchLabel }))
    expect((await shownToast()).textContent).toMatch(/preview/i)
  })

  it("takes a free-text location when the Block suggests none", () => {
    render(<Block block={{ ...search, locations: [] }} index={0} />)
    const location = screen.getByLabelText(/location/i)
    expect(location.tagName).toBe("INPUT")
  })

  it("shows a toast on submit, and makes no request and does not navigate", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const user = userEvent.setup()
    render(<Block block={search} index={0} />)
    // On the document, after React's handler at the root has run.
    let prevented = false
    document.addEventListener(
      "submit",
      (event) => {
        prevented = event.defaultPrevented
      },
      { once: true }
    )
    await user.type(screen.getByLabelText(/check-in/i), "2026-10-10")
    await user.selectOptions(screen.getByLabelText(/location/i), "The Dunes")
    await user.click(screen.getByRole("button", { name: search.searchLabel }))

    const shown = await shownToast()
    expect(shown.textContent).toMatch(/preview/i)
    // What was searched for is played back, so the toast says something.
    expect(shown.textContent).toContain("2026-10-10")
    expect(shown.textContent).toContain("The Dunes")
    expect(prevented).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("shows a toast for an empty search too", async () => {
    const user = userEvent.setup()
    render(<Block block={search} index={0} />)
    await user.click(screen.getByRole("button", { name: search.searchLabel }))
    expect((await shownToast()).textContent).toContain("2 guests")
  })

  it("falls back to Search for a blank button label", () => {
    render(<Block block={{ ...search, searchLabel: " " }} index={0} />)
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy()
  })

  it("renders without an image, eyebrow or subheading, and passes axe", async () => {
    const { container } = render(
      <Block
        block={{
          blockType: "searchHero",
          heading: "Find a stay",
          searchLabel: "Search",
        }}
        index={1}
      />
    )
    expect(container.querySelector("h2")?.textContent).toBe("Find a stay")
    expect(container.querySelector("img")).toBeNull()
    expect(await violations(container)).toEqual([])
  })

  it("marks the eyebrow, heading, subheading and button label as editable in the Visual Editor", () => {
    const { container } = render(<Block block={search} index={2} editing />)
    const fields = [...container.querySelectorAll("[data-editable-field]")]
    expect(fields.map((el) => el.getAttribute("data-editable-field"))).toEqual([
      "eyebrow",
      "heading",
      "subheading",
      "searchLabel",
    ])
  })
})
