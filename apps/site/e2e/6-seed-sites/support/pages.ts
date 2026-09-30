import { execFile } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import type { Browser, BrowserContext, Page } from "playwright-core"

import { pageGroupLines } from "../match"
import { BRAND_REFS, REPO_ROOT, SCREENSHOT_DIR } from "./env"

/**
 * Browser helpers of the Phase 6 acceptance tests. Each Site runs on its own
 * origin, so every helper takes one. The Admin is found by role, label and
 * the names the spec uses (Pages, Outline, History, Save, Restore).
 */

/**
 * Opens `pathname` on `origin` and waits for it to settle: the network is
 * idle and the fonts have loaded. The Next.js dev indicator is hidden.
 */
export async function visitAt(page: Page, origin: string, pathname: string) {
  const response = await page.goto(`${origin}${pathname}`, {
    waitUntil: "networkidle",
  })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await page.evaluate(() => document.fonts.ready)
  return response
}

/**
 * Scrolls through the page so lazy images load, then back to the top, and
 * waits for the network to settle again.
 */
export async function loadLazyContent(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8))
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState("networkidle")
}

/**
 * Signs the dev Staff User in the way a person would: the Admin's sign-in
 * screen, then its "Dev sign-in" button (`DEV_SIGN_IN=1`, the same session
 * code as Entra). Resolves once the Dashboard is open.
 */
export async function signInAt(page: Page, origin: string) {
  await page.goto(`${origin}/admin/sign-in`)
  await page.getByRole("link", { name: "Dev sign-in" }).click()
  await page.waitForURL(
    (url) => url.origin === origin && url.pathname === "/admin"
  )
}

/** A browser context for screenshots: 1440 wide like the references. */
export async function openWideContext(
  browser: Browser,
  reducedMotion: "reduce" | "no-preference" = "reduce"
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion,
    locale: "en-GB",
  })
  return { context, page: await context.newPage() }
}

export type PageRow = {
  title: string
  path: string
  status: string
  layout: string
}

/** The Admin's Pages list, read from its table by column header. */
export async function pagesList(page: Page, origin: string) {
  await page.goto(`${origin}/admin/pages`, { waitUntil: "networkidle" })
  const table = page.getByRole("table").first()
  await table.waitFor()
  return table.evaluate((element): PageRow[] => {
    const headers = [...element.querySelectorAll("thead th")].map((th) =>
      (th.textContent ?? "").trim().toLowerCase()
    )
    const column = (name: string) => headers.indexOf(name)
    return [...element.querySelectorAll("tbody tr")].map((row) => {
      const cells = [...row.querySelectorAll("th, td")].map((cell) =>
        (cell.textContent ?? "").trim()
      )
      const at = (name: string) => cells[column(name)] ?? ""
      return {
        title: at("title"),
        path: at("path"),
        status: at("status"),
        layout: at("layout"),
      }
    })
  })
}

/** The text of the page's main landmark (CSS case changes don't apply). */
export async function mainText(page: Page): Promise<string> {
  return page
    .getByRole("main")
    .first()
    .evaluate((element) => element.textContent ?? "")
}

/**
 * The paths the Layout's Header and Footer link to on this Site, including
 * links inside closed dropdowns. Trailing slashes are dropped.
 */
export async function layoutLinkPaths(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const chrome = document.querySelectorAll(
      'header a[href], footer a[href], [role="banner"] a[href], [role="contentinfo"] a[href]'
    )
    const paths = new Set<string>()
    for (const link of chrome) {
      const url = new URL(
        (link as HTMLAnchorElement).getAttribute("href") ?? "",
        location.href
      )
      if (url.origin !== location.origin) continue
      paths.add(url.pathname.replace(/(.)\/+$/, "$1"))
    }
    return [...paths]
  })
}

/** Images that finished loading with nothing to show (a broken source). */
export async function brokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src)
  )
}

/** Every image source the page shows, resolved to absolute URLs. */
export async function imageSources(page: Page): Promise<string[]> {
  return page.evaluate(() => [
    ...new Set(
      [...document.images]
        .map((image) => image.currentSrc || image.src)
        .filter(Boolean)
    ),
  ])
}

/**
 * The Brand's mark in the Header: an image (or inline SVG) whose accessible
 * name matches the Brand, with its source and whether it is an SVG.
 */
export async function headerLogo(
  page: Page,
  name: RegExp
): Promise<{ found: boolean; svg: boolean; loaded: boolean; src: string }> {
  return page.evaluate(
    ({ source, flags }) => {
      const pattern = new RegExp(source, flags)
      const header =
        document.querySelector('header, [role="banner"]') ?? document.body
      for (const image of header.querySelectorAll("img")) {
        if (pattern.test(image.alt)) {
          const src = image.currentSrc || image.src
          return {
            found: true,
            svg: /\.svg(\?|$)/i.test(src),
            loaded: image.complete && image.naturalWidth > 0,
            src,
          }
        }
      }
      for (const svg of header.querySelectorAll("svg")) {
        const label =
          svg.getAttribute("aria-label") ??
          svg.querySelector("title")?.textContent ??
          ""
        if (pattern.test(label)) {
          return { found: true, svg: true, loaded: true, src: "inline" }
        }
      }
      return { found: false, svg: false, loaded: false, src: "" }
    },
    { source: name.source, flags: name.flags }
  )
}

