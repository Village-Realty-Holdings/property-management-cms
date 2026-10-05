import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { visit } from "../theme/support/browser"
import { markedRegions, type Block, type Doc } from "./support/api"
import {
  accessibilityProblems,
  closeHarness,
  focusIsVisible,
  openHarness,
  tabTo,
  type Harness,
} from "./support/site"

/**
 * Phase 3 acceptance: the Admin shows Layouts for real (spec Phase 1 "Admin
 * structure" lists, now backed by the `layouts` collection).
 *
 * - The Layouts list shows each Layout's name, paths and usage ("Used by N
 *   Pages"), follows the one page-header pattern, and has Duplicate, which
 *   copies a Layout under a new name, confirms with a toast, and works from
 *   the keyboard alone with visible focus.
 * - The Pages list names the Layout each Page uses: "Listings, via /stays",
 *   the Layout it picks, or "No Layout".
 * - Continue editing on the Dashboard includes Layouts.
 * - Each screen passes WCAG 2.2 AA (axe).
 */

const LISTINGS = "Acceptance listings"
const UNUSED = "Acceptance unused"

let h: Harness
let listings: Doc
let pinned: Doc

beforeAll(async () => {
  h = await openHarness()
  listings = await h.api.createLayout({
    name: LISTINGS,
    paths: ["/e2e-admin/listings", "/e2e-admin/rentals"],
    ...markedRegions(LISTINGS),
  })
  await h.api.createLayout({ name: UNUSED, ...markedRegions(UNUSED) })
  await h.api.createPage({
    title: "E2E admin cabin",
    path: "/e2e-admin/listings/cabin",
  })
  await h.api.createPage({
    title: "E2E admin villa",
    path: "/e2e-admin/rentals/villa",
  })
  pinned = await h.api.createPage({
    title: "E2E admin pinned",
    path: "/e2e-admin-pinned",
    layout: { mode: "specific", layout: listings.id },
  })
  await h.api.createPage({
    title: "E2E admin bare",
    path: "/e2e-admin-bare",
    layout: { mode: "none" },
  })
  await h.api.createPage({
    title: "E2E admin plain",
    path: "/e2e-admin-plain",
  })
})

afterAll(async () => {
  await closeHarness(h)
})

/** The Layouts table's row for the Layout named `name`. */
function layoutRow(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Layouts" })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name, exact: true }) })
}

/** The Pages table's row for the Page titled `title`. */
function pageRow(page: Page, title: string) {
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: title, exact: true }) })
}

async function rowText(row: ReturnType<typeof layoutRow>) {
  expect(await row.count(), "the row exists").toBe(1)
  return (await row.textContent()) ?? ""
}

describe("the Layouts list", () => {
  it("follows the page-header pattern: title, description, New Layout", async () => {
    const { page } = h.user
    await visit(page, "/admin/layouts")
    expect(
      await page.getByRole("heading", { level: 1, name: "Layouts" }).count()
    ).toBe(1)
    expect(
      await page.getByText("The Header and Footer").count()
    ).toBeGreaterThan(0)
    expect(
      await page.getByRole("link", { name: "New Layout" }).count()
    ).toBeGreaterThan(0)
  })

  it("lists every Layout, the default among them", async () => {
    const { page } = h.user
    await visit(page, "/admin/layouts")
    const all = await h.api.findLayouts()
    for (const layout of all)
      expect(
        await layoutRow(page, String(layout.name)).count(),
        `row for ${String(layout.name)}`
      ).toBe(1)
  })

  it("shows each Layout's paths", async () => {
    const { page } = h.user
    await visit(page, "/admin/layouts")
    const text = await rowText(layoutRow(page, LISTINGS))
    expect(text).toContain("/e2e-admin/listings")
    expect(text).toContain("/e2e-admin/rentals")
    expect(await rowText(layoutRow(page, UNUSED))).toContain("No paths")
  })

  it("shows how many Pages use each Layout", async () => {
    const { page } = h.user
    await visit(page, "/admin/layouts")
    // Two by path, one picked explicitly.
    expect(await rowText(layoutRow(page, LISTINGS))).toContain(
      "Used by 3 Pages"
    )
    expect(await rowText(layoutRow(page, UNUSED))).toContain(
      "Not used by any Page"
    )
  })

  it("updates the usage when a Page stops using a Layout", async () => {
    await h.api.updatePage(pinned.id, { layout: { mode: "none" } })
    const { page } = h.user
    await visit(page, "/admin/layouts")
    expect(await rowText(layoutRow(page, LISTINGS))).toContain(
      "Used by 2 Pages"
    )
    await h.api.updatePage(pinned.id, {
      layout: { mode: "specific", layout: listings.id },
    })
  })

  it("passes WCAG 2.2 AA (axe)", async () => {
    const { page } = h.user
    await visit(page, "/admin/layouts")
    expect(await accessibilityProblems(page)).toBe("")
  })
})

