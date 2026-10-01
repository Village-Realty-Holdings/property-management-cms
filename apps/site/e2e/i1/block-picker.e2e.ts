import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import {
  RUN,
  addBlockButtons,
  blockPicker,
  createPage,
  deleteCreatedSince,
  editorUrl,
  expectHidden,
  expectVisible,
  openEditor,
  openTab,
  outlineItems,
  outlineTree,
  pickerOption,
  runPath,
  searchField,
  type Doc,
} from "../5-visual-editor/support/editor"

/**
 * Iteration 1, user note 6: "The 'Add a Block' dialog is too small. The picker
 * should be larger, with bigger thumbnails and grouping, so a Block can be
 * recognised and chosen at a glance."
 *
 * At a desktop width the picker takes most of the viewport, shows a heading
 * per group and a grid of large thumbnails, and a search followed by Enter
 * inserts the Block. On a phone it is a full-screen sheet.
 */

const STARTED = new Date().toISOString()

let browser: Browser
let admin: Session
let page: Page
let doc: Doc

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  doc = await createPage(admin.context.request, {
    title: `Block picker ${RUN}`,
    path: runPath("picker"),
    publish: false,
  })
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

const openPicker = async () => {
  await openTab(page, "Outline")
  await addBlockButtons(outlineTree(page), "Page").first().click()
  const picker = blockPicker(page)
  await expectVisible(picker, "the Block picker")
  return picker
}

describe("the Block picker at 1440 px", () => {
  it("is large, grouped, and shows big thumbnails", async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openEditor(page, editorUrl.page(doc.id))
    const picker = await openPicker()

    const box = await picker.boundingBox()
    expect(
      box!.width,
      "the picker is at least 900 px wide"
    ).toBeGreaterThanOrEqual(900)
    expect(
      box!.height,
      "the picker takes most of the height"
    ).toBeGreaterThanOrEqual(600)

    const headings = picker.locator("[cmdk-group-heading]")
    expect(await headings.count(), "a heading per group").toBeGreaterThan(1)
    await expectVisible(
      headings.filter({ hasText: "Heroes" }).first(),
      "the Heroes group heading"
    )

    for (const name of ["Hero", "Call to action", "FAQ"]) {
      const option = pickerOption(picker, name)
      await option.scrollIntoViewIfNeeded()
      const size = await option.locator("img").boundingBox()
      expect(
        size!.width,
        `the ${name} thumbnail is at least 200 px wide`
      ).toBeGreaterThanOrEqual(200)
      // A name and a one-line description under the thumbnail.
      expect((await option.textContent())!.length).toBeGreaterThan(name.length)
    }

    // Several cards sit side by side.
    await picker.getByRole("option").first().scrollIntoViewIfNeeded()
    const first = await picker.getByRole("option").nth(0).boundingBox()
    const second = await picker.getByRole("option").nth(1).boundingBox()
    expect(second!.y, "the grid has more than one column").toBe(first!.y)
    await page.keyboard.press("Escape")
    await expectHidden(picker, "Esc closes the picker")
  })

  it("moves over the grid with the arrow keys", async () => {
    const picker = await openPicker()
    const selected = picker.locator('[role="option"][aria-selected="true"]')
    const first = await selected.boundingBox()
    await page.keyboard.press("ArrowRight")
    const right = await selected.boundingBox()
    expect(right!.x, "ArrowRight moves along the row").toBeGreaterThan(first!.x)
    expect(right!.y).toBe(first!.y)
    await page.keyboard.press("ArrowDown")
    const down = await selected.boundingBox()
    expect(down!.y, "ArrowDown moves to a lower row").toBeGreaterThan(right!.y)
    await page.keyboard.press("Escape")
    await expectHidden(picker, "Esc closes the picker")
  })

  it("inserts the Block that a search and Enter choose", async () => {
    const picker = await openPicker()
    await searchField(picker).fill("call to")
    await expectHidden(pickerOption(picker, "Hero"), "Hero does not match")
    await page.keyboard.press("Enter")
    await expectHidden(picker, "the picker closes once a Block is chosen")
    await expect
      .poll(() => outlineItems(page, "Call to action").count())
      .toBe(1)
  })
})

describe("the Block picker at phone width", () => {
  it("is a full-screen sheet", async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openEditor(page, editorUrl.page(doc.id))
    await openTab(page, "Outline")
    await addBlockButtons(outlineTree(page), "Page").first().click()
    const picker = blockPicker(page)
    await expectVisible(picker, "the Block picker")
    const box = await picker.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(388)
    expect(box!.height).toBeGreaterThanOrEqual(840)
  })
})