/**
 * Opens a Page in the Visual Editor from the Admin's Pages list, by its
 * title, as a Staff User would.
 */
export async function openPageInEditor(
  page: Page,
  origin: string,
  title: string
) {
  await page.goto(`${origin}/admin/pages`, { waitUntil: "networkidle" })
  await page
    .getByRole("table")
    .first()
    .getByRole("link", { name: title, exact: true })
    .click()
  await page.waitForURL((url) =>
    /^\/admin\/pages\/(?!new$)[^/]+$/.test(url.pathname)
  )
}

/** The lines of the Visual Editor's Outline tab, Page group only. */
export async function outlinePageLines(page: Page): Promise<string[]> {
  const tab = page.getByRole("tab", { name: /^Outline/ })
  await tab.first().click()
  const panel = page.getByRole("tabpanel", { name: /^Outline/ })
  await panel.waitFor()
  return pageGroupLines(await panel.innerText())
}

/**
 * Picks a Theme preset in the Visual Editor's Theme mode (Settings › Theme),
 * opening its Presets section first if the preset is not showing.
 */
export async function choosePreset(page: Page, name: string) {
  const pattern = new RegExp(`^${name}\\b`)
  const control = page
    .getByRole("radio", { name: pattern })
    .or(page.getByRole("button", { name: pattern }))
    .or(page.getByRole("option", { name: pattern }))
    .first()
  if (!(await control.isVisible())) {
    await page
      .getByRole("tab", { name: /^Presets/ })
      .or(page.getByRole("button", { name: /^Presets/ }))
      .first()
      .click()
  }
  await control.click()
}

/**
 * Saves the document open in the Visual Editor with its Save button, and
 * confirms if the editor asks first (a Theme save goes live on every Page).
 */
export async function saveInEditor(page: Page) {
  await page
    .getByRole("button", { name: /^Save\b/ })
    .first()
    .click()
  const confirm = page
    .getByRole("alertdialog")
    .getByRole("button", { name: /^(Save|Confirm)/ })
  const asked = await confirm.waitFor({ state: "visible", timeout: 2000 }).then(
    () => true,
    () => false
  )
  if (asked) await confirm.click()
}

/**
 * Restores the newest version that is not live, from the History tab, and
 * confirms. After one save, that is the version before it.
 */
export async function restoreVersionBefore(page: Page) {
  const history = page.getByRole("tab", { name: /^History/ })
  if ((await history.count()) > 0) await history.first().click()
  await page
    .getByRole("button", { name: /^Restore/ })
    .first()
    .click()
  await page
    .getByRole("alertdialog")
    .or(page.getByRole("dialog"))
    .last()
    .getByRole("button", { name: /^Restore/ })
    .click()
}

/**
 * The real site's screenshot from the brand extraction
 * (research/brands/<folder>/screenshots/<name>.jpg), read from git.
 */
export async function referenceScreenshot(
  folder: string,
  name: string
): Promise<Buffer> {
  return referenceFile(`research/brands/${folder}/screenshots/${name}.jpg`)
}

/** A file of the brand extraction branch, read from git. */
export async function referenceFile(file: string): Promise<Buffer> {
  const errors: string[] = []
  for (const ref of BRAND_REFS) {
    const found = await new Promise<Buffer | undefined>((resolve) => {
      execFile(
        "git",
        ["show", `${ref}:${file}`],
        { cwd: REPO_ROOT, encoding: "buffer", maxBuffer: 128 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            errors.push(`${ref}: ${stderr.toString().trim()}`)
            resolve(undefined)
          } else {
            resolve(stdout)
          }
        }
      )
    })
    if (found) return found
  }
  throw new Error(
    `Could not read ${file} from the brand extraction (fetch research/brand-extraction or set E2E_BRAND_REF):\n${errors.join("\n")}`
  )
}

/** Writes an image into this suite's screenshot folder; returns its path. */
export function saveShot(relative: string, image: Buffer): string {
  const file = path.join(SCREENSHOT_DIR, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, image)
  return file
}

/**
 * Ours next to the real site, as one image: both full-page screenshots
 * scaled to the same width, side by side, with a caption over each.
 */
export async function pairImage(
  browser: Browser,
  ours: Buffer,
  real: Buffer,
  caption: string
): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width: 1480, height: 900 },
    deviceScaleFactor: 1,
  })
  try {
    const page = await context.newPage()
    const uri = (image: Buffer, type: string) =>
      `data:${type};base64,${image.toString("base64")}`
    await page.setContent(`<!doctype html>
<html lang="en"><body style="margin:0;font:14px system-ui;background:#fff;color:#111">
<div style="display:flex;gap:20px;padding:10px;align-items:flex-start">
  <figure style="margin:0;width:720px"><figcaption style="padding:4px 0">Ours: ${caption}</figcaption>
    <img alt="Ours" style="width:720px;display:block" src="${uri(ours, "image/png")}"></figure>
  <figure style="margin:0;width:720px"><figcaption style="padding:4px 0">The real site</figcaption>
    <img alt="The real site" style="width:720px;display:block" src="${uri(real, "image/jpeg")}"></figure>
</div></body></html>`)
    await page.evaluate(() =>
      Promise.all(
        [...document.images].map((image) =>
          image.complete
            ? undefined
            : new Promise((resolve) => (image.onload = resolve))
        )
      )
    )
    return await page.screenshot({ fullPage: true })
  } finally {
    await context.close()
  }
}
