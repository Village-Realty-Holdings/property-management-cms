import type { Browser, Locator, Page } from "playwright-core"
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
  RUN,
  anyVisibleInEditor,
  barButton,
  canvas,
  canvasFrame,
  canvasToken,
  choice,
  computedColour,
  createPage,
  deleteCreatedSince,
  discard,
  editingInPlace,
  expectNoAxeViolations,
  expectVisible,
  goToPage,
  modeChip,
  panelTab,
  recordRoundTrips,
  runPath,
  toast,
  type Doc,
} from "./support/editor"

/**
 * Phase 5 acceptance: "Theme mode: preview across Pages, then save or
 * discard" (ADR-0004), with the spec's Theme mode: opened from Settings ›
 * Theme; the left panel holds the Theme controls, the contrast warnings with
 * one-click fixes, and History; Block editing is off; and the unsaved Theme
 * follows the Staff User across Pages through Ctrl-K until it is saved or
 * discarded. Visitors see nothing until Save, and then every Page changes.
 */

const STARTED = new Date().toISOString()
const P1 = { title: `Theme preview one ${RUN}`, path: runPath("theme-one") }
const P2 = { title: `Theme preview two ${RUN}`, path: runPath("theme-two") }
const PREVIEW = "#8a1f5c"
const SAVED = "#1f5c8a"
const SAVED_LATER = "#5c8a1f"

/** The Theme control groups, by the names the spec gives them. */
const GROUPS = [
  "Presets",
  "Colours",
  "Fonts",
  "Type",
  "Corners",
  "Spacing",
  "Shadows",
  "Buttons",
  "Motion",
]

let browser: Browser
let admin: Session
let visitor: Session
let page: Page
let live: string
const docs: { p1?: Doc; p2?: Doc } = {}

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  visitor = await openSession(browser)
  page = admin.page
  await signIn(page)
  docs.p1 = await createPage(admin.context.request, { ...P1, publish: true })
  docs.p2 = await createPage(admin.context.request, { ...P2, publish: true })
  live = await sitePrimary(P1.path)
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/** The Site's primary colour at `path`, as the visitor's browser computes it. */
async function sitePrimary(path: string): Promise<string> {
  await visit(visitor.page, path)
  const { "--primary": value } = await rootTokens(visitor.page, ["--primary"])
  return computedColour(visitor.page, value ?? "")
}

/** The canvas's primary colour, computed. */
async function canvasPrimary(): Promise<string> {
  const frame = await canvasFrame(page)
  return computedColour(frame, await canvasToken(page, "--primary"))
}

/** `hex` as the canvas computes it. */
async function inCanvas(hex: string): Promise<string> {
  return computedColour(await canvasFrame(page), hex)
}

/** A colour control by its label ("Primary", "Text"…): its hex text field. */
const colourField = (name: string): Locator =>
  page.getByRole("textbox", { name: new RegExp(`^${name}\\b`) }).first()

async function setColour(name: string, hex: string) {
  await colourField(name).fill(hex)
  await colourField(name).press("Tab")
}

/** A Theme control group in the left panel: a heading, a toggle or a tab. */
const group = (name: string) =>
  page
    .getByRole("heading", { name, exact: true })
    .or(page.getByRole("button", { name, exact: true }))
    .or(page.getByRole("tab", { name, exact: true }))
    .first()

/** The contrast warnings' one-click fixes. */
const fixes = () => page.getByRole("button", { name: /^(Fix|Use|Apply)\b/i })

