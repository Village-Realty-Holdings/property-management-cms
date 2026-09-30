import type { Browser, Locator, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { SAMPLE_PAGE_PATH } from "../../src/site/dev/samplePage"
import { CLASSIC, HARBOUR, MEADOW, TERRACOTTA } from "../../src/theme"
import { focusRingProblems } from "./focusRing"
import {
  launchBrowser,
  openSession,
  visit,
  type Session,
} from "./support/browser"
import { openScratchSite, type ScratchSite } from "./support/site"

/**
 * Phase 2 acceptance: a focused button on a coloured panel shows a ring that
 * can be seen (WCAG 2.4.7, 1.4.11). The Theme's --ring is the primary colour,
 * which is also the Hero's and the Primary Call to action's panel, so the ring
 * there must not be the default one. The check reads the box-shadow the
 * browser computed with keyboard focus on the button, and compares the ring
 * with the panel's background: opaque, 3:1, and set off by a gap in the
 * panel's colour.
 */

const PRESETS = [HARBOUR, TERRACOTTA, CLASSIC, MEADOW]

let site: ScratchSite
let browser: Browser
let session: Session
let page: Page

beforeAll(async () => {
  site = await openScratchSite()
  browser = await launchBrowser()
  session = await openSession(browser)
  page = session.page
  await site.publishSamplePage()
})

afterAll(async () => {
  await browser?.close()
  await site?.close()
})

/** The background of the nearest ancestor that paints one. */
const panelOf = (button: Locator) =>
  button.evaluate((el) => {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const colour = getComputedStyle(node).backgroundColor
      if (colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent")
        return colour
    }
    return "rgb(255, 255, 255)"
  })

const shadowOf = (button: Locator) =>
  button.evaluate((el) => getComputedStyle(el).boxShadow)

describe.each(PRESETS.map((preset) => [preset.name, preset] as const))(
  "the %s preset",
  (_name, preset) => {
    it.each([
      ["the Hero", "Browse homes"],
      ["the Primary Call to action", "Get in touch"],
    ])("shows a focus ring on the button in %s", async (_where, label) => {
      await site.saveTheme(preset.inputs, `Preset ${preset.name}`)
      await visit(page, SAMPLE_PAGE_PATH)
      const button = page.getByRole("link", { name: label })
      const panel = await panelOf(button)
      const resting = await shadowOf(button)

      // A key press first, so the browser treats the focus as keyboard focus.
      await page.keyboard.press("Shift")
      await button.focus()
      // The ring fades in over --duration: wait for it to settle.
      let focused = resting
      await expect
        .poll(async () => {
          const now = await shadowOf(button)
          const settled = now === focused
          focused = now
          return settled && now !== resting
        })
        .toBe(true)

      expect(focusRingProblems({ resting, focused, panel })).toEqual([])
    })
  }
)
