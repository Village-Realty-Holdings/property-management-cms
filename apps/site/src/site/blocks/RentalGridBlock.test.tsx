// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import type { RentalGridBlock } from "../../payload-types"
import { fixtures as avada } from "../fixtures/avada"
import type { SiteFixtures } from "../fixtures/types"
import { Block } from "."
import { rentalGridSample } from "./samples/rentalGrid"

afterEach(cleanup)

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

const gridBlock = (
  overrides: Partial<RentalGridBlock> = {}
): RentalGridBlock => ({
  ...rentalGridSample,
  ...overrides,
})

const names = (...where: boolean[]) =>
  avada.rentals.filter((_, i) => where[i] ?? true).map((r) => r.name)

const shown = () =>
  screen
    .queryAllByRole("article")
    .map((a) => within(a).getByRole("heading").textContent)

const sorted = (list: string[]) =>
  [...list].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base", numeric: true })
  )

function setup(block = gridBlock(), fixtures = avada) {
  const user = userEvent.setup()
  const view = render(<Block block={block} index={1} fixtures={fixtures} />)
  return { user, ...view }
}

/** Every Rental name on every page, walking Next. */
async function allPages(user: ReturnType<typeof userEvent.setup>) {
  const seen = [...shown()]
  for (let i = 0; i < 20; i++) {
    const next = screen.queryByRole("button", { name: "Next" })
    if (!next || next.getAttribute("aria-disabled") === "true") break
    await user.click(next)
    seen.push(...shown())
  }
  return seen
}

