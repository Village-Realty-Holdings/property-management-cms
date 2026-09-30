import type { Browser } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  AVADA,
  CLASSIC,
  HARBOUR,
  MEADOW,
  TERRACOTTA,
  TEXT_PAIRS,
  WARREN_BEACH,
  presetInputs,
  textPairFailures,
  type ThemePreset,
} from "../../src/theme"
import { SAMPLE_PAGE_PATH } from "../../src/site/dev/samplePage"
import { foreignRequests } from "./network"
import {
  axeViolations,
  fontFaces,
  launchBrowser,
  openSession,
  primaryFamily,
  rootTokens,
  saveScreenshot,
  screenshot,
  visit,
} from "./support/browser"
import { ORIGIN } from "./support/env"
import { openScratchSite, type ScratchSite } from "./support/site"

/**
 * Phase 2 acceptance: each of the four general presets and the two brand
 * presets renders the sample Page correctly. "Correctly" means, for a
 * visitor's browser: the Page loads without errors, its fonts load from the
 * Site's own origin (no request leaves it), every text-bearing colour passes
 * AA (the contrast module on the live tokens, and axe on the rendered Page),
 * and a screenshot is taken for the Phase 2 review set.
 *
 * A brand preset names the fonts the real brand uses. The Site adds them from
 * Google Fonts first (a server-side download, as a Staff User would), so the
 * brand renders in its own typeface, self-hosted; the general presets use the
 * built-in fonts.
 */

/** Google Fonts a brand preset needs on the Site: [family, kind, weights]. */
const BRAND_FONTS = [
  ["Source Sans 3", "sans", [400, 500, 700]],
  ["Montserrat", "sans", [400, 500, 700]],
] as const

const PRESETS: readonly ThemePreset[] = [
  HARBOUR,
  TERRACOTTA,
  CLASSIC,
  MEADOW,
  WARREN_BEACH,
  AVADA,
]

let site: ScratchSite
let browser: Browser

beforeAll(async () => {
  site = await openScratchSite()
  browser = await launchBrowser()
  for (const [family, kind, weights] of BRAND_FONTS) {
    await site.ensureGoogleFont(family, kind, weights)
  }
  await site.publishSamplePage()
})

afterAll(async () => {
  await browser?.close()
  await site?.close()
})

describe.each(PRESETS.map((preset) => [preset.name, preset] as const))(
  "the %s preset",
  (_name, preset) => {
    it("renders the sample Page without errors, from its own origin", async () => {
      const { fonts } = await site.liveTheme()
      await site.saveTheme(presetInputs(preset, fonts), `Preset ${preset.name}`)
      const { context, page, log } = await openSession(browser)
      try {
        const response = await visit(page, SAMPLE_PAGE_PATH)

        expect(response?.status()).toBe(200)
        expect(log.pageErrors).toEqual([])
        // The Site has no favicon until SEO sets one: not a Theme matter.
        expect(
          log.badResponses.filter((r) => !r.endsWith("/favicon.ico"))
        ).toEqual([])
        // A failed load is already covered by badResponses above.
        expect(
          log.consoleErrors.filter(
            (e) => !e.startsWith("Failed to load resource")
          )
        ).toEqual([])
        expect(log.failedRequests).toEqual([])
        // Self-hosted fonts: nothing the page asked for left the Site.
        expect(foreignRequests(log.requests, ORIGIN)).toEqual([])
        expect(await page.locator("h1").first().textContent()).toBe(
          "Welcome to the coast"
        )
      } finally {
        await context.close()
      }
    })

    it("loads its heading and body fonts", async () => {
      const { context, page, log } = await openSession(browser)
      try {
        await visit(page, SAMPLE_PAGE_PATH)
        const faces = await fontFaces(page)
        const loaded = new Set(
          faces.filter((face) => face.status === "loaded").map((f) => f.family)
        )

        const heading = await primaryFamily(page.locator("h1").first())
        const body = await primaryFamily(page.locator("main p").first())
        expect(loaded, `heading font ${heading}`).toContain(heading)
        expect(loaded, `body font ${body}`).toContain(body)

        // A brand's own typeface is a stored Font: its files come from the
        // Site, not from Google.
        if (preset.preferredFonts) {
          const fontFiles = log.requests.filter((url) =>
            /\.woff2(\?|$)/.test(url)
          )
          expect(fontFiles.length).toBeGreaterThan(0)
          expect(fontFiles.every((url) => url.startsWith(ORIGIN))).toBe(true)
          expect(heading.toLowerCase()).toBe(
            preset.preferredFonts.heading?.toLowerCase()
          )
        }
      } finally {
        await context.close()
      }
    })

    it("passes AA for every text-bearing token, and axe finds nothing on the Page", async () => {
      const { context, page } = await openSession(browser)
      try {
        await visit(page, SAMPLE_PAGE_PATH)
        const names = [...new Set(TEXT_PAIRS.flat())]
        const live = await rootTokens(page, names)
        expect(textPairFailures(live)).toEqual([])
        expect(await axeViolations(page)).toEqual([])
      } finally {
        await context.close()
      }
    })

    it("is captured for the review set", async () => {
      const { context, page } = await openSession(browser)
      try {
        await visit(page, SAMPLE_PAGE_PATH)
        const file = saveScreenshot(
          `${preset.id}.png`,
          await screenshot(page),
          "presets"
        )
        expect(file).toContain(`${preset.id}.png`)
      } finally {
        await context.close()
      }
    })
  }
)
