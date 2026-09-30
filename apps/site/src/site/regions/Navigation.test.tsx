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
import { afterEach, describe, expect, it } from "vitest"

import type { NavigationBlock, Page } from "../../payload-types"
import type { Brand } from "../brand"
import { fixturesFor } from "../fixtures"
import { Navigation } from "./Navigation"
import type { RegionContext } from "./types"

afterEach(cleanup)

const brand: Brand = {
  name: "Warren Beach",
  tagline: null,
  logo: null,
  phone: null,
  email: null,
  address: null,
  social: [],
}

const context: RegionContext = {
  fixtures: fixturesFor(undefined),
  editing: false,
  brand,
  index: 1001,
}

const page = (path: string) => ({ id: 1, title: "A page", path }) as Page

const block = (items: NavigationBlock["items"]): NavigationBlock => ({
  blockType: "navigation",
  items,
})

const menu = block([
  { label: "Stays", link: { type: "page", page: page("/stays") } },
  { label: "Owners", link: { type: "url", url: "https://example.com/owners" } },
  {
    label: "Explore",
    display: "dropdown",
    children: [
      { label: "Beaches", link: { type: "url", url: "/beaches" } },
      { label: "Guide", link: { type: "page", page: page("/guide") } },
    ],
  },
  {
    label: "Activities",
    display: "mega",
    children: [
      {
        label: "Surfing",
        column: "On the water",
        link: { type: "url", url: "/surfing" },
      },
      {
        label: "Sailing",
        column: "On the water",
        link: { type: "url", url: "/sailing" },
      },
      {
        label: "Walking",
        column: "On land",
        link: { type: "url", url: "/walking" },
      },
      { label: "Cycling", link: { type: "url", url: "/cycling" } },
    ],
  },
])

const show = (navigation: NavigationBlock = menu) =>
  render(<Navigation block={navigation} context={context} />)

const desktopButton = (name: string) =>
  within(document.body).getByRole("button", { name })

/** WCAG 2.2 AA violations in `element` (colour contrast is left to the browser tests). */
async function violations(element: HTMLElement) {
  const results = await axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
    },
  })
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.html),
  }))
}

describe("the top-level links", () => {
  it("is one Main navigation landmark of links that follow Pages and URLs", () => {
    const { getByRole } = show()
    const nav = getByRole("navigation", { name: "Main" })
    expect(
      within(nav).getByRole("link", { name: "Stays" }).getAttribute("href")
    ).toBe("/stays")
    expect(
      within(nav).getByRole("link", { name: "Owners" }).getAttribute("href")
    ).toBe("https://example.com/owners")
  })

  it("renders nothing when no item has a label and somewhere to go", () => {
    const { container } = show(
      block([
        { label: "Nowhere", link: { type: "page", page: null } },
        { label: "", link: { type: "url", url: "/x" } },
      ])
    )
    expect(container.textContent).toBe("")
  })

  it("follows a Page whose path changed, reading the relationship each time", () => {
    const items = [
      { label: "Cottage", link: { type: "page" as const, page: page("/a") } },
    ]
    const { getByRole, rerender } = show(block(items))
    expect(getByRole("link", { name: "Cottage" }).getAttribute("href")).toBe(
      "/a"
    )
    rerender(
      <Navigation
        block={block([
          { label: "Cottage", link: { type: "page", page: page("/b") } },
        ])}
        context={context}
      />
    )
    expect(getByRole("link", { name: "Cottage" }).getAttribute("href")).toBe(
      "/b"
    )
  })

  it("drops a link with an unsafe URL", () => {
    const { queryByRole } = show(
      block([
        { label: "Bad", link: { type: "url", url: "javascript:alert(1)" } },
      ])
    )
    expect(queryByRole("link", { name: "Bad" })).toBeNull()
  })
})

