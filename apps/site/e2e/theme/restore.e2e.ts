import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { HARBOUR, MEADOW, TERRACOTTA, type ThemeInputs } from "../../src/theme"
import { SAMPLE_PAGE_PATH } from "../../src/site/dev/samplePage"
import { compareImages } from "./images"
import {
  launchBrowser,
  openSession,
  saveScreenshot,
  screenshot,
  signIn,
  visit,
  type Session,
} from "./support/browser"
import { ORIGIN } from "./support/env"
import { openScratchSite, type ScratchSite } from "./support/site"

/**
 * Phase 2 acceptance: restoring a Theme version puts the Site back exactly
 * (apps/site ADR-0004). Theme A is saved and the Site is photographed; Theme B
 * is saved, and the Site really does change; then, in the Admin, A is restored
 * from the Theme history as the Staff User would, and the Site is
 * photographed again. The two photographs of A must be pixel-identical.
 *
 * Two views are photographed: the sample Page (as a visitor sees it) and the
 * test bench with its dialog open, which shows portalled content too.
 */

const A_NOTE = "Acceptance: theme A"
const B_NOTE = "Acceptance: theme B"

/** A view of the Site to photograph. */
const VIEWS = [
  { name: "page", path: SAMPLE_PAGE_PATH, open: false },
  { name: "dialog", path: "/dev/theme-sample", open: true },
] as const

let site: ScratchSite
let browser: Browser
let visitor: Session
let admin: Session

/** The Site as a visitor sees it now, one screenshot per view. */
async function photograph(page: Page): Promise<Record<string, Buffer>> {
  const shots: Record<string, Buffer> = {}
  for (const view of VIEWS) {
    await visit(page, view.path)
    if (view.open) {
      await page.getByRole("button", { name: "Open dialog" }).click()
      await page.locator('[data-slot="alert-dialog-content"]').waitFor()
    }
    shots[view.name] = await screenshot(page)
  }
  return shots
}

beforeAll(async () => {
  site = await openScratchSite()
  browser = await launchBrowser()
  visitor = await openSession(browser)
  admin = await openSession(browser)
  await site.publishSamplePage()
  await signIn(admin.page)
})

afterAll(async () => {
  await browser?.close()
  await site?.close()
})

describe("restoring a Theme version", () => {
  const shots: {
    a?: Record<string, Buffer>
    b?: Record<string, Buffer>
    restored?: Record<string, Buffer>
  } = {}
  let savedA: ThemeInputs

  it("saves Theme A and photographs the Site", async () => {
    savedA = { ...HARBOUR.inputs }
    await site.saveTheme(savedA, A_NOTE)
    shots.a = await photograph(visitor.page)
    for (const view of VIEWS)
      saveScreenshot(`${view.name}-a.png`, shots.a[view.name]!, "restore")
  })

  it("saves Theme B, and the Site changes", async () => {
    await site.saveTheme({ ...TERRACOTTA.inputs, motion: "none" }, B_NOTE)
    shots.b = await photograph(visitor.page)
    for (const view of VIEWS) {
      saveScreenshot(`${view.name}-b.png`, shots.b[view.name]!, "restore")
      const change = compareImages(shots.a![view.name]!, shots.b[view.name]!)
      // A different look, not a rounding error: a tenth of the pixels at least.
      expect(change.ratio, `${view.name} view changed`).toBeGreaterThan(0.1)
    }
  })

  it("restores Theme A from the history in the Admin", async () => {
    const before = (await site.payload.findGlobalVersions({ slug: "theme" }))
      .totalDocs
    const { page } = admin
    await page.goto(`${ORIGIN}/admin/theme`)

    const row = page.getByRole("listitem").filter({ hasText: A_NOTE })
    await row.getByRole("button", { name: /Restore the version saved/ }).click()
    await page.getByRole("button", { name: "Restore version" }).click()

    await expect
      .poll(async () => JSON.stringify((await site.liveTheme()).inputs), {
        timeout: 30_000,
      })
      .toBe(JSON.stringify(savedA))
    // Restoring saves a new version: the history only grows.
    const after = (await site.payload.findGlobalVersions({ slug: "theme" }))
      .totalDocs
    expect(after).toBe(before + 1)
  })

  it("puts the Site back exactly: the screenshots match pixel for pixel", async () => {
    shots.restored = await photograph(visitor.page)
    for (const view of VIEWS) {
      saveScreenshot(
        `${view.name}-a-restored.png`,
        shots.restored[view.name]!,
        "restore"
      )
      const result = compareImages(
        shots.a![view.name]!,
        shots.restored[view.name]!
      )
      expect(result.sameSize, `${view.name} view size`).toBe(true)
      expect(result.differentPixels, `${view.name} view pixels`).toBe(0)
    }
  })

  it("does the same when the restored version differs in every control", async () => {
    // A third, very different Theme, then back to Meadow's controls.
    await site.saveTheme(MEADOW.inputs, "Acceptance: theme C")
    const c = await photograph(visitor.page)
    await site.saveTheme(HARBOUR.inputs, "Acceptance: theme D")

    const { page } = admin
    await page.goto(`${ORIGIN}/admin/theme`)
    const row = page
      .getByRole("listitem")
      .filter({ hasText: "Acceptance: theme C" })
    await row.getByRole("button", { name: /Restore the version saved/ }).click()
    await page.getByRole("button", { name: "Restore version" }).click()
    await expect
      .poll(async () => (await site.liveTheme()).inputs.primary, {
        timeout: 30_000,
      })
      .toBe(MEADOW.inputs.primary)

    const restored = await photograph(visitor.page)
    for (const view of VIEWS) {
      const result = compareImages(c[view.name]!, restored[view.name]!)
      expect(result.differentPixels, `${view.name} view pixels`).toBe(0)
    }
  })
})
