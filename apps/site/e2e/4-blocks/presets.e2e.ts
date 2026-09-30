import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { Browser } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  CLASSIC,
  HARBOUR,
  TERRACOTTA,
  presetInputs,
  type ThemePreset,
} from "../../src/theme"
import { expectedRootTokens, headingExpectation } from "../theme/expectations"
import { compareImages } from "../theme/images"
import {
  axeViolations,
  launchBrowser,
  openSession,
  styleMismatches,
  visit,
} from "../theme/support/browser"
import { openScratchSite, type ScratchSite } from "../theme/support/site"
import {
  PAGE_BLOCKS,
  blockFileId,
  blockPath,
  blockRegion,
} from "./support/catalogue"

/**
 * Phase 4 acceptance: every Block renders from Theme tokens and passes AA,
 * and is captured under three presets for the PR.
 *
 * The Theme is saved as each of three presets that differ in every way a
 * Block can show (Classic: navy, serif headings, soft; Harbour: teal, square,
 * UPPERCASE buttons, cool; Terracotta: orange, warm, lifted shadows). Under
 * each, every Block's catalogue page must pass axe (WCAG 2.2 AA), and the
 * Block's own heading must be set in the Theme's display face (font,
 * weight, case and tracking from `--font-display` and `--display-*`). The
 * Block is screenshotted to docs/screenshots/4-blocks/<preset>/<block>.png,
 * the set the spec asks to attach to the PR. Finally, each Block must look
 * different under Classic and Harbour: a Block that ignores the Theme would
 * not change.
 */

const PRESETS: readonly ThemePreset[] = [CLASSIC, HARBOUR, TERRACOTTA]

const SCREENSHOT_DIR = fileURLToPath(
  new URL("../../docs/screenshots/4-blocks/", import.meta.url)
)

/** Each Block's screenshot under each preset: shots[preset id][Block name]. */
const shots: Record<string, Record<string, Buffer>> = {}

let site: ScratchSite
let browser: Browser

beforeAll(async () => {
  site = await openScratchSite()
  browser = await launchBrowser()
})

afterAll(async () => {
  // Leave the Site on the preset a new Theme starts from.
  await site?.saveTheme(CLASSIC.inputs, "Phase 4 acceptance: back to Classic")
  await browser?.close()
  await site?.close()
})

describe.each(PRESETS.map((preset) => [preset.name, preset] as const))(
  "under the %s preset",
  (_name, preset) => {
    beforeAll(async () => {
      const { fonts } = await site.liveTheme()
      await site.saveTheme(
        presetInputs(preset, fonts),
        `Phase 4 acceptance: ${preset.name}`
      )
      shots[preset.id] = {}
    })

    it.each(PAGE_BLOCKS.map((block) => [block.name] as const))(
      "the %s Block passes axe, sets its heading from the display tokens, and is captured",
      async (name) => {
        const expected = expectedRootTokens(await site.liveTheme())
        const { context, page } = await openSession(browser)
        try {
          await visit(page, await blockPath(browser, name))
          const region = blockRegion(page)

          expect(await axeViolations(page)).toEqual([])

          const labelledBy = await region.getAttribute("aria-labelledby")
          const label = labelledBy
            ? page.locator(`[id="${labelledBy.split(" ")[0]}"]`)
            : undefined
          const isHeading =
            label && (await label.evaluate((el) => /^H[1-6]$/.test(el.tagName)))
          if (label && isHeading) {
            expect(
              await styleMismatches(label, {
                ...headingExpectation(expected),
                "font-family": "var(--font-display)",
              })
            ).toEqual([])
          }

          const image = await region.screenshot({
            animations: "disabled",
            caret: "hide",
          })
          const folder = path.join(SCREENSHOT_DIR, preset.id)
          mkdirSync(folder, { recursive: true })
          writeFileSync(path.join(folder, `${blockFileId(name)}.png`), image)
          shots[preset.id]![name] = image
        } finally {
          await context.close()
        }
      }
    )
  }
)

describe("the Theme reaches every Block", () => {
  it.each(PAGE_BLOCKS.map((block) => [block.name] as const))(
    "the %s Block looks different under Classic and under Harbour",
    (name) => {
      const classic = shots[CLASSIC.id]?.[name]
      const harbour = shots[HARBOUR.id]?.[name]
      expect(classic, "captured under Classic").toBeDefined()
      expect(harbour, "captured under Harbour").toBeDefined()
      const comparison = compareImages(classic!, harbour!)
      expect(
        !comparison.sameSize || comparison.ratio > 0.01,
        `${name}: ${comparison.differentPixels} pixels differ`
      ).toBe(true)
    }
  )
})