describe("a dropdown", () => {
  it("is a button, not a link, and starts closed", () => {
    const { queryByRole } = show()
    expect(queryByRole("link", { name: "Explore" })).toBeNull()
    const button = desktopButton("Explore")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(queryByRole("link", { name: "Beaches" })).toBeNull()
  })

  it("opens on click and lists its links", async () => {
    const user = userEvent.setup()
    const { getByRole } = show()
    await user.click(desktopButton("Explore"))
    expect(desktopButton("Explore").getAttribute("aria-expanded")).toBe("true")
    expect(getByRole("link", { name: "Beaches" }).getAttribute("href")).toBe(
      "/beaches"
    )
    expect(getByRole("link", { name: "Guide" }).getAttribute("href")).toBe(
      "/guide"
    )
  })

  it("controls its panel", async () => {
    const user = userEvent.setup()
    show()
    const button = desktopButton("Explore")
    await user.click(button)
    const panel = document.getElementById(button.getAttribute("aria-controls")!)
    expect(panel).not.toBeNull()
    expect(within(panel!).getByRole("link", { name: "Beaches" })).toBeTruthy()
  })

  it("opens and closes from the keyboard with Enter and Space", async () => {
    const user = userEvent.setup()
    show()
    await user.tab()
    await user.tab()
    await user.tab()
    const button = desktopButton("Explore")
    expect(document.activeElement).toBe(button)
    await user.keyboard("{Enter}")
    expect(button.getAttribute("aria-expanded")).toBe("true")
    await user.keyboard(" ")
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  it("closes on Escape and returns focus to its button", async () => {
    const user = userEvent.setup()
    const { getByRole } = show()
    const button = desktopButton("Explore")
    await user.click(button)
    await user.tab()
    expect(document.activeElement).toBe(getByRole("link", { name: "Beaches" }))
    await user.keyboard("{Escape}")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(button)
  })

  it("closes on Escape while the button itself has focus", async () => {
    const user = userEvent.setup()
    show()
    const button = desktopButton("Explore")
    await user.click(button)
    await user.keyboard("{Escape}")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(button)
  })

  it("closes when focus tabs out of it", async () => {
    const user = userEvent.setup()
    show()
    const button = desktopButton("Explore")
    await user.click(button)
    await user.tab() // Beaches
    await user.tab() // Guide
    expect(button.getAttribute("aria-expanded")).toBe("true")
    await user.tab() // out of the dropdown, to the next item
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  it("closes on a click elsewhere", async () => {
    const user = userEvent.setup()
    show()
    const button = desktopButton("Explore")
    await user.click(button)
    await user.click(document.body)
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  it("lets only one dropdown stay open", async () => {
    const user = userEvent.setup()
    show()
    await user.click(desktopButton("Explore"))
    await user.click(desktopButton("Activities"))
    expect(desktopButton("Explore").getAttribute("aria-expanded")).toBe("false")
    expect(desktopButton("Activities").getAttribute("aria-expanded")).toBe(
      "true"
    )
  })

  it("is left out when none of its links go anywhere", () => {
    const { queryByRole } = show(
      block([
        {
          label: "Empty",
          children: [{ label: "Nowhere", link: { type: "page", page: null } }],
        },
      ])
    )
    expect(queryByRole("button", { name: "Empty" })).toBeNull()
  })

  it("does not fall back to its own hidden link when no dropdown link resolves", () => {
    const { queryByRole } = show(
      block([
        {
          label: "Stale",
          link: { type: "page", page: page("/stale") },
          children: [{ label: "Nowhere", link: { type: "page", page: null } }],
        },
      ])
    )
    expect(queryByRole("link", { name: "Stale" })).toBeNull()
    expect(queryByRole("button", { name: "Stale" })).toBeNull()
  })
})

describe("a mega menu", () => {
  it("groups links into columns by their heading", async () => {
    const user = userEvent.setup()
    show()
    await user.click(desktopButton("Activities"))
    const water = screen.getByRole("list", { name: "On the water" })
    const land = screen.getByRole("list", { name: "On land" })
    expect(
      within(water)
        .getAllByRole("link")
        .map((a) => a.textContent)
    ).toEqual(["Surfing", "Sailing"])
    expect(
      within(land)
        .getAllByRole("link")
        .map((a) => a.textContent)
    ).toEqual(["Walking"])
  })

  it("shows the column headings as text, and links with no heading in a column of their own", async () => {
    const user = userEvent.setup()
    const { getByText, getByRole } = show()
    await user.click(desktopButton("Activities"))
    expect(getByText("On the water")).toBeTruthy()
    expect(getByText("On land")).toBeTruthy()
    expect(getByRole("link", { name: "Cycling" })).toBeTruthy()
  })

  it("closes on Escape and returns focus to its button", async () => {
    const user = userEvent.setup()
    show()
    const button = desktopButton("Activities")
    await user.click(button)
    await user.tab()
    await user.keyboard("{Escape}")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(button)
  })

  it("ignores column headings in a plain dropdown", async () => {
    const user = userEvent.setup()
    const { queryByText, getByRole } = show(
      block([
        {
          label: "More",
          display: "dropdown",
          children: [
            {
              label: "Surfing",
              column: "On the water",
              link: { type: "url", url: "/surfing" },
            },
          ],
        },
      ])
    )
    await user.click(desktopButton("More"))
    expect(getByRole("link", { name: "Surfing" })).toBeTruthy()
    expect(queryByText("On the water")).toBeNull()
  })
})

describe("the small-screen menu", () => {
  it("is a Menu button that opens a dialog of the links", async () => {
    const user = userEvent.setup()
    const { getByRole } = show()
    const trigger = getByRole("button", { name: "Menu" })
    await user.click(trigger)
    const dialog = await waitFor(() => getByRole("dialog"))
    expect(
      within(dialog).getByRole("link", { name: "Stays" }).getAttribute("href")
    ).toBe("/stays")
    // A dropdown is a disclosure here too.
    const explore = within(dialog).getByRole("button", { name: "Explore" })
    expect(explore.getAttribute("aria-expanded")).toBe("false")
    await user.click(explore)
    expect(explore.getAttribute("aria-expanded")).toBe("true")
    expect(
      within(dialog).getByRole("link", { name: "Beaches" }).getAttribute("href")
    ).toBe("/beaches")
  })

  it("lists a mega menu's columns under their headings", async () => {
    const user = userEvent.setup()
    const { getByRole } = show()
    await user.click(getByRole("button", { name: "Menu" }))
    const dialog = await waitFor(() => getByRole("dialog"))
    await user.click(within(dialog).getByRole("button", { name: "Activities" }))
    expect(within(dialog).getByText("On the water")).toBeTruthy()
    expect(within(dialog).getByRole("link", { name: "Walking" })).toBeTruthy()
  })

  it("closes on Escape and returns focus to the Menu button", async () => {
    const user = userEvent.setup()
    const { getByRole, queryByRole } = show()
    const trigger = getByRole("button", { name: "Menu" })
    await user.click(trigger)
    await waitFor(() => getByRole("dialog"))
    await user.keyboard("{Escape}")
    await waitFor(() => expect(queryByRole("dialog")).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it("closes when a link is chosen", async () => {
    const user = userEvent.setup()
    const { getByRole, queryByRole } = show()
    await user.click(getByRole("button", { name: "Menu" }))
    const dialog = await waitFor(() => getByRole("dialog"))
    await user.click(within(dialog).getByRole("link", { name: "Owners" }))
    await waitFor(() => expect(queryByRole("dialog")).toBeNull())
  })
})

describe("accessibility", () => {
  it("has no WCAG 2.2 AA violations closed", async () => {
    const { container } = show()
    expect(await violations(container)).toEqual([])
  })

  it("has none with a dropdown open", async () => {
    const user = userEvent.setup()
    const { container } = show()
    await user.click(desktopButton("Explore"))
    expect(await violations(container)).toEqual([])
  })

  it("has none with a mega menu open", async () => {
    const user = userEvent.setup()
    const { container } = show()
    await user.click(desktopButton("Activities"))
    expect(await violations(container)).toEqual([])
  })

  it("has none with the small-screen menu open", async () => {
    const user = userEvent.setup()
    const { getByRole } = show()
    await user.click(getByRole("button", { name: "Menu" }))
    const dialog = await waitFor(() => getByRole("dialog"))
    await user.click(within(dialog).getByRole("button", { name: "Activities" }))
    expect(await violations(document.body)).toEqual([])
  })
})
