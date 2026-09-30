// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { catalogue, catalogueEntries } from "../../blocks/catalogue"
import {
  BlockPicker,
  filterGroups,
  pickerGroups,
  type InsertTarget,
} from "./BlockPicker"

beforeAll(() => {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(globalThis, { ResizeObserver: Observer })
  Element.prototype.scrollIntoView ??= () => {}
})
afterEach(cleanup)

const names = (region: InsertTarget["region"]) =>
  pickerGroups(region).flatMap((group) =>
    group.entries.map((entry) => entry.label)
  )

function open(
  target: InsertTarget | null,
  onInsert = vi.fn(),
  onClose = vi.fn()
) {
  render(<BlockPicker target={target} onClose={onClose} onInsert={onInsert} />)
  return { onInsert, onClose }
}

const dialog = () => screen.getByRole("dialog", { name: /Blocks?/ })
const option = (name: RegExp | string) => screen.getByRole("option", { name })
const searchBox = () => screen.getByRole("combobox")

describe("what each region offers", () => {
  it("offers every catalogue Block in a Page, grouped by the catalogue's groups", () => {
    const groups = pickerGroups("page")
    expect(groups.map((g) => g.heading)).toEqual([
      "Heroes",
      "Rentals",
      "Content",
      "Social proof",
      "Forms",
    ])
    expect(names("page").sort()).toEqual(
      catalogueEntries.map((e) => e.label).sort()
    )
  })

  it("offers only the Header's own Blocks in a Header", () => {
    expect(names("header")).toEqual([
      "Logo",
      "Navigation",
      "Header actions",
      "Utility strip",
    ])
  })

  it("offers the Footer's Blocks, Newsletter and Call to action in a Footer", () => {
    expect(names("footer")).toEqual([
      "Footer columns",
      "Legal bar",
      "Newsletter",
      "Call to action",
    ])
  })
})

describe("filterGroups", () => {
  it("matches the label, the description and the group, any case", () => {
    const groups = pickerGroups("page")
    const labels = (q: string) =>
      filterGroups(groups, q).flatMap((g) => g.entries.map((e) => e.label))
    expect(labels("CALL")).toContain("Call to action")
    expect(labels("call")).not.toContain("Hero")
    // From the description: the Rental grid's "filter chips".
    expect(labels("filter chips")).toContain("Rental grid")
    // From the group.
    expect(labels("social proof").sort()).toEqual(
      ["Stats", "Testimonials", "Trust strip"].sort()
    )
  })

  it("needs every word to match, and drops groups with no match", () => {
    const groups = pickerGroups("page")
    expect(filterGroups(groups, "  ")).toEqual(groups)
    expect(filterGroups(groups, "hero zzz")).toEqual([])
    expect(filterGroups(groups, "hero").map((g) => g.heading)).toEqual([
      "Heroes",
    ])
  })
})

describe("the dialog", () => {
  it("is closed without a target", () => {
    open(null)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("is a dialog named for Blocks, with groups and a thumbnail on each option", () => {
    open({ region: "page", index: 0 })
    const picker = dialog()
    expect(within(picker).getAllByRole("group").length).toBeGreaterThan(1)
    const hero = option(/^Hero\b/)
    const image = hero.querySelector("img")
    expect(image?.getAttribute("src")).toBe(catalogue.hero.thumbnail)
    // Decorative: the visible label names the option.
    expect(image?.getAttribute("alt")).toBe("")
    expect(hero.textContent).toContain("Hero")
    expect(hero.textContent).toContain(catalogue.hero.description)
  })

  it("has no accessibility violations", async () => {
    open({ region: "page", index: 0 })
    const results = await axe.run(dialog(), {
      rules: { "color-contrast": { enabled: false } },
    })
    expect(results.violations).toEqual([])
  })

  it("filters as you type, and says so when nothing matches", async () => {
    const user = userEvent.setup()
    open({ region: "page", index: 0 })
    await user.type(searchBox(), "call")
    expect(option(/^Call to action\b/)).toBeTruthy()
    expect(screen.queryByRole("option", { name: /^Hero\b/ })).toBeNull()
    await user.clear(searchBox())
    expect(option(/^Hero\b/)).toBeTruthy()
    await user.type(searchBox(), "zzzz")
    expect(screen.queryAllByRole("option")).toHaveLength(0)
    expect(screen.getByText(/No Blocks match/)).toBeTruthy()
  })

  it("shows only Header Blocks for a Header, and Footer ones for a Footer", () => {
    open({ region: "header", index: 0 })
    expect(screen.getAllByRole("option")).toHaveLength(4)
    expect(screen.queryByRole("option", { name: /^Hero\b/ })).toBeNull()
    expect(screen.queryByRole("option", { name: /^Legal bar\b/ })).toBeNull()
    cleanup()
    open({ region: "footer", index: 0 })
    expect(screen.getAllByRole("option")).toHaveLength(4)
    expect(option(/^Newsletter\b/)).toBeTruthy()
    expect(option(/^Call to action\b/)).toBeTruthy()
    expect(screen.queryByRole("option", { name: /^Logo\b/ })).toBeNull()
  })
})

describe("inserting", () => {
  it("inserts the catalogue's defaults at the target and closes", async () => {
    const user = userEvent.setup()
    const { onInsert, onClose } = open({ region: "page", index: 2 })
    await user.click(option(/^FAQ\b/))
    expect(onInsert).toHaveBeenCalledTimes(1)
    const [region, index, block] = onInsert.mock.calls[0]!
    expect(region).toBe("page")
    expect(index).toBe(2)
    expect(block).toEqual(catalogue.faq.defaults)
    // A copy, so editing the new Block never edits the catalogue.
    expect(block).not.toBe(catalogue.faq.defaults)
    expect(block.questions).not.toBe(catalogue.faq.defaults.questions)
    expect(onClose).toHaveBeenCalled()
  })

  it("inserts a Header Block with its own defaults", async () => {
    const user = userEvent.setup()
    const { onInsert } = open({ region: "header", index: 0 })
    await user.click(option(/^Utility strip\b/))
    expect(onInsert).toHaveBeenCalledWith(
      "header",
      0,
      expect.objectContaining({ blockType: "utilityStrip" })
    )
  })

  it("inserts the Page catalogue's defaults for Newsletter in a Footer", async () => {
    const user = userEvent.setup()
    const { onInsert } = open({ region: "footer", index: 1 })
    await user.click(option(/^Newsletter\b/))
    expect(onInsert).toHaveBeenCalledWith(
      "footer",
      1,
      catalogue.newsletter.defaults
    )
  })

  it("works from the keyboard: type, arrow, Enter", async () => {
    const user = userEvent.setup()
    const { onInsert } = open({ region: "page", index: 0 })
    await user.type(searchBox(), "rich")
    await user.keyboard("{Enter}")
    expect(onInsert).toHaveBeenCalledWith(
      "page",
      0,
      catalogue.richText.defaults
    )
  })

  it("Escape closes without inserting", async () => {
    const user = userEvent.setup()
    const { onInsert, onClose } = open({ region: "page", index: 0 })
    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalled()
    expect(onInsert).not.toHaveBeenCalled()
  })
})
