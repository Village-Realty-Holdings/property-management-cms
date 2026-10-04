import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { ORIGIN } from "../theme/support/env"

import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import {
  RUN,
  addBlock,
  addBlockButtons,
  canvas,
  canvasToken,
  choice,
  createPage,
  defaultLayout,
  deleteCreatedSince,
  discard,
  editorUrl,
  firstTextField,
  openEditor,
  openTab,
  outlineItems,
  outlineTree,
  recordRoundTrips,
  runPath,
  type Doc,
} from "./support/editor"

/**
 * Phase 5 acceptance: "Instant preview: changing a control or a field updates
 * the canvas immediately, with no network round trip."
 *
 * For a Block field in a Page, a heading typed in place, a Header Block field
 * in a Layout, and Theme controls, the test records every request the Admin
 * page and its canvas make from the change until the canvas shows it, and
 * requires none (document, fetch, XHR or event stream; the dev server's hot
 * reload aside), and that the canvas shows it within a second.
 *
 * The editor claims what it edits (presence) with a request of its own a
 * moment after it loads. Each test waits for that claim before it changes
 * anything, so the claim is never counted as a round trip of the change.
 */

const STARTED = new Date().toISOString()
const TITLE = `Instant preview ${RUN}`
const PATH = runPath("instant")
/** "Immediately": well within what a person notices as waiting. */
const IMMEDIATE_MS = 1_000

let browser: Browser
let admin: Session
let page: Page
let doc: Doc

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  doc = await createPage(admin.context.request, {
    title: TITLE,
    path: PATH,
    publish: false,
  })
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/**
 * Runs `change`, then waits until `shows` is true, and returns how long that
 * took and the round trips made meanwhile.
 */
async function measure(
  change: () => Promise<void>,
  shows: () => Promise<boolean>
): Promise<{ ms: number; roundTrips: string[] }> {
  const recording = recordRoundTrips(page)
  const start = Date.now()
  await change()
  await expect
    .poll(shows, {
      message: "the canvas shows the change",
      timeout: 10_000,
      interval: 25,
    })
    .toBe(true)
  const ms = Date.now() - start
  return { ms, roundTrips: recording.stop() }
}

/**
 * Opens the Visual Editor and waits until it has claimed what it edits: a
 * presence row for it, written after `since`.
 */
async function openClaimed(
  url: string,
  target: { collection: "pages" | "layouts"; id: Doc["id"] } | "theme"
) {
  const since = new Date().toISOString()
  await openEditor(page, url)
  const where =
    target === "theme"
      ? "where[globalSlug][equals]=theme"
      : `where[document.relationTo][equals]=${target.collection}&where[document.value][equals]=${target.id}`
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `${ORIGIN}/api/payload-locked-documents?depth=0&${where}&where[updatedAt][greater_than]=${encodeURIComponent(since)}`
        )
        return ((await response.json()) as { totalDocs?: number }).totalDocs
      },
      { message: "the editor claims what it edits", timeout: 15_000 }
    )
    .toBeGreaterThan(0)
}

describe("instant preview", () => {
  it("a Block field in the Block tab", async () => {
    await openClaimed(editorUrl.page(doc.id), {
      collection: "pages",
      id: doc.id,
    })
    await openTab(page, "Outline")
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Page").first(),
      "Hero"
    )
    await outlineItems(page, "Hero").first().click()
    const blockTab = await openTab(page, "Block")
    const heading = `Instantly here ${RUN}`
    const result = await measure(
      () => blockTab.getByLabel("Heading", { exact: true }).fill(heading),
      () =>
        canvas(page).getByRole("heading", { name: heading }).first().isVisible()
    )
    expect(result.roundTrips, "round trips for the preview").toEqual([])
    expect(result.ms, "ms until the canvas showed it").toBeLessThan(
      IMMEDIATE_MS
    )
  })

  it("a heading typed in place, which the Block tab follows", async () => {
    const heading = canvas(page).getByRole("heading", {
      name: `Instantly here ${RUN}`,
    })
    await heading.click()
    await heading.click()
    await page.keyboard.press("Control+a")
    const typed = `Typed in place ${RUN}`
    const blockTab = page.getByRole("tabpanel", { name: "Block", exact: true })
    const result = await measure(
      () => page.keyboard.type(typed),
      async () =>
        (await blockTab.getByLabel("Heading", { exact: true }).inputValue()) ===
        typed
    )
    expect(result.roundTrips, "round trips for the edit").toEqual([])
    await discard(page)
  })

  it("a Header Block field in a Layout", async () => {
    const layout = await defaultLayout(admin.context.request)
    await openClaimed(editorUrl.layout(layout.id), {
      collection: "layouts",
      id: layout.id,
    })
    await openTab(page, "Outline")
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Header").first(),
      "Utility strip"
    )
    const blockTab = await openTab(page, "Block")
    const text = `Strip preview ${RUN}`
    const result = await measure(
      () => firstTextField(blockTab).fill(text),
      () => canvas(page).locator("header").getByText(text).first().isVisible()
    )
    expect(result.roundTrips, "round trips for the preview").toEqual([])
    expect(result.ms, "ms until the canvas showed it").toBeLessThan(
      IMMEDIATE_MS
    )
    // Never saved: the default Layout stays as it was.
    await discard(page)
  })

  it.each([
    ["Button corners", "Pill", "--btn-radius"],
    ["Spacing", "Spacious", "--section-y"],
    ["Shadows", "Lifted", "--card-shadow"],
  ] as const)("the Theme's %s control", async (name, value, token) => {
    await openClaimed(editorUrl.theme(), "theme")
    const control = page.getByRole("radiogroup", { name })
    // Start from another choice in the same control, so the change is real.
    const other = { Pill: "Square", Spacious: "Compact", Lifted: "None" }[value]
    await choice(control, other).click()
    await page.waitForTimeout(200)
    const before = await canvasToken(page, token)
    const result = await measure(
      () => choice(control, value).click(),
      async () => (await canvasToken(page, token)) !== before
    )
    expect(result.roundTrips, "round trips for the preview").toEqual([])
    expect(result.ms, "ms until the canvas showed it").toBeLessThan(
      IMMEDIATE_MS
    )
    await discard(page)
  })
})
