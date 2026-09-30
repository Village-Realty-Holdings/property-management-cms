/* eslint-disable turbo/no-undeclared-env-vars -- E2E_* switches of the acceptance tests, which are not turbo tasks */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { homedir } from "node:os"
import path from "node:path"

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright-core"

import type { StyleExpectation } from "../expectations"
import { ORIGIN, SCREENSHOT_DIR } from "./env"

/**
 * Browser helpers for the Theme acceptance tests: launching Chromium,
 * recording what a page requests and logs, reading the Site's variables and
 * computed styles, fonts, accessibility, and taking screenshots.
 */

const require = createRequire(import.meta.url)

/**
 * `E2E_CHROME`, else the newest Chromium in Playwright's cache (the one
 * `playwright-core` would install may differ from what this machine has),
 * else Playwright's own default.
 */
function chromiumPath(): string | undefined {
  if (process.env.E2E_CHROME) return process.env.E2E_CHROME
  const cache = path.join(homedir(), ".cache", "ms-playwright")
  if (!existsSync(cache)) return undefined
  const newest = readdirSync(cache)
    .filter((dir) => /^chromium-\d+$/.test(dir))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))
    .map((dir) => path.join(cache, dir, "chrome-linux64", "chrome"))
    .find((file) => existsSync(file))
  return newest
}

export function launchBrowser(): Promise<Browser> {
  return chromium.launch({ executablePath: chromiumPath() })
}

export const DESKTOP = { width: 1280, height: 900 }

/** What one page did: every URL it requested, and every console error. */
export type PageLog = {
  requests: string[]
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
  /** Responses with a 4xx or 5xx status, as "404 http://...". */
  badResponses: string[]
}

export type Session = { context: BrowserContext; page: Page; log: PageLog }

export async function openSession(
  browser: Browser,
  options: { reducedMotion?: "reduce" | "no-preference" } = {}
): Promise<Session> {
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ?? "no-preference",
    // The Site is English; keeps text shaping the same between runs.
    locale: "en-GB",
  })
  const page = await context.newPage()
  const log: PageLog = {
    requests: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  }
  page.on("request", (request) => log.requests.push(request.url()))
  page.on("requestfailed", (request) =>
    log.failedRequests.push(
      `${request.url()} (${request.failure()?.errorText})`
    )
  )
  page.on("response", (response) => {
    if (response.status() >= 400)
      log.badResponses.push(`${response.status()} ${response.url()}`)
  })
  page.on("console", (message) => {
    if (message.type() === "error") log.consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => log.pageErrors.push(error.message))
  return { context, page, log }
}

/** Signs the dev Staff User in (`DEV_SIGN_IN=1`, the same session as Entra). */
export async function signIn(page: Page): Promise<void> {
  await page.goto(`${ORIGIN}/auth/dev?redirect=/admin`)
  await page.waitForURL(`${ORIGIN}/admin**`)
}

/**
 * Opens `pathname` and waits for it to settle: the network is idle and the
 * fonts have loaded. The Next.js dev indicator is hidden so screenshots show
 * only the Site.
 */
export async function visit(page: Page, pathname: string) {
  const response = await page.goto(`${ORIGIN}${pathname}`, {
    waitUntil: "networkidle",
  })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await page.evaluate(() => document.fonts.ready)
  return response
}

/**
 * The value of each custom property on the document root, as the browser
 * computes it: a `var(--x)` inside a value is already substituted.
 */
export function rootTokens(
  page: Page,
  names: readonly string[]
): Promise<Record<string, string>> {
  return page.evaluate(
    (props) => {
      const style = getComputedStyle(document.documentElement)
      return Object.fromEntries(
        props.map((name) => [name, style.getPropertyValue(name).trim()])
      )
    },
    [...names]
  )
}

/**
 * `tokens` as the browser would compute them at the document root, so an
 * expected value written with `var(--font-modern-body)` compares equal to the
 * computed one. Each value is set on a probe, then read back.
 */
