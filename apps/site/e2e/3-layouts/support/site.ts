import type { Browser, Page } from "playwright-core"

import {
  axeViolations,
  launchBrowser,
  openSession,
  signIn,
  visit,
  type AxeViolation,
  type Session,
} from "../../theme/support/browser"
import { StaffApi } from "./api"

/**
 * What the Layouts acceptance specs share: a browser with a visitor and a
 * signed-in Staff User (whose cookie the REST calls use), and reading which
 * Header and Footer a Page of the Site was rendered with.
 */

export type Harness = {
  browser: Browser
  visitor: Session
  staff: Session
  api: StaffApi
}

export async function openHarness(): Promise<Harness> {
  const browser = await launchBrowser()
  const visitor = await openSession(browser)
  const staff = await openSession(browser)
  await signIn(staff.page)
  const api = await StaffApi.open(staff.context.request)
  return { browser, visitor, staff, api }
}

export async function closeHarness(harness: Harness | undefined) {
  await harness?.api.cleanUp()
  await harness?.browser.close()
}

/** The Header and Footer a visitor sees on a Page, as text (null: none). */
export type Chrome = {
  status: number | undefined
  header: string | null
  footer: string | null
  /** How many page-level headers and footers there are (landmarks). */
  headers: number
  footers: number
}

/**
 * Opens `path` as a visitor and reads its page-level Header (the `banner`
 * landmark) and Footer (the `contentinfo` landmark).
 */
export async function chromeOf(page: Page, path: string): Promise<Chrome> {
  const response = await visit(page, path)
  const banner = page.getByRole("banner")
  const contentinfo = page.getByRole("contentinfo")
  const headers = await banner.count()
  const footers = await contentinfo.count()
  return {
    status: response?.status(),
    header: headers > 0 ? await banner.first().textContent() : null,
    footer: footers > 0 ? await contentinfo.first().textContent() : null,
    headers,
    footers,
  }
}

/** Axe's WCAG 2.2 AA violations, formatted for a failure message. */
export function describeViolations(violations: AxeViolation[]): string {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n${v.nodes
          .map((n) => `  ${n.target}: ${n.summary}`)
          .join("\n")}`
    )
    .join("\n")
}

/** WCAG 2.2 AA violations on the page as it stands. */
export async function accessibilityProblems(page: Page): Promise<string> {
  return describeViolations(await axeViolations(page))
}

/** Whether the page scrolls sideways (WCAG 1.4.10 Reflow at 320px). */
export function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1
  )
}

/** Whether the focused element shows focus as keyboard focus does. */
export function focusIsVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return false
    if (!el.matches(":focus-visible")) return false
    const style = getComputedStyle(el)
    const outline =
      style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0
    return outline || style.boxShadow !== "none"
  })
}

/**
 * Presses Tab until `name` is focused (an accessible name, as a screen reader
 * would read it), so the control is proven reachable by keyboard alone.
 */
export async function tabTo(
  page: Page,
  matches: (focused: { name: string; tag: string }) => boolean,
  maxPresses = 80
): Promise<boolean> {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press("Tab")
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return {
        name: (el?.getAttribute("aria-label") ?? el?.innerText ?? "").trim(),
        tag: el?.tagName.toLowerCase() ?? "",
      }
    })
    if (matches(focused)) return true
  }
  return false
}
