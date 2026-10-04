import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import {
  EDITOR_ROUTE,
  RUN,
  canvasElement,
  canvasFrame,
  choice,
  control,
  createPage,
  defaultLayout,
  deleteCreatedSince,
  editorUrl,
  expectNoAxeViolations,
  expectVisible,
  goToPage,
  modeChip,
  openEditor,
  openPagePicker,
  pagePicker,
  pagePickerButton,
  panelTab,
  pathnameOf,
  runPath,
  searchField,
  tabStops,
  topBar,
  type Doc,
} from "./support/editor"

/**
 * Phase 5 acceptance: the Visual Editor's shell (spec "Phase 5 › Routes" and
 * "Shell"). `/admin/pages/[id]`, `/admin/layouts/[id]` and `/admin/theme` all
 * open the Visual Editor, and the form-based PageEditor is gone. A dark top
 * bar carries Back, the document name, the mode chip, "Used by N Pages" for a
 * Layout, the Ctrl-K Page picker, Undo / Redo, Discard and Save / Publish (or
 * Save, "Goes live on N Pages"). The panel is docked on the left with its
 * tabs, and the canvas is an iframe rendering the real Site route, with
 * desktop, tablet and mobile widths at real breakpoints. Each screen passes
 * axe's WCAG 2.2 AA rules, and the top bar works from the keyboard.
 */

const STARTED = new Date().toISOString()
const SHELL_TITLE = `Shell check ${RUN}`
const SHELL_PATH = runPath("shell")
const OTHER_TITLE = `Harbour View ${RUN}`
const OTHER_PATH = runPath("harbour-view")

let browser: Browser
let admin: Session
let page: Page
let shellPage: Doc
let otherPage: Doc

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  const request = admin.context.request
  shellPage = await createPage(request, {
    title: SHELL_TITLE,
    path: SHELL_PATH,
    publish: true,
  })
  otherPage = await createPage(request, {
    title: OTHER_TITLE,
    path: OTHER_PATH,
    publish: true,
  })
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/** Relative luminance of an rgb()/rgba() colour, 0 (black) to 1 (white). */
function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ["255", "255", "255"])
    .slice(0, 3)
    .map((v) => {
      const c = Number(v) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** The background the top bar paints (its own, or the nearest painted one). */
const topBarBackground = (p: Page) =>
  topBar(p).evaluate((el) => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const colour = getComputedStyle(node).backgroundColor
      if (colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent")
        return colour
    }
    return "rgb(255, 255, 255)"
  })

describe("the routes that open the Visual Editor", () => {
  it("opens a Page at /admin/pages/[id], in Page mode", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    await expectVisible(modeChip(page, "Page"), "the Page mode chip")
    expect(await canvasElement(page).count(), "one canvas iframe").toBe(1)
  })

  it("opens a Layout at /admin/layouts/[id], in Layout mode", async () => {
    const layout = await defaultLayout(admin.context.request)
    await openEditor(page, editorUrl.layout(layout.id))
    await expectVisible(modeChip(page, "Layout"), "the Layout mode chip")
    expect(await canvasElement(page).count(), "one canvas iframe").toBe(1)
  })

  it("opens the Theme at /admin/theme, in Theme mode", async () => {
    await openEditor(page, editorUrl.theme())
    await expectVisible(modeChip(page, "Theme"), "the Theme mode chip")
    expect(await canvasElement(page).count(), "one canvas iframe").toBe(1)
  })

  it("opens New Page from the Pages list in the Visual Editor, not a form", async () => {
    await page.goto(`${ORIGIN}/admin/pages`)
    await control(page, "New Page").click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Title", { exact: true }).fill(`Shell ${RUN} new`)
    await dialog.getByLabel("Path", { exact: true }).fill(runPath("shell-new"))
    await control(dialog, "Continue").click()
    await page.waitForURL((url) => url.pathname === "/admin/pages/new")
    await canvasFrame(page)
    await expectVisible(modeChip(page, "Page"), "the Page mode chip")
    // The form-based PageEditor listed Blocks as a form with "Move up" /
    // "Remove Block" per row; the Visual Editor has no such form.
    expect(
      await page.getByRole("button", { name: "Remove Block" }).count(),
      "the old PageEditor's Block form"
    ).toBe(0)
  })
})

