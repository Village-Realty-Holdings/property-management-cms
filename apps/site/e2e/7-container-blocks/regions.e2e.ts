import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  RUN,
  addBlockButtons,
  blockPicker,
  deleteCreatedSince,
  editorUrl,
  expectNoAxeViolations,
  expectVisible,
  openEditor,
  openTab,
  outlineTree,
  pickerOption,
  runPath,
  type Doc,
} from "../5-visual-editor/support/editor"
import {
  launchBrowser,
  openSession,
  signIn,
  visit,
  type Session,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Containers in a Layout's Header and Footer (apps/site ADR-0011).
 *
 * - On the Site, a Header Container with its Blocks in the centre shows the
 *   Logo in the middle of the page, and a Footer Container on the Primary
 *   background is a band in the Theme's primary colour holding the Logo and
 *   the Legal bar.
 * - A Layout refuses a Footer Block in a Header's Container, and says which.
 * - In the Visual Editor the Header offers a Container, the Outline shows the
 *   Blocks in it, and a Container offers the Header's Blocks but no Utility
 *   strip and nothing of the Footer's.
 */

const STARTED = new Date().toISOString()
const PREFIX = runPath("boxed")
const NAME = `Boxed ${RUN}`

const box = (children: object[], over: object = {}) => ({
  blockType: "container",
  columns: "1",
  gap: "medium",
  align: "centre",
  justify: "centre",
  width: "page",
  background: "default",
  children,
  ...over,
})

let browser: Browser
let admin: Session
let visitor: Session
let page: Page
let layout: Doc

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  visitor = await openSession(browser)
  page = admin.page
  await signIn(page)
  const made = await admin.context.request.post(`${ORIGIN}/api/layouts`, {
    data: {
      name: NAME,
      paths: [{ path: PREFIX }],
      header: [box([{ blockType: "logo", size: "xlarge" }])],
      footer: [
        box(
          [
            { blockType: "logo", size: "large" },
            { blockType: "legalBar", text: `© {year} ${NAME}` },
          ],
          { columns: "2", justify: "start", background: "primary" }
        ),
      ],
    },
  })
  expect(made.ok(), await made.text()).toBe(true)
  layout = ((await made.json()) as { doc: Doc }).doc
  const pageMade = await admin.context.request.post(
    `${ORIGIN}/api/pages?draft=false`,
    {
      data: {
        title: `Boxed page ${RUN}`,
        path: PREFIX,
        _status: "published",
        blocks: [{ blockType: "hero", heading: `Boxed page ${RUN}` }],
      },
    }
  )
  expect(pageMade.ok(), await pageMade.text()).toBe(true)
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

describe("a Container in the Header and the Footer, on the Site", () => {
  it("puts the Logo in the middle of the Header", async () => {
    await visit(visitor.page, PREFIX)
    const logo = visitor.page.getByRole("banner").getByRole("link").first()
    const box = (await logo.boundingBox())!
    const { width } = visitor.page.viewportSize()!
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2)
    // It is as wide as the logo, not the page.
    expect(box.width).toBeLessThan(width / 2)
  })

  it("paints the Footer's Container in the Theme's primary colour, with the Logo and the Legal bar in it", async () => {
    const footer = visitor.page.getByRole("contentinfo")
    const band = footer.locator("> div").first()
    const [background, primary] = await band.evaluate((el) => {
      const probe = document.createElement("div")
      probe.style.background = "var(--primary)"
      document.body.append(probe)
      const colour = getComputedStyle(probe).backgroundColor
      probe.remove()
      return [getComputedStyle(el).backgroundColor, colour]
    })
    expect(background).toBe(primary)
    expect(await band.getByRole("link").count()).toBeGreaterThan(0)
    expect(await band.textContent()).toContain(
      `© ${new Date().getFullYear()} ${NAME}`
    )
  })

  it("passes WCAG 2.2 AA, at a phone's width too", async () => {
    await expectNoAxeViolations(visitor.page, "the Page in its boxed Layout")
    await visitor.page.setViewportSize({ width: 320, height: 720 })
    try {
      await visit(visitor.page, PREFIX)
      expect(
        await visitor.page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1
        )
      ).toBe(false)
      await expectNoAxeViolations(visitor.page, "the same at 320 pixels")
    } finally {
      await visitor.page.setViewportSize({ width: 1280, height: 900 })
    }
  })
})

describe("what a region's Container holds", () => {
  it("refuses a Footer Block in a Header's Container, and says which", async () => {
    const response = await admin.context.request.patch(
      `${ORIGIN}/api/layouts/${layout.id}`,
      { data: { header: [box([{ blockType: "legalBar", text: "x" }])] } }
    )
    expect(response.status()).toBe(400)
    expect(await response.text()).toContain(
      "A “legalBar” Block can't be in a Container in a Header. Remove it."
    )
  })
})

describe("in the Visual Editor", () => {
  it("shows the Container and the Logo in it in the Outline", async () => {
    await openEditor(page, editorUrl.layout(layout.id))
    await openTab(page, "Outline")
    const rows = await outlineTree(page)
      .getByRole("treeitem")
      .evaluateAll((items) =>
        items.map(
          (item) =>
            `${item.getAttribute("aria-level")}:${item.getAttribute("aria-label")}`
        )
      )
    // Header: the Container, the Logo in it. Footer: the Container, its two.
    expect(rows.filter((row) => /Container/.test(row))).toHaveLength(2)
    expect(rows.filter((row) => /^2:.*Logo/.test(row))).toHaveLength(2)
    expect(rows.some((row) => /^2:.*Legal bar/.test(row))).toBe(true)
  })

  it("offers the Header a Container", async () => {
    await addBlockButtons(outlineTree(page), "Header").first().click()
    const picker = blockPicker(page)
    await expectVisible(picker, "the Block picker")
    expect(await pickerOption(picker, "Container").count()).toBe(1)
    await page.keyboard.press("Escape")
  })

  it("offers a Header's Container the Header's Blocks: no Utility strip, nothing of the Footer's", async () => {
    await outlineTree(page)
      .getByRole("button", { name: "Add a Block to this Container" })
      .first()
      .click()
    const picker = blockPicker(page)
    await expectVisible(picker, "the Block picker")
    for (const name of ["Logo", "Navigation", "Header actions", "Container"])
      expect(await pickerOption(picker, name).count(), `offers ${name}`).toBe(1)
    for (const name of ["Utility strip", "Legal bar", "Footer columns", "Hero"])
      expect(
        await pickerOption(picker, name).count(),
        `leaves out ${name}`
      ).toBe(0)
    await expectNoAxeViolations(page, "the Container's Block picker", {
      includeCanvas: false,
    })
    await page.keyboard.press("Escape")
  })
})
