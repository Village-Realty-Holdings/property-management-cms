// @vitest-environment jsdom
import { cleanup, render, within } from "@testing-library/react"
import axe from "axe-core"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import { footerBlocks, headerBlocks } from "../../blocks/region"
import type {
  CallToActionBlock,
  FooterColumnsBlock,
  HeaderActionsBlock,
  LegalBarBlock,
  LogoBlock,
  NavigationBlock,
  NewsletterBlock,
  Page,
  UtilityStripBlock,
} from "../../payload-types"
import type { Brand } from "../brand"
import { fixturesFor } from "../fixtures"
import { regionCatalogue, regionCatalogueEntry } from "./catalogue"
import { expandLegalText } from "./LegalBar"
import { RegionBlocks } from "./RegionBlocks"
import type {
  FooterBlock,
  HeaderBlock,
  RegionBlock,
  RegionContext,
} from "./types"

afterEach(cleanup)

const brand: Brand = {
  name: "Warren Beach",
  tagline: "Holidays by the sea",
  logo: null,
  phone: "+44 20 7946 0000",
  email: "hello@warren.example",
  address: "1 Shore Road\nSt Ives",
  social: [
    { platform: "instagram", url: "https://instagram.com/warren" },
    { platform: "facebook", url: "https://facebook.com/warren" },
  ],
}

const context = (overrides: Partial<RegionContext> = {}) => ({
  fixtures: fixturesFor(undefined),
  editing: false,
  brand,
  ...overrides,
})

const page = (path: string) => ({ id: 1, title: "A page", path }) as Page

const logo = (overrides: Partial<LogoBlock> = {}): LogoBlock => ({
  blockType: "logo",
  size: "medium",
  ...overrides,
})

const utilityStrip = (): UtilityStripBlock => ({
  blockType: "utilityStrip",
  text: "Free cancellation on every stay",
  links: [
    { label: "Offers", link: { type: "url", url: "/offers" } },
    { label: "Help", link: { type: "page", page: page("/help") } },
  ],
})

const navigation = (): NavigationBlock => ({
  blockType: "navigation",
  items: [
    { label: "Stays", link: { type: "page", page: page("/stays") } },
    {
      label: "Owners",
      link: { type: "url", url: "https://example.com/owners" },
    },
    {
      label: "Explore",
      display: "dropdown",
      children: [
        { label: "Beaches", link: { type: "url", url: "/beaches" } },
        { label: "Guide", link: { type: "url", url: "/guide" } },
      ],
    },
  ],
})

const headerActions = (
  overrides: Partial<HeaderActionsBlock> = {}
): HeaderActionsBlock => ({
  blockType: "headerActions",
  showPhone: true,
  phone: "+44 (0)20 7946 0001",
  button: { label: "Book now", href: "/book" },
  login: { label: "Owner login", href: "https://example.com/login" },
  ...overrides,
})

const footerColumns = (): FooterColumnsBlock => ({
  blockType: "footerColumns",
  columns: [
    {
      heading: "Company",
      content: "links",
      links: [
        { label: "About us", link: { type: "url", url: "/about" } },
        { label: "Careers", link: { type: "page", page: page("/careers") } },
      ],
    },
    { heading: "Visit us", content: "address" },
    {
      heading: "Opening hours",
      content: "hours",
      hours: "Mon–Fri 9:00–17:00\nSat 10:00–14:00",
    },
    { heading: "Follow us", content: "social" },
  ],
})

const legalBar = (overrides: Partial<LegalBarBlock> = {}): LegalBarBlock => ({
  blockType: "legalBar",
  text: "© {year} {name}. All rights reserved.",
  links: [
    { label: "Privacy", link: { type: "url", url: "/privacy" } },
    { label: "Terms", link: { type: "url", url: "/terms" } },
  ],
  ...overrides,
})