describe("the top bar", () => {
  it("is dark, with Back, the document name, the Page chip, Ctrl-K, Undo / Redo, Discard, Save and Publish", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    const bar = topBar(page)
    expect(
      luminance(await topBarBackground(page)),
      "the top bar's background is dark"
    ).toBeLessThan(0.2)

    await expectVisible(control(bar, /^Back\b/), "Back")
    await expectVisible(
      bar.getByText(SHELL_TITLE, { exact: true }),
      "the document name"
    )
    await expectVisible(modeChip(page, "Page"), "the mode chip")
    await expectVisible(
      pagePickerButton(page),
      "the Ctrl-K Page picker's button"
    )
    for (const name of ["Undo", "Redo", "Discard", "Save", "Publish"]) {
      await expectVisible(
        bar.getByRole("button", { name, exact: true }),
        `the ${name} button`
      )
    }
    // "Used by N Pages" belongs to Layout mode only.
    expect(await bar.getByText(/Used by \d+ Pages?/).count()).toBe(0)
  })

  it("in Layout mode shows how far a save reaches: Used by N Pages, and Save that Goes live on N Pages", async () => {
    const layout = await defaultLayout(admin.context.request)
    await openEditor(page, editorUrl.layout(layout.id))
    const bar = topBar(page)
    await expectVisible(bar.getByText(/Used by \d+ Pages?/), "Used by N Pages")
    await expectVisible(
      bar.getByRole("button", { name: /^Save\b/ }),
      "the Save button"
    )
    await expectVisible(
      bar.getByText(/Goes live on \d+ Pages?/),
      "Goes live on N Pages"
    )
    // A Layout is live on save: there is nothing to publish.
    expect(await bar.getByRole("button", { name: "Publish" }).count()).toBe(0)
    for (const name of ["Undo", "Redo", "Discard"]) {
      await expectVisible(
        bar.getByRole("button", { name, exact: true }),
        `the ${name} button`
      )
    }
  })

  it("in Theme mode has Save, and no Publish", async () => {
    await openEditor(page, editorUrl.theme())
    const bar = topBar(page)
    await expectVisible(
      bar.getByRole("button", { name: /^Save\b/ }),
      "the Save button"
    )
    expect(await bar.getByRole("button", { name: "Publish" }).count()).toBe(0)
    expect(
      luminance(await topBarBackground(page)),
      "the top bar is dark in Theme mode too"
    ).toBeLessThan(0.2)
  })

  it("Back leaves the Visual Editor", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    await control(topBar(page), /^Back\b/).click()
    await page.waitForURL((url) => !EDITOR_ROUTE.page.test(url.pathname))
    expect(pathnameOf(page).startsWith("/admin")).toBe(true)
  })

  it("can be worked with the keyboard alone, and shows where focus is", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    const stops = await tabStops(page, topBar(page))
    const names = stops.map((stop) => stop.name)
    expect(
      names.some((name) => /^Back\b/.test(name)),
      "Back"
    ).toBe(true)
    expect(
      names.some((name) => /Publish/.test(name)),
      "Publish"
    ).toBe(true)
    expect(
      stops.filter((stop) => !stop.visible),
      "top bar controls whose focus is not drawn"
    ).toEqual([])
  })
})

describe("the panel", () => {
  it("is docked on the left of the canvas, with the Outline, Block and Page tabs for a Page", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    const tablist = page.getByRole("tablist").first()
    const panel = await tablist.boundingBox()
    const frame = await canvasElement(page).boundingBox()
    expect(
      panel && frame,
      "the panel and the canvas are on screen"
    ).toBeTruthy()
    expect(panel!.x, "the panel starts at the left edge").toBeLessThan(80)
    expect(
      panel!.x + panel!.width,
      "the panel ends before the canvas starts"
    ).toBeLessThanOrEqual(frame!.x + 1)

    for (const name of ["Outline", "Block", "Page"]) {
      await expectVisible(panelTab(page, name), `the ${name} tab`)
    }
    // History is for Layouts and the Theme: Pages have Drafts instead.
    expect(await panelTab(page, "History").count()).toBe(0)
  })

  it("has a History tab in Layout mode", async () => {
    const layout = await defaultLayout(admin.context.request)
    await openEditor(page, editorUrl.layout(layout.id))
    for (const name of ["Outline", "Block", "History"]) {
      await expectVisible(panelTab(page, name), `the ${name} tab`)
    }
  })
})