describe("Rental grid", () => {
  it("names its section by its heading, with the cards one level below", () => {
    setup()
    const section = screen.getByRole("region", {
      name: rentalGridSample.heading,
    })
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(
      rentalGridSample.heading
    )
    for (const article of within(section).getAllByRole("article"))
      expect(within(article).getByRole("heading").tagName).toBe("H3")
  })

  it("shows a first page of the page size, sorted by name, with a live count", () => {
    setup(gridBlock({ pageSize: 5 }))
    expect(shown()).toEqual(
      sorted(avada.rentals.map((r) => r.name)).slice(0, 5)
    )
    const status = screen.getByRole("status")
    expect(status.textContent).toBe("Showing 1–5 of 12 rentals")
  })

  it("has a labelled sort and labelled groups of toggle chips", () => {
    setup()
    const sort = screen.getByRole("combobox", { name: "Sort by" })
    expect(sort.tagName).toBe("SELECT")
    for (const group of ["Bedrooms", "Pets", "Location"])
      expect(screen.getByRole("group", { name: group })).toBeTruthy()
    const pets = screen.getByRole("button", { name: /pets welcome/i })
    expect(pets.getAttribute("aria-pressed")).toBe("false")
  })

  it("offers one chip per town and a bedroom chip for each step the Site reaches", () => {
    setup()
    const location = screen.getByRole("group", { name: "Location" })
    expect(
      within(location)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(["Gatlinburg", "Pigeon Forge", "Sevierville"])
    const bedrooms = screen.getByRole("group", { name: "Bedrooms" })
    expect(
      within(bedrooms)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(["2+ bedrooms", "3+ bedrooms", "4+ bedrooms", "5+ bedrooms"])
  })

  it("the pets chip keeps pet friendly Rentals, and says it is pressed", async () => {
    const { user } = setup(gridBlock({ pageSize: 24 }))
    const pets = screen.getByRole("button", { name: /pets welcome/i })
    await user.click(pets)
    expect(pets.getAttribute("aria-pressed")).toBe("true")
    expect(sorted(shown().map(String))).toEqual(
      sorted(avada.rentals.filter((r) => r.petFriendly).map((r) => r.name))
    )
    expect(screen.getByRole("status").textContent).toBe(
      "Showing 1–4 of 4 rentals"
    )
    await user.click(pets)
    expect(pets.getAttribute("aria-pressed")).toBe("false")
    expect(shown()).toHaveLength(12)
  })

  it("a bedroom chip keeps Rentals with at least that many, one chip at a time", async () => {
    const { user } = setup(gridBlock({ pageSize: 24 }))
    await user.click(screen.getByRole("button", { name: "3+ bedrooms" }))
    expect(shown()).toHaveLength(
      avada.rentals.filter((r) => r.bedrooms >= 3).length
    )
    await user.click(screen.getByRole("button", { name: "4+ bedrooms" }))
    expect(
      screen
        .getByRole("button", { name: "3+ bedrooms" })
        .getAttribute("aria-pressed")
    ).toBe("false")
    expect(shown()).toHaveLength(
      avada.rentals.filter((r) => r.bedrooms >= 4).length
    )
  })

  it("location chips combine with the others, and two towns add up", async () => {
    const { user } = setup(gridBlock({ pageSize: 24 }))
    await user.click(screen.getByRole("button", { name: "Sevierville" }))
    await user.click(screen.getByRole("button", { name: /pets welcome/i }))
    expect(sorted(shown().map(String))).toEqual(
      sorted(
        avada.rentals
          .filter((r) => r.location === "Sevierville" && r.petFriendly)
          .map((r) => r.name)
      )
    )
    await user.click(screen.getByRole("button", { name: "Pigeon Forge" }))
    expect(sorted(shown().map(String))).toEqual(
      sorted(
        avada.rentals
          .filter(
            (r) =>
              ["Sevierville", "Pigeon Forge"].includes(r.location) &&
              r.petFriendly
          )
          .map((r) => r.name)
      )
    )
  })

  it("the chips work from the keyboard", async () => {
    const { user } = setup(gridBlock({ pageSize: 24 }))
    const pets = screen.getByRole("button", { name: /pets welcome/i })
    pets.focus()
    await user.keyboard(" ")
    expect(pets.getAttribute("aria-pressed")).toBe("true")
    expect(shown()).toHaveLength(
      avada.rentals.filter((r) => r.petFriendly).length
    )
  })

  it("sorts by sleeps, most first, and by rating, best first", async () => {
    const { user } = setup(gridBlock({ pageSize: 24 }))
    const sort = screen.getByRole("combobox", { name: "Sort by" })
    await user.selectOptions(sort, "sleeps")
    const bySleeps = shown().map(
      (name) => avada.rentals.find((r) => r.name === name)!.sleeps
    )
    expect(bySleeps).toEqual([...bySleeps].sort((a, b) => b - a))
    expect(bySleeps[0]).toBe(16)
    await user.selectOptions(sort, "rating")
    const byRating = shown().map(
      (name) => avada.rentals.find((r) => r.name === name)!.rating
    )
    expect(byRating).toEqual([...byRating].sort((a, b) => b - a))
  })

  it("pages with Previous and Next, every Rental once, and updates the count", async () => {
    const { user } = setup(gridBlock({ pageSize: 5 }))
    const previous = screen.getByRole("button", { name: "Previous" })
    expect(previous.getAttribute("aria-disabled")).toBe("true")
    const nav = screen.getByRole("navigation", { name: /pages/i })
    expect(nav.textContent).toContain("Page 1 of 3")
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByRole("status").textContent).toBe(
      "Showing 6–10 of 12 rentals"
    )
    expect(nav.textContent).toContain("Page 2 of 3")
    await user.click(previous)
    expect(screen.getByRole("status").textContent).toBe(
      "Showing 1–5 of 12 rentals"
    )
    await user.click(screen.getByRole("button", { name: "Next" }))
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(shown()).toHaveLength(2)
    expect(
      screen.getByRole("button", { name: "Next" }).getAttribute("aria-disabled")
    ).toBe("true")
    // Clicking a disabled end does nothing.
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(shown()).toHaveLength(2)
  })

  it("walking every page shows every Rental exactly once", async () => {
    const { user } = setup(gridBlock({ pageSize: 5 }))
    expect(sorted(await allPages(user))).toEqual(sorted(names()))
  })

  it("goes back to page one when a filter or the sort changes", async () => {
    const { user } = setup(gridBlock({ pageSize: 3 }))
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByRole("status").textContent).toMatch(/^Showing 4–6/)
    await user.click(screen.getByRole("button", { name: /pets welcome/i }))
    expect(screen.getByRole("status").textContent).toMatch(/^Showing 1–3 of 4/)
    await user.click(screen.getByRole("button", { name: "Next" }))
    await user.selectOptions(screen.getByRole("combobox"), "sleeps")
    expect(screen.getByRole("status").textContent).toMatch(/^Showing 1–3 of 4/)
  })

  it("has no pagination when everything fits on one page", () => {
    setup(gridBlock({ pageSize: 24 }))
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("says so when no Rental matches, and Clear filters brings them back", async () => {
    const { user } = setup(gridBlock({ pageSize: 24 }))
    await user.click(screen.getByRole("button", { name: "Pigeon Forge" }))
    await user.click(screen.getByRole("button", { name: "5+ bedrooms" }))
    expect(screen.queryAllByRole("article")).toHaveLength(0)
    expect(screen.getByText(/no rentals match these filters/i)).toBeTruthy()
    expect(screen.getByRole("status").textContent).toBe("No rentals match")
    // The controls stay, so the visitor can undo.
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(shown()).toHaveLength(12)
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull()
  })

  it("with no fixtures shows the heading and a friendly message, and no controls", async () => {
    const { container } = setup(gridBlock(), empty)
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy()
    expect(screen.getByText(/no rentals to show yet/i)).toBeTruthy()
    expect(screen.queryAllByRole("article")).toHaveLength(0)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(await violations(container)).toEqual([])
  })

  it("leaves out the location chips when no Rental has a location", () => {
    const blank: SiteFixtures = {
      posts: [],
      rentals: avada.rentals.map((r) => ({ ...r, location: "" })),
    }
    setup(gridBlock(), blank)
    expect(screen.queryByRole("group", { name: "Location" })).toBeNull()
    expect(screen.getByRole("group", { name: "Bedrooms" })).toBeTruthy()
  })

  it("still names its section when the heading is empty", () => {
    setup(gridBlock({ heading: " " }))
    expect(screen.getByRole("region", { name: "Rental grid" })).toBeTruthy()
  })

  it("passes axe: at rest, with a filter on, and with nothing matching", async () => {
    const { user, container } = setup(gridBlock({ pageSize: 5 }))
    expect(await violations(container)).toEqual([])
    await user.click(screen.getByRole("button", { name: /pets welcome/i }))
    expect(await violations(container)).toEqual([])
    await user.click(screen.getByRole("button", { name: "Pigeon Forge" }))
    await user.click(screen.getByRole("button", { name: "5+ bedrooms" }))
    expect(await violations(container)).toEqual([])
  })
})
