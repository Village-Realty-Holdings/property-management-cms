import pg from "pg"
import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { formatMoment } from "../../src/admin/time/formatMoment"
import { HARBOUR } from "../../src/theme"
import {
  RUN,
  deleteCreatedSince,
  openTab,
} from "../5-visual-editor/support/editor"
import {
  launchBrowser,
  openSession,
  signIn,
  visit,
  type Session,
} from "../theme/support/browser"
import { ORIGIN, SCHEMA, databaseUrl } from "../theme/support/env"
import { openScratchSite, type ScratchSite } from "../theme/support/site"

/**
 * Iteration 1, audit finding 12: Admin times are in the viewer's time zone,
 * not UTC ("Staff Users see tomorrow's date"). The browser runs in
 * America/Chicago (UTC-5 in September and October), where a Page saved at
 * 23:30 UTC was saved at 6:30 PM, and one saved at 03:30 UTC on 1 Oct was
 * saved at 10:30 PM on 30 Sep. The Pages list, the Layouts list, the Dashboard
 * and the Theme and Layout History tabs must all say so, and the console must
 * not report a hydration mismatch.
 */

const ZONE = "America/Chicago"
const STARTED = new Date().toISOString()
const EVENING = "2026-09-30T23:30:00.000Z" // 6:30 PM on 30 Sep, Chicago
const LATE = "2026-10-01T03:30:00.000Z" // 10:30 PM on 30 Sep, Chicago
const EVENING_LOCAL = "Sep 30, 2026, 6:30 PM"
const LATE_LOCAL = "Sep 30, 2026, 10:30 PM"

const EVENING_TITLE = `Evening save ${RUN}`
const LATE_TITLE = `Late save ${RUN}`
const LAYOUT_NAME = `Evening Layout ${RUN}`

let browser: Browser
let staff: Session
let page: Page
let site: ScratchSite
let layoutId: number

/** Sets when a record was last saved, in the table and in its versions. */
async function backdate(
  table: "pages" | "layouts",
  id: number,
  iso: string
): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl() })
  await client.connect()
  try {
    const schema = `"${SCHEMA}"`
    await client.query(
      `UPDATE ${schema}."${table}" SET updated_at = $1 WHERE id = $2`,
      [iso, id]
    )
    await client.query(
      `UPDATE ${schema}."_${table}_v" SET version_updated_at = $1 WHERE parent_id = $2`,
      [iso, id]
    )
  } finally {
    await client.end()
  }
}

/** The hydration complaints React and Next print to the console. */
const hydrationWarnings = (session: Session) =>
  [...session.log.consoleErrors, ...session.log.pageErrors].filter((text) =>
    /hydrat|did not match|server rendered text|text content does not match/i.test(
      text
    )
  )

beforeAll(async () => {
  site = await openScratchSite()
  const evening = await site.payload.create({
    collection: "pages",
    data: {
      title: EVENING_TITLE,
      path: `/lt-${RUN}-evening`,
      blocks: [],
      _status: "published",
    },
  })
  const late = await site.payload.create({
    collection: "pages",
    data: {
      title: LATE_TITLE,
      path: `/lt-${RUN}-late`,
      blocks: [],
      _status: "published",
    },
  })
  const layout = await site.payload.create({
    collection: "layouts",
    data: { name: LAYOUT_NAME, header: [], footer: [] },
  })
  layoutId = layout.id
  await backdate("pages", evening.id, EVENING)
  await backdate("pages", late.id, LATE)
  await backdate("layouts", layout.id, EVENING)
  await site.saveTheme(HARBOUR.inputs, `Local time ${RUN}`)

  browser = await launchBrowser()
  staff = await openSession(browser, { timezoneId: ZONE })
  page = staff.page
  await signIn(page)
})

afterAll(async () => {
  if (staff) await deleteCreatedSince(staff.context.request, STARTED)
  await browser?.close()
  await site?.close()
})

/** The text of the cell that says when the row called `name` was updated. */
async function updatedOf(name: string): Promise<string> {
  const row = page.getByRole("row", { name: new RegExp(name) })
  await row.waitFor()
  return (await row.locator("time").first().textContent()) ?? ""
}

describe("Admin times are in the viewer's time zone", () => {
  it("the Pages list says 6:30 PM and 10:30 PM on 30 Sep, not 1 Oct", async () => {
    await visit(page, "/admin/pages")
    await expect
      .poll(() => updatedOf(EVENING_TITLE), { message: EVENING_TITLE })
      .toBe(EVENING_LOCAL)
    expect(await updatedOf(LATE_TITLE)).toBe(LATE_LOCAL)
    // Hovering names the zone.
    const time = page
      .getByRole("row", { name: new RegExp(LATE_TITLE) })
      .locator("time")
    expect(await time.getAttribute("title")).toBe(
      `${LATE_LOCAL} Central Daylight Time`
    )
    expect(await time.getAttribute("datetime")).toBe(LATE)
  })

  it("the Layouts list shows the Layout's save in local time too", async () => {
    await visit(page, "/admin/layouts")
    await expect
      .poll(() => updatedOf(LAYOUT_NAME), { message: LAYOUT_NAME })
      .toBe(EVENING_LOCAL)
  })

  it("the Dashboard shows the same local date and time", async () => {
    await visit(page, "/admin")
    const recent = page.locator("time", { hasText: LATE_LOCAL })
    await expect.poll(() => recent.count()).toBeGreaterThan(0)
    expect(
      await page.locator("time", { hasText: EVENING_LOCAL }).count()
    ).toBeGreaterThan(0)
    // Nothing on the page is still UTC's "Oct 1".
    expect(await page.locator("time", { hasText: /Oct 1, 2026/ }).count()).toBe(
      0
    )
  })

  it("the Dashboard's Theme card says when the Theme was saved in local time", async () => {
    await visit(page, "/admin")
    const saved = page.locator('[aria-labelledby="dash-theme"] time')
    await expect.poll(() => saved.count()).toBe(1)
    const iso = (await saved.getAttribute("datetime"))!
    expect(await saved.textContent()).toBe(
      formatMoment(iso, { timeZone: ZONE })
    )
  })

  it("the Theme History tab shows local times, with the zone", async () => {
    await visit(page, "/admin/theme")
    const panel = await openTab(page, "History")
    const times = panel
      .getByRole("list", { name: "Theme versions" })
      .locator("time")
    await expect.poll(() => times.count()).toBeGreaterThan(0)
    const first = times.first()
    const iso = (await first.getAttribute("datetime"))!
    expect(await first.textContent()).toBe(
      formatMoment(iso, { timeZone: ZONE, withZone: true })
    )
    expect(await first.textContent()).toMatch(/C[DS]T$/)
  })

  it("the Layout History tab shows local times, with the zone", async () => {
    // The editor keeps a connection open, so the network never goes idle.
    // The first visit compiles the route.
    await page.goto(`${ORIGIN}/admin/layouts/${layoutId}`, {
      timeout: 150_000,
    })
    const panel = await openTab(page, "History")
    const times = panel
      .getByRole("list", { name: "Layout versions" })
      .locator("time")
    await expect.poll(() => times.count()).toBeGreaterThan(0)
    const first = times.first()
    const iso = (await first.getAttribute("datetime"))!
    expect(await first.textContent()).toBe(
      formatMoment(iso, { timeZone: ZONE, withZone: true })
    )
    expect(await first.textContent()).toMatch(
      /^[A-Z][a-z]{2} \d+, 2026, .* C[DS]T$/
    )
  })

  it("none of those screens reported a hydration mismatch", () => {
    expect(hydrationWarnings(staff)).toEqual([])
  })
})