const callToAction = (): CallToActionBlock => ({
  blockType: "callToAction",
  heading: "Own a holiday home?",
  button: { label: "Talk to us", href: "/owners" },
  style: "primary",
})

const newsletter = (): NewsletterBlock => ({
  blockType: "newsletter",
  heading: "Stay in the loop",
  buttonLabel: "Subscribe",
})

const header = (blocks: HeaderBlock[], ctx = context()) =>
  render(<RegionBlocks region="header" blocks={blocks} context={ctx} />)

const footer = (blocks: FooterBlock[], ctx = context()) =>
  render(<RegionBlocks region="footer" blocks={blocks} context={ctx} />)

const hrefOf = (element: HTMLElement) => element.getAttribute("href")

/** WCAG 2.2 AA violations in `element`. jsdom has no layout, so colour contrast is left to the browser tests (e2e/3-layouts). */
async function violations(element: HTMLElement) {
  const results = await axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: {
      "color-contrast": { enabled: false },
      // The region is rendered alone here, not inside a full page.
      region: { enabled: false },
    },
  })
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.html),
  }))
}

describe("the Header", () => {
  it("is a banner landmark, empty when it has no Blocks", () => {
    const { container, getByRole } = header([logo()])
    expect(getByRole("banner")).toBe(container.querySelector("header"))
    cleanup()
    expect(header([]).container.querySelector("header")).toBeNull()
  })

  it("puts Utility strips above the row of Logo, Navigation and actions", () => {
    const { getByRole } = header([
      logo(),
      navigation(),
      headerActions(),
      utilityStrip(),
    ])
    const banner = getByRole("banner")
    const strip = within(banner).getByText("Free cancellation on every stay")
    const home = within(banner).getByRole("link", { name: "Warren Beach" })
    expect(
      strip.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("renders the Logo as the Brand's name when the Brand has no logo, linking home", () => {
    const { getByRole } = header([logo()])
    const link = getByRole("link", { name: "Warren Beach" })
    expect(hrefOf(link)).toBe("/")
    expect(link.querySelector("img")).toBeNull()
  })

  it("renders the Brand's logo image, named by its alt text or else the Brand's name", () => {
    const withLogo = {
      ...brand,
      logo: { url: "/api/media/file/logo.png", alt: "" },
    }
    const { getByRole, container } = header(
      [logo()],
      context({ brand: withLogo })
    )
    const link = getByRole("link", { name: "Warren Beach" })
    expect(hrefOf(link)).toBe("/")
    expect(container.querySelector("img")!.getAttribute("alt")).toBe(
      "Warren Beach"
    )
    cleanup()
    const alt = {
      ...brand,
      logo: { url: "/api/media/file/logo.png", alt: "Warren Beach logo" },
    }
    const second = header([logo()], context({ brand: alt }))
    expect(second.container.querySelector("img")!.getAttribute("alt")).toBe(
      "Warren Beach logo"
    )
  })

  it("shows the Brand's tagline only when asked", () => {
    expect(header([logo()]).queryByText("Holidays by the sea")).toBeNull()
    cleanup()
    expect(
      header([logo({ showTagline: true })]).getByText("Holidays by the sea")
    ).toBeTruthy()
  })

  it("sizes the Logo by the size it is given", () => {
    const small = header([logo({ size: "small" })]).container.innerHTML
    cleanup()
    const large = header([logo({ size: "large" })]).container.innerHTML
    expect(small).not.toBe(large)
  })

  it("renders Header actions: a tel: link, a button and a login link", () => {
    const { getByRole } = header([headerActions()])
    const tel = getByRole("link", { name: /\+44 \(0\)20 7946 0001/ })
    expect(hrefOf(tel)).toBe("tel:+4402079460001")
    expect(hrefOf(getByRole("link", { name: "Book now" }))).toBe("/book")
    expect(hrefOf(getByRole("link", { name: "Owner login" }))).toBe(
      "https://example.com/login"
    )
  })

  it("falls back to the Brand's phone number when the Block has none", () => {
    const { getByRole } = header([headerActions({ phone: "" })])
    expect(hrefOf(getByRole("link", { name: /\+44 20 7946 0000/ }))).toBe(
      "tel:+442079460000"
    )
  })

  it("hides the phone number when it is switched off, or when there is none", () => {
    expect(
      header([headerActions({ showPhone: false })]).queryByRole("link", {
        name: /\+44/,
      })
    ).toBeNull()
    cleanup()
    const noPhone = context({ brand: { ...brand, phone: null } })
    expect(
      header([headerActions({ phone: null })], noPhone).queryByRole("link", {
        name: /\+44|tel/,
      })
    ).toBeNull()
  })

  it("leaves out a button or login link without both a label and a safe link", () => {
    const { queryByRole } = header([
      headerActions({
        button: { label: "Book now", href: "javascript:alert(1)" },
        login: { label: "", href: "/login" },
      }),
    ])
    expect(queryByRole("link", { name: "Book now" })).toBeNull()
    expect(queryByRole("link", { name: "Owner login" })).toBeNull()
    expect(queryByRole("link", { name: "" })).toBeNull()
  })

  it("renders the Utility strip's line and links", () => {
    const { getByRole, getByText } = header([utilityStrip()])
    expect(getByText("Free cancellation on every stay")).toBeTruthy()
    expect(hrefOf(getByRole("link", { name: "Offers" }))).toBe("/offers")
    expect(hrefOf(getByRole("link", { name: "Help" }))).toBe("/help")
  })

  it("renders the Navigation's top-level links, with a dropdown's links closed", () => {
    const { getByRole, queryByRole } = header([navigation()])
    const nav = getByRole("navigation")
    expect(hrefOf(within(nav).getByRole("link", { name: "Stays" }))).toBe(
      "/stays"
    )
    expect(hrefOf(within(nav).getByRole("link", { name: "Owners" }))).toBe(
      "https://example.com/owners"
    )
    // A dropdown has no link of its own, and its links stay hidden until it opens.
    expect(queryByRole("link", { name: "Explore" })).toBeNull()
    expect(queryByRole("link", { name: "Beaches" })).toBeNull()
  })

  it("renders nothing for a Block that belongs in the Footer, or one it does not know", () => {
    const misplaced = [
      legalBar(),
      footerColumns(),
      callToAction(),
      { blockType: "gone" },
    ] as unknown as RegionBlock[]
    const { container } = header(misplaced as HeaderBlock[])
    expect(container.textContent).toBe("")
  })
})

describe("the Footer", () => {
  it("is a contentinfo landmark, empty when it has no Blocks", () => {
    const { container, getByRole } = footer([legalBar()])
    expect(getByRole("contentinfo")).toBe(container.querySelector("footer"))
    cleanup()
    expect(footer([]).container.querySelector("footer")).toBeNull()
  })

  it("renders a column of links, each going to a Page's path or a URL", () => {
    const { getByRole } = footer([footerColumns()])
    expect(getByRole("heading", { name: "Company" })).toBeTruthy()
    expect(hrefOf(getByRole("link", { name: "About us" }))).toBe("/about")
    expect(hrefOf(getByRole("link", { name: "Careers" }))).toBe("/careers")
  })

  it("renders the address column from the Brand", () => {
    const { getByRole, container } = footer([footerColumns()])
    expect(getByRole("heading", { name: "Visit us" })).toBeTruthy()
    const address = container.querySelector("address")!
    expect(address.textContent).toBe("1 Shore Road\nSt Ives")
  })

  it("prefers an address typed into the column over the Brand's", () => {
    const block = footerColumns()
    block.columns![1]!.address = "9 Harbour Lane"
    const { container } = footer([block])
    expect(container.querySelector("address")!.textContent).toBe(
      "9 Harbour Lane"
    )
  })

  it("renders the opening hours column, one line each", () => {
    const { getByRole, getByText } = footer([footerColumns()])
    expect(getByRole("heading", { name: "Opening hours" })).toBeTruthy()
    expect(getByText("Mon–Fri 9:00–17:00")).toBeTruthy()
    expect(getByText("Sat 10:00–14:00")).toBeTruthy()
  })

  it("renders the social links column from the Brand", () => {
    const { getByRole } = footer([footerColumns()])
    expect(getByRole("heading", { name: "Follow us" })).toBeTruthy()
    expect(hrefOf(getByRole("link", { name: "instagram" }))).toBe(
      "https://instagram.com/warren"
    )
    expect(hrefOf(getByRole("link", { name: "facebook" }))).toBe(
      "https://facebook.com/warren"
    )
  })

  it("leaves out a column that has nothing to show", () => {
    const empty = context({
      brand: { ...brand, address: null, social: [] },
    })
    const { queryByRole, getByRole } = footer([footerColumns()], empty)
    expect(queryByRole("heading", { name: "Visit us" })).toBeNull()
    expect(queryByRole("heading", { name: "Follow us" })).toBeNull()
    expect(getByRole("heading", { name: "Company" })).toBeTruthy()
  })

  it("renders the Legal bar with {year} and {name} filled in", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2031-06-01T12:00:00Z"))
    try {
      const { getByText, getByRole } = footer([legalBar()])
      expect(
        getByText("© 2031 Warren Beach. All rights reserved.")
      ).toBeTruthy()
      expect(hrefOf(getByRole("link", { name: "Privacy" }))).toBe("/privacy")
      expect(hrefOf(getByRole("link", { name: "Terms" }))).toBe("/terms")
    } finally {
      vi.useRealTimers()
    }
  })

  it("renders a Call to action through the page Block registry", () => {
    const { getByRole } = footer([callToAction()])
    expect(getByRole("heading", { name: "Own a holiday home?" })).toBeTruthy()
    expect(hrefOf(getByRole("link", { name: "Talk to us" }))).toBe("/owners")
  })

  it("does not fail on a Newsletter before the page Block registry draws one", () => {
    // Newsletter is a Phase 4 page Block. Until then the registry has none,
    // and the Footer leaves it out rather than fail.
    expect(() => footer([newsletter()])).not.toThrow()
  })

  it("renders nothing for a Block that belongs in the Header", () => {
    const misplaced = [
      logo(),
      navigation(),
      headerActions(),
      utilityStrip(),
    ] as unknown as FooterBlock[]
    expect(footer(misplaced).container.textContent).toBe("")
  })
})

describe("expandLegalText", () => {
  it("replaces every {year} and {name}, and leaves other text alone", () => {
    expect(
      expandLegalText("© {year} {name} · {year} {other}", "Avada", 2030)
    ).toBe("© 2030 Avada · 2030 {other}")
  })

  it("does not read $ in the name as a replacement pattern", () => {
    expect(expandLegalText("{name}", "Cash $& Co", 2030)).toBe("Cash $& Co")
  })
})

describe("in the Visual Editor", () => {
  const editable = / data-(?:block-index|editable-field)="[^"]*"/g

  it.each([
    [
      "header",
      (editing: boolean) =>
        header(
          [utilityStrip(), logo(), navigation(), headerActions()],
          context({ editing })
        ),
    ],
    [
      "footer",
      (editing: boolean) =>
        footer(
          [footerColumns(), legalBar(), callToAction()],
          context({ editing })
        ),
    ],
  ])("the %s is the Site's markup plus its field names", (_name, draw) => {
    const siteHtml = draw(false).container.innerHTML
    cleanup()
    const editingHtml = draw(true).container.innerHTML
    expect(editingHtml).toContain("data-editable-field")
    expect(editingHtml.replace(editable, "").replace(/ {2,}/g, " ")).toBe(
      siteHtml.replace(/ {2,}/g, " ")
    )
  })
})

describe("the region catalogue", () => {
  it("lists the Header's Blocks and the Footer's, as the Payload config does", () => {
    expect(regionCatalogue("header").map((e) => e.blockType)).toEqual(
      headerBlocks.map((b) => b.slug)
    )
    expect(regionCatalogue("footer").map((e) => e.blockType)).toEqual(
      footerBlocks.map((b) => b.slug)
    )
  })

  it("labels every entry as the Admin does", () => {
    for (const block of [...headerBlocks, ...footerBlocks]) {
      const entry = regionCatalogueEntry(block.slug as RegionBlock["blockType"])
      const label = block.labels?.singular
      expect(entry.label, block.slug).toBe(label)
    }
  })

  it("puts each thumbnail at /block-thumbnails/<slug>.svg, and draws the ones it owns", () => {
    const publicDir = join(import.meta.dirname, "../../../public")
    for (const region of ["header", "footer"] as const) {
      for (const entry of regionCatalogue(region)) {
        expect(entry.thumbnail).toBe(`/block-thumbnails/${entry.slug}.svg`)
        // Newsletter's thumbnail comes with its page Block (Phase 4).
        if (entry.blockType === "newsletter") continue
        expect(
          existsSync(join(publicDir, entry.thumbnail)),
          entry.thumbnail
        ).toBe(true)
      }
    }
  })

  it("takes the region-only Blocks in one region, the shared ones in the Footer", () => {
    expect(regionCatalogueEntry("logo").region).toBe("header")
    expect(regionCatalogueEntry("legalBar").region).toBe("footer")
    expect(regionCatalogueEntry("newsletter")).toMatchObject({
      region: "footer",
      shared: true,
    })
    expect(regionCatalogueEntry("callToAction")).toMatchObject({
      region: "footer",
      shared: true,
    })
  })

  it("starts each region-only Block from defaults that render", () => {
    for (const region of ["header", "footer"] as const) {
      for (const entry of regionCatalogue(region)) {
        if (entry.shared) continue
        expect(entry.defaults.blockType).toBe(entry.blockType)
        const block = entry.defaults as RegionBlock
        const { container } =
          region === "header"
            ? header([block as HeaderBlock])
            : footer([block as FooterBlock])
        expect(container.textContent!.trim(), entry.label).not.toBe("")
        cleanup()
      }
    }
  })
})

describe("accessibility", () => {
  it("the Header passes axe", async () => {
    const { container } = header([
      utilityStrip(),
      logo({ showTagline: true }),
      navigation(),
      headerActions(),
    ])
    expect(await violations(container)).toEqual([])
  })

  it("the Header with the Brand's logo image passes axe", async () => {
    const withLogo = {
      ...brand,
      logo: { url: "/api/media/file/logo.png", alt: "Warren Beach" },
    }
    const { container } = header(
      [logo(), navigation(), headerActions()],
      context({ brand: withLogo })
    )
    expect(await violations(container)).toEqual([])
  })

  it("the Footer passes axe", async () => {
    const { container } = footer([footerColumns(), legalBar(), callToAction()])
    expect(await violations(container)).toEqual([])
  })
})

describe("the region components read tokens only", () => {
  it("the source has no raw colour, brand variable or fixed pill", () => {
    const dir = import.meta.dirname
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx")
    )
    expect(files.length).toBeGreaterThan(5)
    for (const file of files) {
      const text = readFileSync(join(dir, file), "utf8")
      expect(text, file).not.toMatch(/--brand-|brand[A-Z]/)
      expect(text, file).not.toMatch(
        /(?<![\w-])(bg|text|from|via|to|border|ring|outline)-(white|black|neutral|gray|slate|zinc)\b/
      )
      expect(text, file).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(|hsl\(|oklch\(/i)
      expect(text, file).not.toMatch(/rounded-(2xl|xl|lg|md)\b/)
    }
  })
})
