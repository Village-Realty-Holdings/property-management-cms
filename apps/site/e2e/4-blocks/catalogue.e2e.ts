import type { Browser } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { foreignRequests } from "../theme/network"
import {
  axeViolations,
  launchBrowser,
  openSession,
  visit,
  type PageLog,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import {
  CATALOGUE_PATH,
  PAGE_BLOCKS,
  blockPath,
  blockRegion,
  brokenImages,
  catalogueLinks,
  horizontalOverflow,
} from "./support/catalogue"

/**
 * Phase 4 acceptance: every Block renders from sample data, and each has a
 * thumbnail for the Block picker.
 *
 * Through the Block catalogue (`/dev/blocks`, see ./support/catalogue.ts):
 * the catalogue lists all twenty Page Blocks by the names the spec uses,
 * each with a thumbnail that loads; each Block's page renders the Block from
 * its sample data with no error, nothing fetched from another origin (fonts,
 * photos, icons, maps and logos are the Site's own), a visible accessible
 * region with real content, every image loaded, nothing axe reports against
 * WCAG 2.2 AA, and no sideways scrolling at 320 CSS pixels (WCAG 1.4.10).
 */

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
})

afterAll(async () => {
  await browser?.close()
})

/** Problems a clean page load must not have, whatever the Block. */
function loadProblems(log: PageLog) {
  return {
    pageErrors: log.pageErrors,
    // The Site has no favicon until SEO sets one: not a Block matter.
    badResponses: log.badResponses.filter((r) => !r.endsWith("/favicon.ico")),
    // A failed load is already reported as a bad response.
    consoleErrors: log.consoleErrors.filter(
      (e) => !e.startsWith("Failed to load resource")
    ),
    failedRequests: log.failedRequests,
    foreignRequests: foreignRequests(log.requests, ORIGIN),
  }
}

const NO_PROBLEMS = {
  pageErrors: [],
  badResponses: [],
  consoleErrors: [],
  failedRequests: [],
  foreignRequests: [],
}

describe("the Block catalogue", () => {
  it("lists every Page Block by its name, once", async () => {
    const { context, page } = await openSession(browser)
    try {
      const response = await visit(page, CATALOGUE_PATH)
      expect(response?.status()).toBe(200)
      const missing: string[] = []
      for (const { name } of PAGE_BLOCKS) {
        const links = page.getByRole("link", { name, exact: true })
        if ((await links.count()) !== 1) missing.push(name)
      }
      expect(missing).toEqual([])
      // Twenty Blocks, twenty different pages.
      const paths = new Set((await catalogueLinks(browser)).values())
      expect(paths.size).toBe(PAGE_BLOCKS.length)
    } finally {
      await context.close()
    }
  })

  it("shows each Block's picker thumbnail, loaded from the Site", async () => {
    const { context, page, log } = await openSession(browser)
    try {
      await visit(page, CATALOGUE_PATH)
      const withoutThumbnail: string[] = []
      for (const { name } of PAGE_BLOCKS) {
        const item = page.getByRole("listitem").filter({
          has: page.getByRole("link", { name, exact: true }),
        })
        const images = item.locator("img")
        if ((await images.count()) < 1) {
          withoutThumbnail.push(`${name}: no image`)
          continue
        }
        const broken = await brokenImages(item)
        if (broken.length) withoutThumbnail.push(`${name}: ${broken}`)
      }
      expect(withoutThumbnail).toEqual([])
      expect(loadProblems(log)).toEqual(NO_PROBLEMS)
    } finally {
      await context.close()
    }
  })

  it("passes axe (WCAG 2.2 AA)", async () => {
    const { context, page } = await openSession(browser)
    try {
      const response = await visit(page, CATALOGUE_PATH)
      expect(response?.status()).toBe(200)
      expect(await axeViolations(page)).toEqual([])
    } finally {
      await context.close()
    }
  })
})

describe.each(PAGE_BLOCKS.map((block) => [block.name] as const))(
  "the %s Block, from its sample data",
  (name) => {
    it("renders without errors, with nothing from another origin", async () => {
      const { context, page, log } = await openSession(browser)
      try {
        const response = await visit(page, await blockPath(browser, name))
        expect(response?.status()).toBe(200)

        const region = blockRegion(page)
        expect(await region.isVisible()).toBe(true)
        // A landmark region needs a name; sample data gives it content.
        expect(
          (await region.getAttribute("aria-labelledby")) ??
            (await region.getAttribute("aria-label"))
        ).toBeTruthy()
        expect((await region.innerText()).trim().length).toBeGreaterThan(20)
        expect(await brokenImages(region)).toEqual([])
        expect(loadProblems(log)).toEqual(NO_PROBLEMS)
      } finally {
        await context.close()
      }
    })

    it("passes axe (WCAG 2.2 AA)", async () => {
      const { context, page } = await openSession(browser)
      try {
        await visit(page, await blockPath(browser, name))
        expect(await axeViolations(page)).toEqual([])
      } finally {
        await context.close()
      }
    })

    it("reflows at 320 CSS pixels without sideways scrolling, and still passes axe", async () => {
      const { context, page } = await openSession(browser)
      try {
        await page.setViewportSize({ width: 320, height: 720 })
        await visit(page, await blockPath(browser, name))
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
        expect(await axeViolations(page)).toEqual([])
      } finally {
        await context.close()
      }
    })
  }
)
