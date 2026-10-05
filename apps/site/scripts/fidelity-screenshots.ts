/* eslint-disable turbo/no-undeclared-env-vars -- E2E_CHROME and FIDELITY_BRAND_REF are switches of this script, not turbo task inputs */
/**
 * The screenshots the Phase 4 and Phase 6 acceptance asks to attach to the
 * PR (site-builder milestone):
 *
 *   pnpm --filter site exec tsx scripts/fidelity-screenshots.ts pairs \
 *     [--warren-beach http://localhost:3001] [--avada http://localhost:3002]
 *   DATABASE_URL=... DATABASE_SCHEMA=... pnpm --filter site exec tsx \
 *     scripts/fidelity-screenshots.ts blocks --origin http://localhost:3131 \
 *     [--fixtures avada]
 *
 * - `pairs`: each seeded Page of Warren Beach and Avada, photographed on the
 *   running Site at 1440 wide, next to the real site's screenshot from the
 *   brand extraction (research/brands/<brand>/screenshots, read from git:
 *   the branch research/brand-extraction, or FIDELITY_BRAND_REF). Writes
 *   docs/screenshots/6-seed/<site>/<page>-pair.png (and -ours.png).
 * - `blocks`: every Block of the catalogue (/dev/blocks) under three presets
 *   (Classic, Harbour, Terracotta), written to
 *   docs/screenshots/4-blocks/<preset>/<block>.png. The Theme is the one of
 *   the Site the running server and DATABASE_SCHEMA name: it is saved as each
 *   preset in turn, and put back as it was at the end. Use a scratch schema
 *   (ms_<something>), not a Site's own.
 *
 * It never touches the live-pm-sites database.
 */
import { execFile } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { promisify } from "node:util"

import { chromium, type Browser, type Page } from "playwright-core"

const APP_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const REPO_ROOT = path.resolve(APP_DIR, "..", "..")

export type SiteSlug = "warren-beach" | "avada"

const DEFAULT_ORIGINS: Record<SiteSlug, string> = {
  "warren-beach": "http://localhost:3001",
  avada: "http://localhost:3002",
}

export type Args =
  | { mode: "pairs"; origins: Record<SiteSlug, string> }
  | { mode: "blocks"; origin: string; fixtures?: string }

const USAGE =
  "usage: fidelity-screenshots.ts pairs [--warren-beach <origin>] [--avada <origin>]\n       fidelity-screenshots.ts blocks --origin <origin> [--fixtures <schema>]"

const trimSlash = (origin: string) => origin.replace(/\/+$/, "")

export function parseArgs(argv: readonly string[]): Args {
  const [mode, ...rest] = argv
  if (mode !== "pairs" && mode !== "blocks") throw new Error(USAGE)
  const allowed =
    mode === "pairs"
      ? ["--warren-beach", "--avada"]
      : ["--origin", "--fixtures"]
  const options = new Map<string, string>()
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i]!
    const value = rest[i + 1]
    if (!allowed.includes(flag) || value === undefined) {
      throw new Error(`Unexpected ${flag} (or no value for it).\n${USAGE}`)
    }
    options.set(flag, value)
  }
  if (mode === "pairs") {
    return {
      mode,
      origins: {
        "warren-beach": trimSlash(
          options.get("--warren-beach") ?? DEFAULT_ORIGINS["warren-beach"]
        ),
        avada: trimSlash(options.get("--avada") ?? DEFAULT_ORIGINS.avada),
      },
    }
  }
  const origin = options.get("--origin")
  if (!origin) throw new Error(`blocks needs --origin <origin>.\n${USAGE}`)
  const fixtures = options.get("--fixtures")
  return {
    mode,
    origin: trimSlash(origin),
    ...(fixtures ? { fixtures } : {}),
  }
}

export type PairTarget = {
  /** The Page's title: the file name and the caption. */
  title: string
  path: string
  /** The real site's screenshot, research/brands/<brand>/screenshots/<this>.jpg */
  reference: string
}