describe("Duplicate on the Layouts list", () => {
  let copy: Doc | undefined

  it("copies a Layout under a new name, from the keyboard alone", async () => {
    const { page } = h.user
    const before = await h.api.findLayouts()
    await visit(page, "/admin/layouts")

    const reached = await tabTo(
      page,
      (focused) => focused.name === `Duplicate ${LISTINGS}`
    )
    expect(reached, `Tab reaches "Duplicate ${LISTINGS}"`).toBe(true)
    expect(await focusIsVisible(page), "focus is visible").toBe(true)
    await page.keyboard.press("Enter")

    // A toast confirms it.
    await page
      .getByRole("region", { name: /Notifications/ })
      .getByRole("listitem")
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })

    await expect
      .poll(async () => (await h.api.findLayouts()).length, { timeout: 30_000 })
      .toBe(before.length + 1)
    const known = new Set(before.map((l) => l.id))
    copy = (await h.api.findLayouts()).find((l) => !known.has(l.id))
    expect(copy).toBeDefined()
    h.api.track("layout", copy!.id)

    expect(copy!.name).not.toBe(LISTINGS)
    expect(String(copy!.name)).toContain(LISTINGS)
  })

  it("copies the Header and Footer, but is not the default", async () => {
    const original = (await h.api.getLayout(listings.id))!
    const types = (doc: Doc, region: "header" | "footer") =>
      ((doc[region] as Block[] | undefined) ?? []).map((b) => b.blockType)
    expect(types(copy!, "header")).toEqual(types(original, "header"))
    expect(types(copy!, "footer")).toEqual(types(original, "footer"))
    expect(copy!.isDefault).toBe(false)
    // The original is unchanged.
    expect(original.name).toBe(LISTINGS)
  })

  it("shows the copy in the list", async () => {
    const { page } = h.user
    await visit(page, "/admin/layouts")
    expect(await layoutRow(page, String(copy!.name)).count()).toBe(1)
  })

  it("puts the copy in Continue editing on the Dashboard", async () => {
    const { page } = h.user
    await visit(page, "/admin")
    const card = page.getByRole("region", { name: "Continue editing" })
    const link = card.getByRole("link", { name: String(copy!.name) })
    expect(await link.count()).toBeGreaterThan(0)
    expect(await link.first().getAttribute("href")).toBe(
      `/admin/layouts/${copy!.id}`
    )
  })
})

describe("the Pages list's Layout column", () => {
  async function layoutCell(title: string) {
    const { page } = h.user
    await visit(page, `/admin/pages?q=${encodeURIComponent("e2e-admin")}`)
    return rowText(pageRow(page, title))
  }

  it("names a Layout reached by path, and the path", async () => {
    expect(await layoutCell("E2E admin cabin")).toContain(
      `${LISTINGS}, via /e2e-admin/listings`
    )
    expect(await layoutCell("E2E admin villa")).toContain(
      `${LISTINGS}, via /e2e-admin/rentals`
    )
  })

  it("names the Layout a Page picks", async () => {
    const text = await layoutCell("E2E admin pinned")
    expect(text).toContain(LISTINGS)
    expect(text).not.toContain("via")
  })

  it('says "No Layout" for a Page that uses none', async () => {
    expect(await layoutCell("E2E admin bare")).toContain("No Layout")
  })

  it("names the default Layout for a Page no path covers", async () => {
    const [defaultLayout] = await h.api.defaultLayouts()
    expect(await layoutCell("E2E admin plain")).toContain(
      String(defaultLayout!.name)
    )
  })

  it("passes WCAG 2.2 AA (axe)", async () => {
    const { page } = h.user
    await visit(page, `/admin/pages?q=${encodeURIComponent("e2e-admin")}`)
    expect(await accessibilityProblems(page)).toBe("")
  })
})

describe("the Dashboard with Layouts", () => {
  it("passes WCAG 2.2 AA (axe)", async () => {
    const { page } = h.user
    await visit(page, "/admin")
    expect(await accessibilityProblems(page)).toBe("")
  })
})