describe("Theme mode", () => {
  it("opens from Settings › Theme", async () => {
    await page.goto(`${ORIGIN}/admin`)
    await page.getByRole("link", { name: "Theme", exact: true }).click()
    await page.waitForURL("**/admin/theme")
    await canvasFrame(page)
    await expectVisible(modeChip(page, "Theme"), "the Theme mode chip")
    for (const name of GROUPS)
      await expectVisible(group(name), `the ${name} controls`)
    await expectVisible(
      panelTab(page, "History")
        .or(page.getByRole("heading", { name: "History", exact: true }))
        .first(),
      "History"
    )
  })

  it("previews the Theme on a Page picked with Ctrl-K, with Block editing off", async () => {
    await goToPage(page, P1.path, P1.title)
    await expect
      .poll(async () => new URL((await canvasFrame(page)).url()).pathname, {
        timeout: 15_000,
      })
      .toBe(P1.path)
    await expectVisible(modeChip(page, "Theme"), "still in Theme mode")

    await canvas(page)
      .locator("body")
      .click({ position: { x: 200, y: 200 } })
    expect(
      await anyVisibleInEditor(page, (root) =>
        root.getByRole("button", { name: "Duplicate", exact: true })
      ),
      "no Block can be selected"
    ).toBe(false)
    expect(await editingInPlace(page), "no text is edited in place").toBe(false)
    const blockTab = panelTab(page, "Block")
    if (await blockTab.count())
      expect(await blockTab.isDisabled(), "the Block tab is off").toBe(true)
  })

  it("updates the canvas at once, with no network round trip", async () => {
    const recording = recordRoundTrips(page)
    // Two presets in turn: the second always differs from the first,
    // whichever the Site had.
    await choice(page, "Terracotta").click()
    await page.waitForTimeout(300)
    const terracotta = await canvasPrimary()
    await choice(page, "Meadow").click()
    await expect
      .poll(canvasPrimary, {
        message: "a preset changes the canvas",
        timeout: 2_000,
        interval: 50,
      })
      .not.toBe(terracotta)
    await setColour("Primary", PREVIEW)
    const want = await inCanvas(PREVIEW)
    await expect
      .poll(canvasPrimary, {
        message: "the Primary colour changes the canvas",
        timeout: 2_000,
        interval: 50,
      })
      .toBe(want)
    expect(recording.stop(), "round trips made for the preview").toEqual([])
  })

  it("follows the Staff User to another Page through Ctrl-K, unsaved", async () => {
    await goToPage(page, P2.title, P2.title)
    await expect
      .poll(async () => new URL((await canvasFrame(page)).url()).pathname, {
        timeout: 15_000,
      })
      .toBe(P2.path)
    await expectVisible(modeChip(page, "Theme"), "still in Theme mode")
    expect(await canvasPrimary(), "the unsaved Theme on the next Page").toBe(
      await inCanvas(PREVIEW)
    )
    expect(await sitePrimary(P2.path), "visitors see the live Theme").toBe(live)
  })

  it("warns about contrast, fixes it in one click, and never blocks saving", async () => {
    await setColour("Text", "#d0d0d0")
    await expect
      .poll(() => fixes().count(), {
        message: "a contrast warning with a fix",
        timeout: 5_000,
      })
      .toBeGreaterThan(0)
    expect(
      await barButton(page, /^Save\b/).isEnabled(),
      "a warning never blocks saving"
    ).toBe(true)
    await expectNoAxeViolations(page, "Theme mode with contrast warnings", {
      includeCanvas: false,
    })
    const count = await fixes().count()
    await fixes().first().click()
    await expect
      .poll(() => fixes().count(), { message: "the fix clears its warning" })
      .toBeLessThan(count)
  })

  it("Discard puts the canvas back to the live Theme; the Site never changed", async () => {
    await discard(page)
    await expect
      .poll(canvasPrimary, { timeout: 5_000 })
      .toBe(await inCanvas(live))
    expect(await sitePrimary(P1.path)).toBe(live)
    expect(await sitePrimary(P2.path)).toBe(live)
  })

  it("Save puts the Theme live on every Page", async () => {
    await setColour("Primary", SAVED)
    await barButton(page, /^Save\b/).click()
    await expectVisible(toast(page, /saved/i), "a toast confirms the save")
    const want = await computedColour(visitor.page, SAVED)
    await expect
      .poll(() => sitePrimary(P1.path), {
        message: "Page one",
        timeout: 15_000,
      })
      .toBe(want)
    expect(await sitePrimary(P2.path), "Page two").toBe(want)
  })

  it("keeps each save in History, and Restore puts an earlier one live", async () => {
    await setColour("Primary", SAVED_LATER)
    await barButton(page, /^Save\b/).click()
    await expect
      .poll(() => sitePrimary(P1.path), { timeout: 15_000 })
      .toBe(await computedColour(visitor.page, SAVED_LATER))

    if (await panelTab(page, "History").count())
      await panelTab(page, "History").click()
    const versions = page
      .getByRole("list", { name: /versions/i })
      .getByRole("listitem")
    await expect.poll(() => versions.count()).toBeGreaterThanOrEqual(2)
    await versions
      .nth(1)
      .getByRole("button", { name: /Restore/ })
      .click()
    const confirm = page.getByRole("alertdialog")
    await expectVisible(confirm, "Restore asks first")
    await confirm.getByRole("button", { name: /Restore/ }).click()

    const want = await computedColour(visitor.page, SAVED)
    await expect
      .poll(() => sitePrimary(P1.path), { timeout: 15_000 })
      .toBe(want)
    expect(await sitePrimary(P2.path)).toBe(want)
  })
})
