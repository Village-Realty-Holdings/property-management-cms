import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { CLASSIC, HARBOUR, MEADOW, type ThemeInputs } from "../../src/theme"
import {
  buttonExpectation,
  cardExpectation,
  dialogExpectation,
  expectedReducedMotionTokens,
  expectedRootTokens,
  headingExpectation,
  inputExpectation,
  tokenMismatches,
} from "./expectations"
import {
  launchBrowser,
  openSession,
  resolveTokens,
  rootTokens,
  styleMismatches,
  visit,
  type Session,
} from "./support/browser"
import { openScratchSite, type ScratchSite } from "./support/site"

/**
 * Phase 2 acceptance: a saved Theme renders on the Site exactly as previewed
 * (apps/site ADR-0004). The preview is the Theme module's derivation
 * (src/theme), which is also what the Visual Editor will draw from. For each
 * Theme the test saves it as the User, opens the sample bench on the
 * Site as a visitor, and checks that what the browser computed matches the
 * derivation: the variables at :root, then a button, a card, an input and a
 * heading, then a dialog and a sheet, which portal out of the Site's wrapper.
 */

const LIFTED_PILL: ThemeInputs = {
  primary: "#7a2e8e",
  accent: "#f4b400",
  third: "#2e8e7a",
  text: "#221a2b",
  darkSurface: null,
  neutralTint: "warm",
  headingFont: "built-in:Zilla Slab",
  bodyFont: "built-in:Karla",
  headingWeight: "black",
  headingCase: "uppercase",
  buttonCorners: "pill",
  cardCorners: "rounded",
  spacing: "spacious",
  shadows: "lifted",
  buttonStyle: "solid",
  buttonLetters: "title",
  buttonWeight: "medium",
  buttonText: "auto",
  motion: "lively",
}

const THEMES: [string, ThemeInputs][] = [
  ["Harbour: square, UPPERCASE buttons, subtle shadows", HARBOUR.inputs],
  [
    "Custom: pill, rounded cards, lifted shadows, black UPPERCASE headings",
    LIFTED_PILL,
  ],
  ["Classic: no shadows", CLASSIC.inputs],
  ["Meadow: outline buttons, no motion", MEADOW.inputs],
]

let site: ScratchSite
let browser: Browser
let session: Session
let page: Page

beforeAll(async () => {
  site = await openScratchSite()
  browser = await launchBrowser()
  session = await openSession(browser)
  page = session.page
})

afterAll(async () => {
  await browser?.close()
  await site?.close()
})

describe.each(THEMES)("%s", (_name, inputs) => {
  it("declares the derived tokens at :root", async () => {
    await site.saveTheme(inputs)
    const theme = await site.liveTheme()
    const expected = expectedRootTokens(theme)

    await visit(page, "/dev/theme-sample")

    const actual = await rootTokens(page, Object.keys(expected))
    expect(
      tokenMismatches(await resolveTokens(page, expected), actual)
    ).toEqual([])
  })

  it("styles a button, a card, an input and a heading from those tokens", async () => {
    const expected = expectedRootTokens(await site.liveTheme())
    await visit(page, "/dev/theme-sample")

    expect(
      await styleMismatches(
        page.locator('[data-sample="button"]'),
        buttonExpectation(expected)
      )
    ).toEqual([])
    expect(
      await styleMismatches(
        page.locator('[data-sample="card"]'),
        {
          ...cardExpectation(expected),
          "box-shadow": expected["--card-shadow"]!,
        },
        { contains: ["box-shadow"] }
      )
    ).toEqual([])
    expect(
      await styleMismatches(
        page.locator('[data-sample="input"]'),
        inputExpectation(expected)
      )
    ).toEqual([])
    expect(
      await styleMismatches(
        page.locator('[data-sample="heading"]'),
        headingExpectation(expected)
      )
    ).toEqual([])
    // The Hero's h1 is a Block: the same display tokens.
    expect(
      await styleMismatches(
        page.locator("h1").first(),
        headingExpectation(expected)
      )
    ).toEqual([])
  })

  it("styles a dialog and a sheet the same, although they portal out of the Site", async () => {
    const expected = expectedRootTokens(await site.liveTheme())
    await visit(page, "/dev/theme-sample")

    await page.getByRole("button", { name: "Open dialog" }).click()
    const dialog = page.locator('[data-slot="alert-dialog-content"]')
    await dialog.waitFor()
    expect(
      await styleMismatches(
        dialog,
        {
          ...dialogExpectation(expected),
          "box-shadow": expected["--card-shadow"]!,
        },
        { contains: ["box-shadow"] }
      )
    ).toEqual([])
    expect(
      await styleMismatches(
        page.locator('[data-slot="alert-dialog-action"]'),
        buttonExpectation(expected)
      )
    ).toEqual([])
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "detached" })

    await page.getByRole("button", { name: "Open sheet" }).click()
    const sheet = page.locator('[data-slot="sheet-content"]')
    await sheet.waitFor()
    expect(
      await styleMismatches(sheet, {
        "background-color": expected["--popover"]!,
        color: expected["--popover-foreground"]!,
      })
    ).toEqual([])
    expect(
      await styleMismatches(
        page.locator('[data-sample="sheet-button"]'),
        buttonExpectation(expected)
      )
    ).toEqual([])
    // The portal really is outside the Site's wrapper.
    expect(
      await sheet.evaluate((el) => el.closest("main, header, footer"))
    ).toBeNull()
  })

  it("keeps a visible focus ring on buttons whatever the shadows", async () => {
    await visit(page, "/dev/theme-sample")
    const button = page.locator('[data-sample="button"]')
    // A key press first, so the browser treats the focus as keyboard focus.
    await page.keyboard.press("Shift")
    await button.focus()
    const shadow = await button.evaluate((el) => getComputedStyle(el).boxShadow)
    expect(shadow).not.toBe("none")
  })

  it("stops movement under prefers-reduced-motion", async () => {
    const theme = await site.liveTheme()
    const reduced = expectedReducedMotionTokens(theme)
    await page.emulateMedia({ reducedMotion: "reduce" })
    try {
      await visit(page, "/dev/theme-sample")
      expect(
        tokenMismatches(reduced, await rootTokens(page, Object.keys(reduced)))
      ).toEqual([])
    } finally {
      await page.emulateMedia({ reducedMotion: "no-preference" })
    }
  })
})

describe("the sample Page published through the Admin's record", () => {
  it("renders at its own path with the Theme's tokens", async () => {
    await site.saveTheme(HARBOUR.inputs)
    await site.publishSamplePage()
    const expected = expectedRootTokens(await site.liveTheme())

    const response = await visit(page, "/theme-sample")

    expect(response?.status()).toBe(200)
    const actual = await rootTokens(page, Object.keys(expected))
    expect(
      tokenMismatches(await resolveTokens(page, expected), actual)
    ).toEqual([])
    expect(session.log.pageErrors).toEqual([])
  })
})
