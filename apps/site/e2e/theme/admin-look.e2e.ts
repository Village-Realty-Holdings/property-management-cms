/* eslint-disable turbo/no-undeclared-env-vars -- E2E_* switches of the acceptance tests, which are not turbo tasks */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
import { SCREENSHOT_DIR } from "./support/env"

/**
 * Phase 2 acceptance: the Admin still looks as it did (apps/site ADR-0004).
 * The Admin keeps its own neutral theme, because packages/ui components read
 * component tokens whose defaults reproduce the look they had when their
 * classes were hardcoded.
 *
 * The baseline is the Admin as photographed with packages/ui from
 * `checkpoint/1-foundation`, the last state before the components read
 * tokens (main's packages/ui predates the Admin altogether). Each screen is
 * compared with its baseline pixel for pixel. To make a new baseline, check
 * that packages/ui out, run with `E2E_UPDATE_ADMIN_BASELINE=1`, restore
 * packages/ui, and commit docs/screenshots/2-theme/admin-baseline.
 *
 * This file runs first (specs run in name order): the screens are the ones
 * that show no content, so they look the same on a Site nobody has edited yet.
 */

const BASELINE_DIR = path.join(SCREENSHOT_DIR, "admin-baseline")
const UPDATE = process.env.E2E_UPDATE_ADMIN_BASELINE === "1"

type Screen = {
  name: string
  path: string
  /** Signed in, or the public sign-in screen. */
  signedIn: boolean
  /** Extra steps before the photograph, e.g. opening a sheet. */
  prepare?: (page: Page) => Promise<void>
}

const SCREENS: Screen[] = [
  { name: "sign-in", path: "/admin/sign-in", signedIn: false },
  { name: "pages-empty", path: "/admin/pages", signedIn: true },
  { name: "media-empty", path: "/admin/media", signedIn: true },
  { name: "brand", path: "/admin/settings/brand", signedIn: true },
  { name: "seo", path: "/admin/settings/seo", signedIn: true },
  { name: "fonts", path: "/admin/settings/assets/fonts", signedIn: true },
  {
    name: "fonts-google-sheet",
    path: "/admin/settings/assets/fonts",
    signedIn: true,
    prepare: async (page) => {
      await page
        .getByRole("button", { name: "Add Google Font" })
        .first()
        .click()
      await page.getByRole("dialog").waitFor()
    },
  },
  // No "page-new": New Page opens the Visual Editor (spec, Pages list), which
  // replaced the screen this baseline photographed.
]

let browser: Browser
let anonymous: Session
let staff: Session

beforeAll(async () => {
  browser = await launchBrowser()
  anonymous = await openSession(browser)
  staff = await openSession(browser)
  await signIn(staff.page)
})

afterAll(async () => {
  await browser?.close()
})

describe.each(SCREENS.map((screen) => [screen.name, screen] as const))(
  "the Admin's %s screen",
  (name, screen) => {
    it(UPDATE ? "is written as the baseline" : "looks as it did", async () => {
      const { page } = screen.signedIn ? staff : anonymous
      await visit(page, screen.path)
      await screen.prepare?.(page)
      const image = await screenshot(page)
      saveScreenshot(`${name}.png`, image, "admin")

      const baseline = path.join(BASELINE_DIR, `${name}.png`)
      if (UPDATE) {
        mkdirSync(BASELINE_DIR, { recursive: true })
        writeFileSync(baseline, image)
        return
      }
      expect(existsSync(baseline), `baseline ${name}.png exists`).toBe(true)
      const result = compareImages(readFileSync(baseline), image)
      if (result.diff)
        saveScreenshot(`${name}-diff.png`, result.diff, "admin-diff")
      expect(result.sameSize, "same size as the baseline").toBe(true)
      expect(result.differentPixels, "pixels that differ").toBe(0)
    })
  }
)
