import { createHash } from "node:crypto"

import type { Browser } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { HARBOUR, deriveTheme, type TokenMap } from "../../src/theme"
import { tokenMismatches } from "../theme/expectations"
import { compareImages } from "../theme/images"
import { foreignRequests } from "../theme/network"
import {
  axeViolations,
  fontFaces,
  launchBrowser,
  openSession,
  primaryFamily,
  resolveTokens,
  rootTokens,
  screenshot,
  type Session,
} from "../theme/support/browser"
import { digitsOf, missingBlocks, missingInOrder, normalizeText } from "./match"
import {
  brokenImages,
  choosePreset,
  headerLogo,
  imageSources,
  layoutLinkPaths,
  loadLazyContent,
  mainText,
  openPageInEditor,
  openWideContext,
  outlinePageLines,
  pagesList,
  pairImage,
  referenceFile,
  referenceScreenshot,
  restoreVersionBefore,
  saveInEditor,
  saveShot,
  signInAt,
  visitAt,
  type PageRow,
} from "./support/pages"
import {
  cleanUpSites,
  mustSeed,
  prepareSites,
  resetSites,
  startSites,
  type RunningSite,
} from "./support/scratch"
import {
  AVADA_PRIMARY,
  AVADA_SHUTTERSTOCK_PHOTO,
  BEACHSIDE_PALETTE,
  SITES,
  type SitePage,
  type SiteSpec,
} from "./support/sites"

/**
 * Phase 6 acceptance: the three seeded Sites, running at the same time, each
 * from its own worktree (scratch worktrees of this checkout, see
 * support/env.ts), each on its own schema of the scratch database.
 *
 * The smoke test per Site: Home renders, Admin sign-in works, and the editor
 * saves and restores (a Theme change in the Visual Editor, then Restore from
 * its History). Around it, what the seeds must have made, seen as a visitor
 * and as a User would:
 *
 * - every Page the spec names, Published, rendering its content with no
 *   errors, nothing requested from another origin, and no axe WCAG 2.2 AA
 *   violation;
 * - the Brand (name, logo, phone), the Layout (Header, Footer, Navigation to
 *   every Page), the brand preset's Theme and its self-hosted fonts;
 * - Warren Beach and Avada recognisable: the real copy in the real section
 *   order; Avada without the Shutterstock photo;
 * - Beachside as its brand: its palette, Fraunces and Nunito Sans, an SVG
 *   wordmark, Unsplash attributions on its photos, and the Blocks each Page
 *   calls for;
 * - the Admin's screens with the seeded content, each passing axe;
 * - screenshot pairs, ours next to the real site, written to
 *   docs/screenshots/6-seed-sites for the PR.
 */

let sites: RunningSite[] = []
let stopSites: (() => Promise<void>) | undefined
let browser: Browser

const admins = new Map<string, Session>()
const pageRows = new Map<string, PageRow[]>()

beforeAll(async () => {
  sites = await prepareSites()
  await resetSites(sites)
  // The seeds of the three Sites run side by side, like the Sites.
  await Promise.all(sites.map(mustSeed))
  stopSites = await startSites(sites)
  browser = await launchBrowser()
}, 2_400_000)

afterAll(async () => {
  for (const session of admins.values()) await session.context.close()
  await browser?.close()
  await stopSites?.()
  await cleanUpSites(sites)
}, 300_000)

const running = (spec: SiteSpec) =>
  sites.find((site) => site.slug === spec.slug)!

/** A signed-in User on this Site, signed in once per run. */
async function adminOf(site: RunningSite): Promise<Session> {
  const existing = admins.get(site.slug)
  if (existing) return existing
  const session = await openSession(browser)
  await signInAt(session.page, site.origin)
  admins.set(site.slug, session)
  return session
}

/** The Admin's Pages list for this Site, read once. */
async function rowsOf(site: RunningSite): Promise<PageRow[]> {
  const cached = pageRows.get(site.slug)
  if (cached) return cached
  const rows = await pagesList((await adminOf(site)).page, site.origin)
  pageRows.set(site.slug, rows)
  return rows
}

