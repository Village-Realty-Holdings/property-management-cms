import type { Browser } from "playwright-core"
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
  blockRegion,
  effectiveBackground,
  tokenColour,
} from "./support/catalogue"

/**
 * Phase 4 acceptance: a Block takes a background of Default, Muted, Primary
 * or Dark surface where that makes sense, and passes AA on each.
 *
 * For every Block that takes one (all but the two Heroes, which sit on their
 * photo), and for each of the four backgrounds, the Block's catalogue page
 * with `?background=` must paint the Block with that background's Theme
 * token (`--background`, `--muted`, `--primary`, `--surface-dark`), and axe
 * must find nothing against WCAG 2.2 AA: the text, links, buttons and
 * fields drawn on it keep their contrast. Without the parameter, a Block
 * sits on its default: Default, or the dark surface for the Owner band.
 */

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
})

afterAll(async () => {
  await browser?.close()
})

const WITH_BACKGROUNDS = PAGE_BLOCKS.filter((block) => block.backgrounds)

describe.each(WITH_BACKGROUNDS.map((block) => [block.name, block] as const))(
  "the %s Block",
  (name, block) => {
    it(`sits on its default background (${block.defaultBackground ?? "default"}) when none is chosen`, async () => {
      const { context, page } = await openSession(browser)
      try {
        await visit(page, await blockPath(browser, name))
        const token = BACKGROUND_TOKEN[block.defaultBackground ?? "default"]
        expect(await effectiveBackground(blockRegion(page))).toBe(
          await tokenColour(page, token)
        )
      } finally {
        await context.close()
      }
    })

    it.each(BACKGROUNDS.map((background) => [background] as const))(
      "on the %s background, is painted with its token and passes axe",
      async (background) => {
        const { context, page } = await openSession(browser)
        try {
          const response = await visit(
            page,
            await blockPath(browser, name, { background })
          )
          expect(response?.status()).toBe(200)
          expect(await effectiveBackground(blockRegion(page))).toBe(
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