describe("the canvas", () => {
  // A wide screen, so the Desktop width fits beside the panel.
  beforeAll(async () => {
    await page.setViewportSize({ width: 1680, height: 1000 })
  })
  afterAll(async () => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  it("is an iframe that renders the real Site route of the Page", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    const frame = await canvasFrame(page)
    expect(new URL(frame.url()).pathname).toBe(SHELL_PATH)
    expect(
      await canvasElement(page).getAttribute("title"),
      "the iframe has a title for screen readers"
    ).toBeTruthy()
  })

  it.each([
    ["Mobile", 320, 480, false],
    ["Tablet", 700, 1024, true],
    ["Desktop", 1024, 4000, true],
  ] as const)(
    "at %s width uses the Site's real breakpoints",
    async (width, min, max, tabletUp) => {
      await openEditor(page, editorUrl.page(shellPage.id))
      await choice(page, width).click()
      const frame = await canvasFrame(page)
      await expect
        .poll(() => frame.evaluate(() => window.innerWidth), {
          message: `the canvas's viewport at ${width}`,
          timeout: 5_000,
        })
        .toBeGreaterThanOrEqual(min)
      const inner = await frame.evaluate(() => window.innerWidth)
      expect(inner).toBeLessThanOrEqual(max)
      // Media queries see that viewport: the Site's own breakpoints apply.
      expect(
        await frame.evaluate(() => matchMedia("(min-width: 768px)").matches)
      ).toBe(tabletUp)
    }
  )
})

describe("the Ctrl-K Page picker", () => {
  it("is a command dialog that searches Pages by path", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    const dialog = await openPagePicker(page)
    await searchField(dialog).fill(OTHER_PATH)
    await expectVisible(
      dialog.getByRole("option", { name: new RegExp(OTHER_TITLE) }),
      "the Page found by its path"
    )
    expect(
      await dialog
        .getByRole("option", { name: new RegExp(SHELL_TITLE) })
        .count(),
      "Pages that don't match are left out"
    ).toBe(0)
    await page.keyboard.press("Escape")
  })

  it("searches by title, and opens the chosen Page in the Visual Editor", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    await goToPage(page, `Harbour View ${RUN}`, OTHER_TITLE)
    await page.waitForURL(`**/admin/pages/${otherPage.id}`)
    await expectVisible(
      topBar(page).getByText(OTHER_TITLE, { exact: true }),
      "the document name of the Page picked"
    )
    const frame = await canvasFrame(page)
    await expect
      .poll(() => new URL(frame.url()).pathname, { timeout: 15_000 })
      .toBe(OTHER_PATH)
  })

  it("opens from its button in the top bar too", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    await pagePickerButton(page).click()
    await expectVisible(pagePicker(page), "the Page picker")
    await page.keyboard.press("Escape")
  })
})

describe("accessibility (WCAG 2.2 AA, axe)", () => {
  it("the Visual Editor in Page mode", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    await expectNoAxeViolations(page, "Page mode")
  })

  it("the Visual Editor in Layout mode", async () => {
    const layout = await defaultLayout(admin.context.request)
    await openEditor(page, editorUrl.layout(layout.id))
    await expectNoAxeViolations(page, "Layout mode")
  })

  it("the Visual Editor in Theme mode", async () => {
    await openEditor(page, editorUrl.theme())
    await expectNoAxeViolations(page, "Theme mode")
  })

  it("the Ctrl-K Page picker", async () => {
    await openEditor(page, editorUrl.page(shellPage.id))
    await openPagePicker(page)
    await expectNoAxeViolations(page, "the Page picker", {
      includeCanvas: false,
    })
    await page.keyboard.press("Escape")
  })
})
