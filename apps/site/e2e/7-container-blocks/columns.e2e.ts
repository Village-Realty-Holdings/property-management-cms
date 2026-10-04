import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { catalogueEntries } from "../../src/blocks/catalogue"
import {
  DESKTOP,
  launchBrowser,
  openSession,
  visit,
} from "../theme/support/browser"
import { blockPath, horizontalOverflow } from "../4-blocks/support/catalogue"

/**
 * Container Blocks, Phase 2: a Block the catalogue says fits a narrow column
 * does, because it lays itself out by its cell's width and not the
 * viewport's (ADR-0007).
 *
 * A Block's catalogue page with `?container=default&columns=<n>` shows the
 * Block's sample in each column of an n-column Container. For every Block
 * that fits a narrow column, in two, three and four columns, on a desktop
 * and at two tablet widths: the page does not scroll sideways, and nothing
 * the Block draws reaches outside its cell, where a card's
 * `overflow-hidden` would clip it.
 */

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
})

afterAll(async () => {
  await browser?.close()
})

const VIEWPORTS = [
  DESKTOP,
  { width: 1024, height: 768 },
  { width: 800, height: 1024 },
]

/** The Container itself is not on the catalogue: its sample is the Blocks it holds. */
const NARROW = catalogueEntries
  .filter((entry) => entry.fitsNarrow && entry.blockType !== "container")
  .map((entry) => entry.label)

/**
 * What the Blocks draw outside their cells: each visible element that
 * reaches past its cell's edges, by tag, text and how far, in pixels.
 */
function outsideCells(page: Page) {
  return page.evaluate(() => {
    const grid = document.querySelector("main [data-container] > .grid")
    if (!grid) return null
    const found: string[] = []
    for (const cell of grid.children) {
      const box = cell.getBoundingClientRect()
      for (const element of cell.querySelectorAll("*")) {
        const rect = element.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        // Hidden from sight on purpose (`sr-only`).
        if (getComputedStyle(element).clipPath !== "none") continue
        const past = Math.max(box.left - rect.left, rect.right - box.right)
        if (past > 1) {
          const text = (element.textContent ?? "").trim().slice(0, 30)
          found.push(`${element.tagName} "${text}" by ${Math.round(past)}px`)
        }
      }
    }
    return found
  })
}

describe.each(NARROW.map((name) => [name] as const))(
  "the %s Block in a Container's columns",
  (name) => {
    it.each((["2", "3", "4"] as const).map((columns) => [columns] as const))(
      "stays inside each of %s columns on a desktop and a tablet",
      async (columns) => {
        const { context, page } = await openSession(browser)
        try {
          const response = await visit(
            page,
            await blockPath(browser, name, { container: "default", columns })
          )
          expect(response?.status()).toBe(200)
          for (const viewport of VIEWPORTS) {
            await page.setViewportSize(viewport)
            const at = `${viewport.width}px wide`
            expect(await horizontalOverflow(page), at).toBe(0)
            expect(await outsideCells(page), at).toEqual([])
          }
        } finally {
          await context.close()
        }
      }
    )
  }
)