const PAGES: Record<SiteSlug, readonly PairTarget[]> = {
  "warren-beach": [
    { title: "Home", path: "/", reference: "home" },
    { title: "Rentals", path: "/rentals", reference: "rentals" },
    { title: "Owners", path: "/owners", reference: "owners" },
    { title: "Contact", path: "/contact", reference: "contact" },
  ],
  avada: [
    { title: "Home", path: "/", reference: "home" },
    { title: "Search", path: "/search", reference: "search" },
    { title: "Owners", path: "/owners", reference: "owners" },
    { title: "About", path: "/about", reference: "about" },
    { title: "Contact", path: "/contact", reference: "contact" },
  ],
}

/** The Pages a Site's seed makes, paired with the real site's screenshots. */
export function pairTargets(site: SiteSlug): readonly PairTarget[] {
  return PAGES[site]
}

export function pairFile(
  site: SiteSlug,
  title: string,
  kind: "pair" | "ours" = "pair"
): string {
  return `docs/screenshots/6-seed/${site}/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${kind}.png`
}

export function blockShotFile(presetId: string, blockSlug: string): string {
  return `docs/screenshots/4-blocks/${presetId}/${blockSlug}.png`
}

export function referencePath(site: SiteSlug, reference: string): string {
  return `research/brands/${site}/screenshots/${reference}.jpg`
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Ours next to the real site, each scaled to the same width, captioned. */
export function pairHtml(input: {
  ours: string
  real: string
  caption: string
}): string {
  return `<!doctype html>
<html lang="en"><body style="margin:0;font:14px system-ui;background:#fff;color:#111">
<div style="display:flex;gap:20px;padding:10px;align-items:flex-start">
  <figure style="margin:0;width:720px"><figcaption style="padding:4px 0">Ours: ${escapeHtml(input.caption)}</figcaption>
    <img alt="Ours" style="width:720px;display:block" src="${input.ours}"></figure>
  <figure style="margin:0;width:720px"><figcaption style="padding:4px 0">The real site</figcaption>
    <img alt="The real site" style="width:720px;display:block" src="${input.real}"></figure>
</div></body></html>`
}

// ---------------------------------------------------------------------------
// Running: everything below needs a browser, git and running Sites.

const SITE_NAMES: Record<SiteSlug, string> = {
  "warren-beach": "Warren Beach Rentals",
  avada: "Avada Properties",
}

function chromiumPath(): string | undefined {
  if (process.env.E2E_CHROME) return process.env.E2E_CHROME
  const cache = path.join(homedir(), ".cache", "ms-playwright")
  if (!existsSync(cache)) return undefined
  return readdirSync(cache)
    .filter((dir) => /^chromium-\d+$/.test(dir))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))
    .map((dir) => path.join(cache, dir, "chrome-linux64", "chrome"))
    .find((file) => existsSync(file))
}

function write(relative: string, image: Buffer) {
  const file = path.join(APP_DIR, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, image)
  console.log(`  ${relative}`)
}

/** A file of the brand extraction branch, read from git. */
async function referenceFile(file: string): Promise<Buffer> {
  const refs = process.env.FIDELITY_BRAND_REF
    ? [process.env.FIDELITY_BRAND_REF]
    : ["research/brand-extraction", "origin/research/brand-extraction"]
  const errors: string[] = []
  for (const ref of refs) {
    try {
      const { stdout } = await promisify(execFile)(
        "git",
        ["show", `${ref}:${file}`],
        { cwd: REPO_ROOT, encoding: "buffer", maxBuffer: 128 * 1024 * 1024 }
      )
      return stdout
    } catch (error) {
      errors.push(`${ref}: ${(error as Error).message}`)
    }
  }
  throw new Error(
    `Could not read ${file} from the brand extraction (fetch research/brand-extraction or set FIDELITY_BRAND_REF):\n${errors.join("\n")}`
  )
}

/** Opens a page, lets its fonts and lazy images load, and waits for quiet. */
async function settle(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await page.evaluate(async () => {
    await document.fonts.ready
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8))
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState("networkidle")
}