/** Where a spec'd Page lives, from the Admin's Pages list. */
async function pathOf(site: RunningSite, page: SitePage): Promise<string> {
  const row = (await rowsOf(site)).find((r) => r.title === page.title)
  if (!row) {
    throw new Error(
      `${site.name} has no Page titled "${page.title}" in the Admin's Pages list`
    )
  }
  return row.path
}

/** The tokens the brand preset derives, without the font stacks. */
function presetTokens(spec: SiteSpec): TokenMap {
  const tokens = deriveTheme(spec.preset.inputs, {
    heading: "serif",
    body: "sans-serif",
  }).schemes.light
  return Object.fromEntries(
    Object.entries(tokens).filter(([name]) => !name.startsWith("--font-"))
  )
}

/** A page's problems as a visitor's browser sees them. */
function visitorProblems(session: Session, origin: string) {
  const { log } = session
  return {
    pageErrors: log.pageErrors,
    consoleErrors: log.consoleErrors.filter(
      (error) => !error.startsWith("Failed to load resource")
    ),
    badResponses: log.badResponses,
    failedRequests: log.failedRequests,
    foreignRequests: foreignRequests(log.requests, origin),
  }
}

const NO_PROBLEMS = {
  pageErrors: [],
  consoleErrors: [],
  badResponses: [],
  failedRequests: [],
  foreignRequests: [],
}

describe("the three Sites together", () => {
  it("run at the same time, each from its own worktree, each showing only its own Brand", async () => {
    const homes = await Promise.all(
      sites.map(async (site) => {
        const response = await fetch(`${site.origin}/`)
        return { site, status: response.status, html: await response.text() }
      })
    )
    for (const { site, status, html } of homes) {
      expect(status, `${site.slug} Home`).toBe(200)
      expect(html, `${site.slug} shows its Brand`).toMatch(site.namePattern)
      for (const other of sites.filter((candidate) => candidate !== site)) {
        // The full name: "beachside" alone is ordinary coastal copy.
        expect(
          html.toLowerCase(),
          `${site.slug} shows ${other.name}`
        ).not.toContain(other.name.toLowerCase())
      }
    }
    // Three worktrees, three ports: no Site shares another's files.
    expect(new Set(sites.map((site) => site.dir)).size).toBe(3)
    expect(new Set(sites.map((site) => site.schema)).size).toBe(3)
  })
})