export function resolveTokens(
  page: Page,
  tokens: Record<string, string>
): Promise<Record<string, string>> {
  return page.evaluate((entries) => {
    const probe = document.createElement("div")
    document.body.appendChild(probe)
    const resolved = Object.fromEntries(
      Object.entries(entries).map(([name, value]) => {
        probe.style.setProperty(name, value)
        return [name, getComputedStyle(probe).getPropertyValue(name).trim()]
      })
    )
    probe.remove()
    return resolved
  }, tokens)
}

export type StyleMismatch = {
  property: string
  expected: string
  actual: string
}

/**
 * The properties of `locator`'s element whose computed style differs from
 * `expected`. Each expected value is written in token notation (`#2d4447`,
 * `2.75rem`, `9999px`); the browser resolves it on a probe element with the
 * same font size, and that resolved value is what the element must have.
 * Properties in `contains` (box-shadow) only need to include it, because
 * Tailwind composes a ring and other shadows into the same value.
 */
export function styleMismatches(
  locator: Locator,
  expected: StyleExpectation,
  options: { contains?: readonly string[] } = {}
): Promise<StyleMismatch[]> {
  return locator.evaluate(
    (element, { expectation, contains }) => {
      const actual = getComputedStyle(element)
      const probe = document.createElement("div")
      probe.style.cssText =
        "position:absolute;visibility:hidden;border-style:solid"
      probe.style.fontSize = actual.fontSize
      document.body.appendChild(probe)
      const found: { property: string; expected: string; actual: string }[] = []
      for (const [property, value] of Object.entries(expectation)) {
        probe.style.setProperty(property, value)
        const want = getComputedStyle(probe).getPropertyValue(property)
        probe.style.removeProperty(property)
        const have = actual.getPropertyValue(property)
        const ok = contains.includes(property)
          ? have.includes(want)
          : have === want
        if (!ok) found.push({ property, expected: want, actual: have })
      }
      probe.remove()
      return found
    },
    { expectation: expected, contains: [...(options.contains ?? [])] }
  )
}

export type FontFaceState = { family: string; status: string }

/** Every FontFace the page has, and whether it loaded. */
export function fontFaces(page: Page): Promise<FontFaceState[]> {
  return page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].map((face) => ({
      family: face.family.replace(/^["']|["']$/g, ""),
      status: face.status,
    }))
  })
}

/** The first family in an element's computed `font-family`, unquoted. */
export function primaryFamily(locator: Locator): Promise<string> {
  return locator.evaluate((element) => {
    const first = getComputedStyle(element).fontFamily.split(",")[0] ?? ""
    return first.trim().replace(/^["']|["']$/g, "")
  })
}

export type AxeViolation = {
  id: string
  impact: string | null
  help: string
  nodes: { target: string; summary: string }[]
}

/** WCAG 2.2 AA violations on the page as it stands (axe-core). */
export async function axeViolations(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") })
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: unknown
          ) => Promise<{
            violations: {
              id: string
              impact: string | null
              help: string
              nodes: { target: unknown[]; failureSummary?: string }[]
            }[]
          }>
        }
      }
    ).axe
    const results = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    })
    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target.join(" "),
        summary: (node.failureSummary ?? "").split("\n").slice(0, 3).join(" "),
      })),
    }))
  })
}

/** A full-page screenshot with animations stopped and the caret hidden. */
export function screenshot(page: Page): Promise<Buffer> {
  return page.screenshot({
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  })
}

/** Writes a screenshot into the Phase 2 review set (docs/screenshots/2-theme). */
export function saveScreenshot(name: string, image: Buffer, dir = ""): string {
  const folder = path.join(SCREENSHOT_DIR, dir)
  mkdirSync(folder, { recursive: true })
  const file = path.join(folder, name)
  writeFileSync(file, image)
  return file
}
