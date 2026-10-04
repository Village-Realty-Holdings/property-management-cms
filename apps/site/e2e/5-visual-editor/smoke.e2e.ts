import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  rootTokens,
  signIn,
  visit,
  type Session,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import {
  EDITOR_ROUTE,
  RUN,
  addBlock,
  addBlockButtons,
  barButton,
  canvas,
  canvasFrame,
  computedColour,
  control,
  deleteCreatedSince,
  discard,
  expectVisible,
  firstTextField,
  goToPage,
  modeChip,
  openTab,
  outlineItems,
  outlineTree,
  pageAt,
  runPath,
  toast,
  topBar,
  unsavedDialog,
} from "./support/editor"

/**
 * Phase 5 acceptance: "The e2e smoke test covers this whole flow for one
 * Site." One User, start to finish, only through the Admin: New Page
 * from the Dashboard opens the Visual Editor; Blocks are added and edited;
 * the Page is published and the Site matches; a Layout made from it is
 * edited and saved, and the Site's header changes; the Theme is previewed
 * across Pages and saved, and the Site changes; the unsaved-changes guard
 * stops a careless exit; and History puts the Layout and the Theme back.
 */

const STARTED = new Date().toISOString()
const TITLE = `Smoke ${RUN}`
const PATH = runPath("smoke")
const HEADING = `Smoke test harbour ${RUN}`
const CTA = `Smoke call ${RUN}`
const LAYOUT_NAME = `Smoke Layout ${RUN}`
const STRIP = `Smoke strip ${RUN}`
const PRIMARY = "#2d5c1f"
const PRIMARY_LATER = "#5c1f2d"

let browser: Browser
let admin: Session
let visitor: Session
let page: Page
let livePrimary: string

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  visitor = await openSession(browser)
  page = admin.page
  await signIn(page)
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

async function siteText(selector: string): Promise<string> {
  const response = await visit(visitor.page, PATH)
  expect(response?.status(), `the Site answers at ${PATH}`).toBe(200)
  return (await visitor.page.locator(selector).first().textContent()) ?? ""
}

async function sitePrimary(): Promise<string> {
  await visit(visitor.page, PATH)
  const { "--primary": value } = await rootTokens(visitor.page, ["--primary"])
  return computedColour(visitor.page, value ?? "")
}

