import type { Locator, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { DESKTOP, visit } from "../theme/support/browser"
import {
  blocks,
  column,
  nav,
  pageLink,
  urlLink,
  type Block,
  type Doc,
} from "./support/api"
import {
  accessibilityProblems,
  chromeOf,
  closeHarness,
  openHarness,
  scrollsSideways,
  type Harness,
} from "./support/site"

/**
 * Phase 3 acceptance: the region Blocks render on the Site, and each region
 * takes only the Blocks allowed there (spec "Layouts and region Blocks").
 *
 * - Header only: Logo (from the Brand), Navigation (links to a Page or a URL,
 *   one level of dropdowns, a dropdown shown as mega-menu columns), Header
 *   actions (phone, button, login link) and a Utility strip.
 * - Footer only: Footer columns (links, the address, opening hours or social
 *   links) and a Legal bar.
 * - Also allowed in the Footer: Newsletter and Call to action.
 *
 * The Site with this chrome must pass WCAG 2.2 AA (axe), with a dropdown
 * open too, and reflow at 320px without scrolling sideways. The dropdowns
 * work from the keyboard.
 */

const PREFIX = "/e2e-chrome"

let h: Harness
let target: Doc
let beaches: Doc
let brandName: string
let chromeLayout: Doc

const HEADER: (pages: { target: number; beaches: number }) => Block[] = (
  pages
) => [
  blocks.utilityStrip("Free cancellation on every stay"),
  blocks.logo(),
  blocks.navigation([
    nav.link("Chrome target", pageLink(pages.target)),
    nav.link("Owners", urlLink("https://example.com/owners")),
    nav.dropdown("Explore", [
      nav.link("Beaches", pageLink(pages.beaches)),
      nav.link("Travel guide", urlLink("https://example.com/guide")),
    ]),
    nav.dropdown(
      "Destinations",
      [
        nav.link("Skye", urlLink("https://example.com/skye")),
        nav.link("Mull", urlLink("https://example.com/mull")),
        nav.link("Islay", urlLink("https://example.com/islay")),
        nav.link("Harris", urlLink("https://example.com/harris")),
        nav.link("Lewis", urlLink("https://example.com/lewis")),
        nav.link("Arran", urlLink("https://example.com/arran")),
      ],
      { mega: true }
    ),
  ]),
  blocks.headerActions({
    phone: "+44 20 7946 0000",
    button: { label: "Book now", href: `${PREFIX}/book` },
    login: { label: "Owner login", href: "https://example.com/login" },
  }),
]

const FOOTER: Block[] = [
  blocks.footerColumns([
    column.links("Company", [
      nav.link("About us", urlLink("https://example.com/about")),
    ]),
    column.address("Visit us"),
    column.hours("Opening hours", "Mon–Fri 9:00–17:00"),
    column.social("Follow us"),
  ]),
  blocks.legalBar("© E2E Holidays Ltd"),
]

beforeAll(async () => {
  h = await openHarness()
  brandName = await h.api.brandName()
  target = await h.api.createPage({
    title: "Chrome target",
    path: `${PREFIX}/target`,
  })
  beaches = await h.api.createPage({
    title: "Beaches",
    path: `${PREFIX}/beaches`,
  })
  chromeLayout = await h.api.createLayout({
    name: "Full chrome",
    paths: [PREFIX],
    header: HEADER({ target: target.id, beaches: beaches.id }),
    footer: FOOTER,
  })
})

afterAll(async () => {
  await closeHarness(h)
})

const banner = (page: Page) => page.getByRole("banner")
const footer = (page: Page) => page.getByRole("contentinfo")

async function hrefOf(link: Locator) {
  expect(await link.count(), "the link exists").toBeGreaterThan(0)
  return link.first().getAttribute("href")
}

describe("the Header's Blocks", () => {
  it("renders the Utility strip and the Logo from the Brand", async () => {
    const { page } = h.visitor
    const chrome = await chromeOf(page, `${PREFIX}/target`)
    expect(chrome.status).toBe(200)
    expect(chrome.header).toContain("Free cancellation on every stay")
    expect(
      await hrefOf(banner(page).getByRole("link", { name: brandName }))
    ).toBe("/")
  })

  it("renders Navigation links to a Page and to a URL", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}/target`)
    const menu = banner(page).getByRole("navigation")
    expect(
      await hrefOf(menu.getByRole("link", { name: "Chrome target" }))
    ).toBe(`${PREFIX}/target`)
    expect(await hrefOf(menu.getByRole("link", { name: "Owners" }))).toBe(
      "https://example.com/owners"
    )
  })

  it("opens a dropdown from the keyboard and closes it with Escape", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}/target`)
    const toggle = banner(page).getByRole("button", { name: "Explore" })
    expect(await toggle.getAttribute("aria-expanded")).toBe("false")

    await page.keyboard.press("Shift")
    await toggle.focus()
    await page.keyboard.press("Enter")
    expect(await toggle.getAttribute("aria-expanded")).toBe("true")
    const child = banner(page).getByRole("link", { name: "Beaches" })
    await child.waitFor({ state: "visible" })
    expect(await child.getAttribute("href")).toBe(`${PREFIX}/beaches`)

    await page.keyboard.press("Escape")
    expect(await toggle.getAttribute("aria-expanded")).toBe("false")
    expect(
      await toggle.evaluate((el) => el === document.activeElement),
      "focus returns to the dropdown's button"
    ).toBe(true)
  })

  it("shows a mega-menu dropdown as columns", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}/target`)
    await banner(page).getByRole("button", { name: "Destinations" }).click()
    const names = ["Skye", "Mull", "Islay", "Harris", "Lewis", "Arran"]
    const lefts = new Set<number>()
    for (const name of names) {
      const link = banner(page).getByRole("link", { name })
      await link.waitFor({ state: "visible" })
      lefts.add(Math.round((await link.boundingBox())!.x))
    }
    expect(
      lefts.size,
      "links laid out in more than one column"
    ).toBeGreaterThan(1)
  })

  it("shows a plain dropdown as one list", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}/target`)
    await banner(page).getByRole("button", { name: "Explore" }).click()
    const lefts = new Set<number>()
    for (const name of ["Beaches", "Travel guide"]) {
      const link = banner(page).getByRole("link", { name })
      await link.waitFor({ state: "visible" })
      lefts.add(Math.round((await link.boundingBox())!.x))
    }
    expect(lefts.size).toBe(1)
  })

  it("renders Header actions: the phone number, a button and a login link", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}/target`)
    const header = banner(page)
    const tel = await hrefOf(
      header.getByRole("link", { name: /\+44 20 7946 0000/ })
    )
    expect(tel).toMatch(/^tel:/)
    expect(tel!.replace(/^tel:/, "").replace(/[^+\d]/g, "")).toBe(
      "+442079460000"
    )
    expect(await hrefOf(header.getByRole("link", { name: "Book now" }))).toBe(
      `${PREFIX}/book`
    )
    expect(
      await hrefOf(header.getByRole("link", { name: "Owner login" }))
    ).toBe("https://example.com/login")
  })
})

describe("the Footer's Blocks", () => {
  it("keeps each kind of Footer column: links, the address, opening hours, social links", async () => {
    const saved = (await h.api.getLayout(chromeLayout.id))!
    const [columns] = ((saved.footer as Block[]) ?? []).filter(
      (b) => b.blockType === "footerColumns"
    )
    expect(columns, "the Footer columns Block is saved").toBeDefined()
    expect((columns!.columns as unknown[]).length).toBe(4)
  })

  it("renders Footer columns with links and opening hours", async () => {
    // The address and social columns show the Brand's, which the scratch
    // Site leaves empty (saving a Brand needs a Site name, and the Theme
    // specs photograph the Brand screen empty), so only these two are read.
    const { page } = h.visitor
    const chrome = await chromeOf(page, `${PREFIX}/target`)
    const region = footer(page)
    for (const heading of ["Company", "Opening hours"])
      expect(
        await region.getByRole("heading", { name: heading }).count(),
        `column "${heading}"`
      ).toBe(1)
    expect(await hrefOf(region.getByRole("link", { name: "About us" }))).toBe(
      "https://example.com/about"
    )
    expect(chrome.footer).toContain("Mon–Fri 9:00–17:00")
  })

  it("renders the Legal bar", async () => {
    const chrome = await chromeOf(h.visitor.page, `${PREFIX}/target`)
    expect(chrome.footer).toContain("© E2E Holidays Ltd")
  })

  it("renders a Newsletter and a Call to action in the Footer", async () => {
    await h.api.createLayout({
      name: "Footer extras",
      paths: [`${PREFIX}-extras`],
      footer: [
        blocks.newsletter(
          "Stay in the loop",
          "News from the coast, once a month."
        ),
        blocks.callToAction("Own a holiday home?", {
          label: "Talk to us",
          href: `${PREFIX}/owners`,
        }),
      ],
    })
    await h.api.createPage({ title: "Extras", path: `${PREFIX}-extras` })
    const { page } = h.visitor
    await visit(page, `${PREFIX}-extras`)
    const region = footer(page)
    expect(
      await region.getByRole("heading", { name: "Stay in the loop" }).count()
    ).toBe(1)
    expect(await region.getByRole("textbox", { name: /email/i }).count()).toBe(
      1
    )
    expect(
      await region.getByRole("heading", { name: "Own a holiday home?" }).count()
    ).toBe(1)
    expect(await hrefOf(region.getByRole("link", { name: "Talk to us" }))).toBe(
      `${PREFIX}/owners`
    )
  })
})

describe("which Blocks each region takes", () => {
  /** The Block types a saved region holds, or null if the save was refused. */
  async function saved(region: "header" | "footer", block: Block) {
    const response = await h.api.postLayout({
      name: `Misplaced ${block.blockType} in ${region}`,
      header: region === "header" ? [block] : [],
      footer: region === "footer" ? [block] : [],
    })
    if (!response.ok()) return null
    const { doc } = (await response.json()) as { doc: Doc }
    h.api.track("layout", doc.id)
    return ((doc[region] as Block[] | undefined) ?? []).map((b) => b.blockType)
  }

  it.each([
    ["footerColumns", blocks.footerColumns([column.hours("Hours", "9–5")])],
    ["legalBar", blocks.legalBar("© Nobody")],
    ["newsletter", blocks.newsletter("News", "Monthly.")],
    ["callToAction", blocks.callToAction("Hello", { label: "Go", href: "/" })],
  ])("never keeps a %s Block in a Header", async (type, block) => {
    const types = await saved("header", block)
    if (types !== null) expect(types).not.toContain(type)
  })

  it("keeps a logo Block in a Footer (ADR-0011)", async () => {
    expect(await saved("footer", blocks.logo())).toEqual(["logo"])
  })

  it.each([
    ["navigation", blocks.navigation([nav.link("Home", urlLink("/"))])],
    ["headerActions", blocks.headerActions({ phone: "+44 1234 567890" })],
    ["utilityStrip", blocks.utilityStrip("Nope")],
  ])("never keeps a %s Block in a Footer", async (type, block) => {
    const types = await saved("footer", block)
    if (types !== null) expect(types).not.toContain(type)
  })
})

describe("accessibility of the Site's chrome", () => {
  it("passes WCAG 2.2 AA (axe)", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}/target`)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("passes WCAG 2.2 AA with a dropdown and the mega menu open", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}/target`)
    await banner(page).getByRole("button", { name: "Explore" }).click()
    await banner(page).getByRole("link", { name: "Beaches" }).waitFor()
    expect(await accessibilityProblems(page)).toBe("")

    await visit(page, `${PREFIX}/target`)
    await banner(page).getByRole("button", { name: "Destinations" }).click()
    await banner(page).getByRole("link", { name: "Skye" }).waitFor()
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("passes WCAG 2.2 AA with the Newsletter and Call to action in the Footer", async () => {
    const { page } = h.visitor
    await visit(page, `${PREFIX}-extras`)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("reflows at 320px: no sideways scrolling, and the menu is still reachable", async () => {
    const { page } = h.visitor
    await page.setViewportSize({ width: 320, height: 800 })
    try {
      await visit(page, `${PREFIX}/target`)
      expect(await scrollsSideways(page)).toBe(false)

      const link = banner(page).getByRole("link", { name: "Chrome target" })
      if (!(await link.isVisible())) {
        // A small screen may fold the menu behind a button.
        await banner(page)
          .getByRole("button", { name: /menu/i })
          .first()
          .click()
      }
      await page
        .getByRole("link", { name: "Chrome target" })
        .first()
        .waitFor({ state: "visible" })
      expect(await accessibilityProblems(page)).toBe("")
    } finally {
      await page.setViewportSize(DESKTOP)
    }
  })
})