async function runPairs(
  browser: Browser,
  origins: Record<SiteSlug, string>
): Promise<void> {
  for (const site of Object.keys(PAGES) as SiteSlug[]) {
    console.log(`${SITE_NAMES[site]} (${origins[site]})`)
    for (const target of pairTargets(site)) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        locale: "en-GB",
      })
      try {
        const page = await context.newPage()
        await settle(page, `${origins[site]}${target.path}`)
        const ours = await page.screenshot({ fullPage: true })
        write(pairFile(site, target.title, "ours"), ours)
        const real = await referenceFile(referencePath(site, target.reference))

        const sheet = await context.newPage()
        await sheet.setViewportSize({ width: 1480, height: 900 })
        await sheet.setContent(
          pairHtml({
            ours: `data:image/png;base64,${ours.toString("base64")}`,
            real: `data:image/jpeg;base64,${real.toString("base64")}`,
            caption: `${SITE_NAMES[site]} · ${target.title}`,
          })
        )
        await sheet.evaluate(() =>
          Promise.all(
            [...document.images].map((image) =>
              image.complete
                ? undefined
                : new Promise((resolve) => (image.onload = resolve))
            )
          )
        )
        write(
          pairFile(site, target.title),
          await sheet.screenshot({ fullPage: true })
        )
      } finally {
        await context.close()
      }
    }
  }
}

async function runBlocks(
  browser: Browser,
  options: { origin: string; fixtures?: string }
): Promise<void> {
  // Loaded late: they read DATABASE_SCHEMA and need the database.
  const { getPayload } = await import("payload")
  const { buildPayloadConfig } = await import("../src/payload.config")
  const { DEV_USER } = await import("../src/auth/devSignIn")
  const { registeredUser } = await import("../src/test/registeredUser")
  const { readSiteTheme } = await import("../src/site/read")
  const { saveTheme } = await import("../src/theme/record")
  const { CLASSIC, HARBOUR, TERRACOTTA, presetInputs } =
    await import("../src/theme")
  const { catalogueEntries } = await import("../src/blocks/catalogue")
  const { siteSchema } = await import("../src/database")

  const url = process.env.DATABASE_URL
  const schema = siteSchema(process.env)
  if (!url || !schema || schema === "public") {
    throw new Error("Set DATABASE_URL and DATABASE_SCHEMA (a scratch schema).")
  }
  if (new URL(url).pathname.replace(/^\//, "") === "live-pm-sites") {
    throw new Error("Refusing to use the live-pm-sites database.")
  }
  const payload = await getPayload({
    config: buildPayloadConfig({
      databaseUrl: url,
      schemaName: schema,
      push: false,
    }),
  })
  const record = await registeredUser(payload, DEV_USER)
  const user = { ...record, collection: "users" as const }
  const before = await readSiteTheme(payload)
  try {
    for (const preset of [CLASSIC, HARBOUR, TERRACOTTA]) {
      const { fonts } = await readSiteTheme(payload)
      await saveTheme(payload, {
        user,
        inputs: presetInputs(preset, fonts),
        note: `Block screenshots: ${preset.name}`,
      })
      console.log(preset.name)
      for (const entry of catalogueEntries) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          reducedMotion: "reduce",
          locale: "en-GB",
        })
        try {
          const page = await context.newPage()
          const query = options.fixtures
            ? `?fixtures=${encodeURIComponent(options.fixtures)}`
            : ""
          await settle(
            page,
            `${options.origin}/dev/blocks/${entry.slug}${query}`
          )
          const image = await page
            .locator("main")
            .getByRole("region")
            .first()
            .screenshot({ animations: "disabled", caret: "hide" })
          write(blockShotFile(preset.id, entry.slug), image)
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await saveTheme(payload, {
      user,
      inputs: before.inputs,
      note: "Block screenshots: back to the Theme before",
    })
    await payload.destroy()
  }
}

async function main() {
  let args: Args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error((error as Error).message)
    process.exit(2)
  }
  const browser = await chromium.launch({ executablePath: chromiumPath() })
  try {
    if (args.mode === "pairs") await runPairs(browser, args.origins)
    else await runBlocks(browser, args)
  } finally {
    await browser.close()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error)
      process.exit(1)
    }
  )
}
