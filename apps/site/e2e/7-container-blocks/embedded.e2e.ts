import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  axeViolations,
  launchBrowser,
  openSession,
  visit,
} from "../theme/support/browser"
import {
  BACKGROUNDS,
  BACKGROUND_TOKEN,
  PAGE_BLOCKS,
  blockPath,
  horizontalOverflow,
  tokenColour,
} from "../4-blocks/support/catalogue"

/**
 * Container Blocks, Phase 2: a Block inside a Container is the same Block,
 * drawn without its own band, for the Container's surface.
 *
 * A Block's catalogue page with `?container=<background>` shows the Block's
 * sample in a one-column Container on that background. For every Page
 * Block: the page does not scroll sideways on a desktop or a phone, and the
 * Block's section starts where the Container's content does, so only the
 * Container pads. And on each of the four backgrounds the Container is
 * painted with that background's Theme token and axe finds nothing against
 * WCAG 2.2 AA, so the text, links and buttons the Block draws there keep
 * their contrast.
 */

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
})

afterAll(async () => {
  await browser?.close()
})

const PHONE = { width: 390, height: 844 }

/** The Container's marked wrapper and the Block's section in it, as boxes. */
function boxes(page: Page) {
  return page.evaluate(() => {
    const mark = document.querySelector("main [data-container]")
    const section = mark?.querySelector("section")
    if (!mark || !section) return null
    const band = mark.parentElement!.parentElement!
    const rect = (element: Element) => {
      const { left, top, width } = element.getBoundingClientRect()
      return {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(width),
      }
    }
    return {
      mark: rect(mark),
      section: rect(section),
      bandPadding: parseFloat(getComputedStyle(band).paddingTop),
      bandBackground: getComputedStyle(band).backgroundColor,
    }
  })
}

describe.each(PAGE_BLOCKS.map((block) => [block.name] as const))(
  "the %s Block inside a Container",
  (name) => {
    it("fits its cell on a desktop and on a phone, and only the Container pads", async () => {
      const { context, page } = await openSession(browser)
      try {
        const response = await visit(
          page,
          await blockPath(browser, name, {
            container: "default",
            fixtures: "avada",
          })
        )
        expect(response?.status()).toBe(200)
        for (const viewport of [undefined, PHONE]) {
          if (viewport) await page.setViewportSize(viewport)
          expect(await horizontalOverflow(page)).toBe(0)
          const found = await boxes(page)
          expect(found, "a section inside the Container").not.toBeNull()
          expect(found!.bandPadding).toBeGreaterThan(0)
          expect(found!.section).toEqual(found!.mark)
        }
      } finally {
        await context.close()
      }
    })

    it.each(BACKGROUNDS.map((background) => [background] as const))(
      "in a Container on the %s background, passes axe",
      async (background) => {
        const { context, page } = await openSession(browser)
        try {
          // Without fixtures, as e2e/4-blocks/backgrounds does: the Rental
          // grid's filter chips fail contrast on the Primary and Dark
          // backgrounds on the Page too, which is not the Container's doing.
          await visit(
            page,
            await blockPath(browser, name, { container: background })
          )
          expect((await boxes(page))?.bandBackground).toBe(
            await tokenColour(page, BACKGROUND_TOKEN[background])
          )
          expect(await axeViolations(page)).toEqual([])
        } finally {
          await context.close()
        }
      }
    )
  }
)