describe("the Visual Editor, end to end on one Site", () => {
  it("starts a New Page from the Dashboard, in the Visual Editor", async () => {
    await page.goto(`${ORIGIN}/admin`)
    await control(page, "New Page").click()
    await page.waitForURL((url) => EDITOR_ROUTE.page.test(url.pathname))
    await canvasFrame(page)
    await expectVisible(modeChip(page, "Page"), "Page mode")

    const pageTab = await openTab(page, "Page")
    await pageTab.getByLabel("Title", { exact: true }).fill(TITLE)
    await pageTab.getByLabel("Path", { exact: true }).fill(PATH)
  })

  it("adds a Hero and a Call to action, and edits them", async () => {
    await openTab(page, "Outline")
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Page").first(),
      "Hero"
    )
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Page").last(),
      "Call to action"
    )
    await outlineItems(page, "Hero").first().click()
    await (await openTab(page, "Block"))
      .getByLabel("Heading", { exact: true })
      .fill(HEADING)
    // Selecting the Hero opened the Block tab: back to the Outline for the next.
    await openTab(page, "Outline")
    await outlineItems(page, "Call to action").first().click()
    await (await openTab(page, "Block"))
      .getByLabel("Heading", { exact: true })
      .fill(CTA)
    await expectVisible(
      canvas(page).getByRole("heading", { name: HEADING }),
      "the Hero in the canvas"
    )
  })

  it("publishes, and the Site matches", async () => {
    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "the Published chip"
    )
    const text = await siteText("main")
    expect(text.indexOf(HEADING)).toBeGreaterThanOrEqual(0)
    expect(text.indexOf(CTA)).toBeGreaterThan(text.indexOf(HEADING))
    expect(await pageAt(admin.context.request, PATH)).toBeDefined()
  })

  it("guards a careless exit: Back with unsaved changes asks first", async () => {
    await outlineItems(page, "Hero").first().click()
    await (await openTab(page, "Block"))
      .getByLabel("Heading", { exact: true })
      .fill(`${HEADING} (unsaved)`)
    await control(topBar(page), /^Back\b/).click()
    const dialog = unsavedDialog(page)
    await expectVisible(dialog, "the unsaved-changes dialog")
    await dialog.getByRole("button", { name: "Stay", exact: true }).click()
    await discard(page)
    await expectVisible(
      canvas(page).getByRole("heading", { name: HEADING, exact: true }),
      "the published heading is back"
    )
  })

  it("makes a new Layout from the Page, edits its Header, and the Site's header changes on save", async () => {
    const pageTab = await openTab(page, "Page")
    await control(pageTab, "Make a new Layout from this one").click()
    const ask = page
      .getByRole("dialog")
      .or(page.getByRole("alertdialog"))
      .first()
    await ask.getByLabel(/name/i).fill(LAYOUT_NAME)
    await ask
      .getByRole("button", { name: /make|create|duplicate|copy/i })
      .click()
    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "published with its own Layout"
    )

    await control(page, "Edit Layout").click()
    await page.waitForURL((url) => EDITOR_ROUTE.layout.test(url.pathname))
    await expectVisible(
      topBar(page).getByText(/Used by 1 Page\b/),
      "Used by 1 Page"
    )
    await openTab(page, "Outline")
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Header").first(),
      "Utility strip"
    )
    await firstTextField(await openTab(page, "Block")).fill(STRIP)
    await barButton(page, /^Save\b/).click()
    await expectVisible(toast(page, /saved/i), "the save toast")
    expect(await siteText("header")).toContain(STRIP)
  })

  it("previews a Theme across Pages, saves it, and the Site changes", async () => {
    livePrimary = await sitePrimary()
    await page.goto(`${ORIGIN}/admin/theme`)
    await canvasFrame(page)
    await expectVisible(modeChip(page, "Theme"), "Theme mode")
    const primary = page.getByRole("textbox", { name: /^Primary\b/ }).first()
    await primary.fill(PRIMARY)
    await primary.press("Tab")
    await goToPage(page, PATH, TITLE)
    await expect
      .poll(async () => new URL((await canvasFrame(page)).url()).pathname, {
        timeout: 15_000,
      })
      .toBe(PATH)
    expect(await sitePrimary(), "nothing is live before Save").toBe(livePrimary)

    await barButton(page, /^Save\b/).click()
    await expectVisible(toast(page, /saved/i), "the save toast")
    await expect
      .poll(sitePrimary, { timeout: 15_000 })
      .toBe(await computedColour(visitor.page, PRIMARY))
  })

  it("saves the Theme again, and History puts the earlier save back", async () => {
    const primary = page.getByRole("textbox", { name: /^Primary\b/ }).first()
    await primary.fill(PRIMARY_LATER)
    await primary.press("Tab")
    await barButton(page, /^Save\b/).click()
    await expect
      .poll(sitePrimary, { timeout: 15_000 })
      .toBe(await computedColour(visitor.page, PRIMARY_LATER))

    if (await page.getByRole("tab", { name: "History", exact: true }).count())
      await page.getByRole("tab", { name: "History", exact: true }).click()
    const versions = page
      .getByRole("list", { name: /versions/i })
      .getByRole("listitem")
    await versions
      .nth(1)
      .getByRole("button", { name: /Restore/ })
      .click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /Restore/ })
      .click()
    await expect
      .poll(sitePrimary, { timeout: 15_000 })
      .toBe(await computedColour(visitor.page, PRIMARY))
  })

  it("puts the Layout back from History", async () => {
    const found = await pageAt(admin.context.request, PATH)
    await page.goto(`${ORIGIN}/admin/pages/${found!.id}`)
    await canvasFrame(page)
    await control(page, "Edit Layout").click()
    await page.waitForURL((url) => EDITOR_ROUTE.layout.test(url.pathname))
    const history = await openTab(page, "History")
    await history
      .getByRole("listitem")
      .nth(1)
      .getByRole("button", { name: /Restore/ })
      .click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /Restore/ })
      .click()
    await expect
      .poll(() => siteText("header"), { timeout: 15_000 })
      .not.toContain(STRIP)
  })
})