describe.each(SITES.map((spec) => [spec.name, spec] as const))(
  "%s",
  (_name, spec) => {
    describe("Home (smoke test)", () => {
      it("renders the Brand's logo, a Header and Footer, and no errors; nothing leaves the Site", async () => {
        const site = running(spec)
        const session = await openSession(browser)
        try {
          const response = await visitAt(session.page, site.origin, "/")
          expect(response?.status()).toBe(200)
          const { page } = session
          await loadLazyContent(page)

          expect(await page.getByRole("banner").count()).toBeGreaterThan(0)
          expect(await page.getByRole("contentinfo").count()).toBeGreaterThan(0)
          expect(await page.getByRole("heading", { level: 1 }).count()).toBe(1)
          const logo = await headerLogo(page, spec.namePattern)
          expect(logo.found, "a logo named after the Brand in the Header").toBe(
            true
          )
          expect(logo.loaded, `the logo loads (${logo.src})`).toBe(true)
          expect(await brokenImages(page)).toEqual([])
          expect(await page.title()).not.toBe("")
          expect(
            await page
              .locator('meta[name="description"]')
              .getAttribute("content"),
            "SEO gives Home a description"
          ).toBeTruthy()
          expect(visitorProblems(session, site.origin)).toEqual(NO_PROBLEMS)
        } finally {
          await session.context.close()
        }
      })

      it("wears the brand preset's Theme, in the brand's own self-hosted fonts", async () => {
        const site = running(spec)
        const session = await openSession(browser)
        try {
          const { page, log } = session
          await visitAt(page, site.origin, "/")
          const expected = presetTokens(spec)
          const actual = await rootTokens(page, Object.keys(expected))
          expect(
            tokenMismatches(await resolveTokens(page, expected), actual)
          ).toEqual([])

          const loaded = new Set(
            (await fontFaces(page))
              .filter((face) => face.status === "loaded")
              .map((face) => face.family.toLowerCase())
          )
          const heading = await primaryFamily(
            page.getByRole("heading", { level: 1 })
          )
          const body = await primaryFamily(page.locator("body"))
          expect(heading.toLowerCase()).toBe(spec.headingFont.toLowerCase())
          expect(body.toLowerCase()).toBe(spec.bodyFont.toLowerCase())
          expect(loaded).toContain(spec.headingFont.toLowerCase())
          expect(loaded).toContain(spec.bodyFont.toLowerCase())
          const fontFiles = log.requests.filter((url) =>
            /\.woff2(\?|$)/.test(url)
          )
          expect(fontFiles.length).toBeGreaterThan(0)
          expect(fontFiles.every((url) => url.startsWith(site.origin))).toBe(
            true
          )
        } finally {
          await session.context.close()
        }
      })

      it("links from its Header or Footer to every other Page (the seeded Navigation)", async () => {
        const site = running(spec)
        const session = await openSession(browser)
        try {
          await visitAt(session.page, site.origin, "/")
          const linked = await layoutLinkPaths(session.page)
          for (const page of spec.pages.filter((p) => p.title !== "Home")) {
            const target = (await pathOf(site, page)).replace(/(.)\/+$/, "$1")
            expect(linked, `a link to ${page.title} (${target})`).toContain(
              target
            )
          }
        } finally {
          await session.context.close()
        }
      })

      it.runIf(spec.phoneDigits !== undefined)(
        "shows the Brand's real phone number",
        async () => {
          const site = running(spec)
          const session = await openSession(browser)
          try {
            await visitAt(session.page, site.origin, "/")
            const text = await session.page.evaluate(
              () => document.body.textContent ?? ""
            )
            expect(digitsOf(text)).toContain(spec.phoneDigits)
          } finally {
            await session.context.close()
          }
        }
      )

      it.runIf(spec.rentals !== undefined)(
        "shows the brand's real Rentals from its fixtures",
        async () => {
          const site = running(spec)
          const session = await openSession(browser)
          try {
            await visitAt(session.page, site.origin, "/")
            const text = normalizeText(await mainText(session.page))
            const shown = spec.rentals!.filter((name) =>
              text.includes(normalizeText(name))
            )
            expect(shown.length, "fixture Rentals on Home").toBeGreaterThan(0)
          } finally {
            await session.context.close()
          }
        }
      )
    })

    describe("every seeded Page", () => {
      it.each(spec.pages.map((page) => [page.title, page] as const))(
        "%s is Published, renders its content without errors, and passes axe",
        async (_title, sitePage) => {
          const site = running(spec)
          const row = (await rowsOf(site)).find(
            (r) => r.title === sitePage.title
          )
          expect(row, `${sitePage.title} in the Pages list`).toBeDefined()
          expect(row!.status).toMatch(/^Published/)

          const session = await openSession(browser)
          try {
            const { page } = session
            const response = await visitAt(page, site.origin, row!.path)
            expect(response?.status()).toBe(200)
            await loadLazyContent(page)
            expect(await page.getByRole("banner").count()).toBeGreaterThan(0)
            expect(await page.getByRole("main").count()).toBe(1)
            expect(await page.getByRole("contentinfo").count()).toBeGreaterThan(
              0
            )
            // One top-level heading at most, and a heading to navigate by.
            expect(
              await page.getByRole("heading", { level: 1 }).count()
            ).toBeLessThanOrEqual(1)
            expect(await page.getByRole("heading").count()).toBeGreaterThan(0)
            if (sitePage.copy) {
              expect(
                missingInOrder(await mainText(page), sitePage.copy),
                "real copy, in the real section order"
              ).toEqual([])
            }
            expect(await brokenImages(page)).toEqual([])
            expect(visitorProblems(session, site.origin)).toEqual(NO_PROBLEMS)
            expect(await axeViolations(page)).toEqual([])
          } finally {
            await session.context.close()
          }
        }
      )
    })

    describe("brand details", () => {
      it.runIf(spec.slug === "avada")(
        "never shows the Shutterstock sunrise photo",
        { timeout: 600_000 },
        async () => {
          const site = running(spec)
          const banned = createHash("sha256")
            .update(await referenceFile(AVADA_SHUTTERSTOCK_PHOTO))
            .digest("hex")
          const session = await openSession(browser)
          try {
            for (const sitePage of spec.pages) {
              await visitAt(
                session.page,
                site.origin,
                await pathOf(site, sitePage)
              )
              await loadLazyContent(session.page)
              for (const src of await imageSources(session.page)) {
                expect(src, `on ${sitePage.title}`).not.toMatch(
                  /shutterstock|hero-sunrise-smokies/i
                )
                if (!src.startsWith(site.origin)) continue
                const bytes = Buffer.from(
                  await (await fetch(src)).arrayBuffer()
                )
                expect(
                  createHash("sha256").update(bytes).digest("hex"),
                  `${src} on ${sitePage.title} is the Shutterstock photo`
                ).not.toBe(banned)
              }
            }
          } finally {
            await session.context.close()
          }
        }
      )

      it.runIf(spec.slug === "avada")(
        "uses the AA primary #ce4b25",
        async () => {
          const site = running(spec)
          const session = await openSession(browser)
          try {
            await visitAt(session.page, site.origin, "/")
            const { "--primary": primary } = await rootTokens(session.page, [
              "--primary",
            ])
            expect(primary?.toLowerCase()).toBe(AVADA_PRIMARY)
          } finally {
            await session.context.close()
          }
        }
      )

      it.runIf(spec.slug === "beachside")(
        "wears the Beachside palette, Fraunces headings of weight 600 or more, Nunito Sans, pill buttons and rounded cards",
        async () => {
          const site = running(spec)
          const session = await openSession(browser)
          try {
            const { page } = session
            await visitAt(page, site.origin, "/")
            const palette = await rootTokens(
              page,
              Object.keys(BEACHSIDE_PALETTE)
            )
            expect(
              Object.fromEntries(
                Object.entries(palette).map(([k, v]) => [k, v.toLowerCase()])
              )
            ).toEqual(BEACHSIDE_PALETTE)

            const h1 = page.getByRole("heading", { level: 1 })
            expect(await primaryFamily(h1)).toBe("Fraunces")
            const weight = await h1.evaluate((element) =>
              Number(getComputedStyle(element).fontWeight)
            )
            expect(weight).toBeGreaterThanOrEqual(600)
            expect(await primaryFamily(page.locator("body"))).toBe(
              "Nunito Sans"
            )

            // Pill buttons: the corner radius is at least half the height.
            const button = page.getByRole("main").getByRole("button").first()
            const shape = await button.evaluate((element) => {
              const style = getComputedStyle(element)
              return {
                radius: parseFloat(style.borderTopLeftRadius),
                height: element.getBoundingClientRect().height,
              }
            })
            expect(shape.radius).toBeGreaterThanOrEqual(shape.height / 2)
          } finally {
            await session.context.close()
          }
        }
      )

      it.runIf(spec.slug === "beachside")(
        "shows its SVG wordmark in the Header",
        async () => {
          const site = running(spec)
          const session = await openSession(browser)
          try {
            await visitAt(session.page, site.origin, "/")
            const logo = await headerLogo(session.page, spec.namePattern)
            expect(logo.found).toBe(true)
            expect(logo.svg, `the wordmark is an SVG (${logo.src})`).toBe(true)
          } finally {
            await session.context.close()
          }
        }
      )

      it.runIf(spec.slug === "beachside")(
        "stores an Unsplash attribution on every photo in Media",
        async () => {
          const site = running(spec)
          const { context } = await adminOf(site)
          const response = await context.request.get(
            `${site.origin}/api/media?limit=500&depth=0`
          )
          expect(response.status()).toBe(200)
          const { docs } = (await response.json()) as {
            docs: Record<string, unknown>[]
          }
          const photos = docs.filter(
            (doc) =>
              typeof doc.mimeType === "string" &&
              /^image\/(jpeg|webp|png|avif)$/.test(doc.mimeType)
          )
          expect(photos.length, "photos in Media").toBeGreaterThan(0)
          // Where the file is stored says nothing about who took it.
          const STORAGE = [
            "url",
            "filename",
            "thumbnailURL",
            "sizes",
            "_objectKey",
            "prefix",
          ]
          const unattributed = photos
            .filter((doc) => {
              const described = Object.fromEntries(
                Object.entries(doc).filter(([key]) => !STORAGE.includes(key))
              )
              return !/unsplash/i.test(JSON.stringify(described))
            })
            .map((doc) => String(doc.filename))
          expect(unattributed).toEqual([])
        }
      )
    })

    describe("Admin (smoke test)", () => {
      it("signs a User in; the Dashboard names the Site and its schema", async () => {
        const site = running(spec)
        const { page } = await adminOf(site)
        // Signed in, the Admin root is the Dashboard (other tests have since
        // moved this session on, so open it again).
        await page.goto(`${site.origin}/admin`, { waitUntil: "networkidle" })
        expect(new URL(page.url()).pathname).toBe("/admin")
        const sidebar = page.getByRole("complementary", { name: "Site" })
        expect(await sidebar.innerText()).toMatch(spec.namePattern)
        expect(await sidebar.innerText()).toContain(site.schema)
        expect(await axeViolations(page)).toEqual([])
      })

      it("lists every seeded Page, each Published", async () => {
        const rows = await rowsOf(running(spec))
        for (const sitePage of spec.pages) {
          const row = rows.find((r) => r.title === sitePage.title)
          expect(row, `${sitePage.title} in the Pages list`).toBeDefined()
          expect(row!.status).toMatch(/^Published/)
          expect(row!.path).toMatch(/^\//)
        }
        expect(rows.find((r) => r.title === "Home")?.path).toBe("/")
        // A second seed run would show here as a duplicate title.
        const titles = rows.map((r) => r.title)
        expect(new Set(titles).size).toBe(titles.length)
      })

      it.each([
        ["Pages", "/admin/pages"],
        ["Layouts", "/admin/layouts"],
        ["Media", "/admin/media"],
        ["Brand", "/admin/settings/brand"],
        ["SEO", "/admin/settings/seo"],
        ["Fonts", "/admin/settings/assets/fonts"],
      ] as const)(
        "shows the seeded content on its %s screen, which passes axe",
        async (screen, pathname) => {
          const site = running(spec)
          const { page } = await adminOf(site)
          await page.goto(`${site.origin}${pathname}`, {
            waitUntil: "networkidle",
          })
          expect(
            await page.getByRole("heading", { level: 1 }).count(),
            "one page header"
          ).toBe(1)
          const main = page.getByRole("main")
          if (screen === "Layouts") {
            const layouts = main.getByRole("table").first().getByRole("row")
            // A header row and at least the default Layout.
            expect(await layouts.count()).toBeGreaterThan(1)
          }
          if (screen === "Media") {
            expect(await main.locator("img").count()).toBeGreaterThan(0)
          }
          if (screen === "Brand") {
            const name = main.getByRole("textbox", { name: /name/i }).first()
            expect(await name.inputValue()).toMatch(spec.namePattern)
          }
          if (screen === "Fonts") {
            const text = await main.innerText()
            for (const family of spec.fonts) expect(text).toContain(family)
          }
          expect(await axeViolations(page)).toEqual([])
        }
      )

      it.runIf(spec.pages.some((p) => p.blocks))(
        "gives each Page the Blocks the brand calls for, in order (the Visual Editor's Outline)",
        { timeout: 600_000 },
        async () => {
          const site = running(spec)
          const { page } = await adminOf(site)
          for (const sitePage of spec.pages.filter((p) => p.blocks)) {
            await openPageInEditor(page, site.origin, sitePage.title)
            const lines = await outlinePageLines(page)
            expect(
              missingBlocks(lines, sitePage.blocks!),
              `${sitePage.title}: ${lines.join(" | ")}`
            ).toEqual([])
          }
        }
      )

      it("opens Home in the Visual Editor, which passes axe", async () => {
        const site = running(spec)
        const { page } = await adminOf(site)
        await openPageInEditor(page, site.origin, "Home")
        await page.waitForLoadState("networkidle")
        expect(await axeViolations(page)).toEqual([])
      })
    })

    describe("screenshot pairs", () => {
      it.each(spec.pages.map((page) => [page.title, page] as const))(
        "photographs %s next to the real site",
        async (_title, sitePage) => {
          const site = running(spec)
          const { context, page } = await openWideContext(browser)
          try {
            await visitAt(page, site.origin, await pathOf(site, sitePage))
            await loadLazyContent(page)
            const ours = await screenshot(page)
            const slug = normalizeText(sitePage.title).replace(/ /g, "-")
            saveShot(`${spec.slug}/${slug}-ours.png`, ours)
            if (spec.brandFolder && sitePage.reference) {
              const real = await referenceScreenshot(
                spec.brandFolder,
                sitePage.reference
              )
              const pair = await pairImage(
                browser,
                ours,
                real,
                `${spec.name} · ${sitePage.title}`
              )
              const file = saveShot(`${spec.slug}/${slug}-pair.png`, pair)
              expect(file).toContain("-pair.png")
            }
          } finally {
            await context.close()
          }
        }
      )
    })

    describe("the editor (smoke test)", () => {
      it(
        "saves a Theme change that goes live, then restores the seeded Theme exactly",
        { timeout: 600_000 },
        async () => {
          const site = running(spec)
          const { page: admin } = await adminOf(site)
          const visitor = await openWideContext(browser)
          try {
            const photograph = async (): Promise<Buffer> => {
              await visitAt(visitor.page, site.origin, "/")
              await loadLazyContent(visitor.page)
              return screenshot(visitor.page)
            }
            const primary = async () => {
              await visitAt(visitor.page, site.origin, "/")
              const tokens = await rootTokens(visitor.page, ["--primary"])
              return (tokens["--primary"] ?? "").toLowerCase()
            }
            const seededTokens = presetTokens(spec)
            const before = await photograph()
            expect(await primary()).toBe(seededTokens["--primary"])

            // Settings › Theme opens the Visual Editor in Theme mode.
            await admin.goto(`${site.origin}/admin/theme`, {
              waitUntil: "networkidle",
            })
            expect(await axeViolations(admin), "Theme mode passes axe").toEqual(
              []
            )
            await choosePreset(admin, HARBOUR.name)
            await saveInEditor(admin)
            await expect
              .poll(primary, { timeout: 60_000 })
              .toBe(HARBOUR.inputs.primary.toLowerCase())
            const changed = await photograph()
            expect(
              compareImages(before, changed).ratio,
              "the save changed the Site"
            ).toBeGreaterThan(0.01)

            // History › Restore puts the seeded Theme back.
            await admin.reload({ waitUntil: "networkidle" })
            await restoreVersionBefore(admin)
            await expect
              .poll(primary, { timeout: 60_000 })
              .toBe(seededTokens["--primary"])

            const restored = await photograph()
            saveShot(`${spec.slug}/editor-restored.png`, restored)
            const result = compareImages(before, restored)
            if (result.diff)
              saveShot(`${spec.slug}/editor-diff.png`, result.diff)
            expect(result.sameSize, "same size as before").toBe(true)
            expect(result.differentPixels, "pixels that differ").toBe(0)
          } finally {
            await visitor.context.close()
          }
        }
      )
    })
  }
)
