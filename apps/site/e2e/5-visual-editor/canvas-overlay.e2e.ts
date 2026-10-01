import type { Browser, Locator, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import { canvas, canvasElement } from "./support/editor"

/**
 * The canvas overlay (Phase 5, Editing): hovering a Block outlines and labels
 * it, clicking selects it, the selected Block has a toolbar, and a "+" sits
 * between Blocks. Until the Visual Editor's mode routes exist, a small
 * same-origin page stands in for the Admin (see canvas-bridge.e2e.ts): it
 * frames `/?__edit=1`, posts documents, and records what the canvas asks for.
 */

const CHANNEL = "site-builder/canvas"
const HARNESS = `${ORIGIN}/__canvas-overlay-harness`

const HARNESS_HTML = `<!doctype html><title>Canvas harness</title>
<iframe id="canvas" src="/?__edit=1" style="width:900px;height:700px;border:0"></iframe>
<script>
  const frame = document.getElementById("canvas")
  window.readies = 0
  window.latest = null
  window.requests = []
  const send = () =>
    frame.contentWindow.postMessage(
      { channel: "${CHANNEL}", type: "document", document: window.latest },
      location.origin
    )
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) return
    if (event.source !== frame.contentWindow) return
    const data = event.data
    if (data?.channel !== "${CHANNEL}") return
    if (data.type === "ready") {
      window.readies++
      if (window.latest) send()
    } else {
      window.requests.push(data)
    }
  })
  window.sendDocument = (document) => {
    window.latest = document
    send()
  }
</script>`

type Doc = {
  mode: "page" | "layout" | "theme"
  page: object[]
  header: object[]
  footer: object[]
  theme: object | null
  selectedId?: string | null
}

const cta = (id: string, heading: string) => ({
  id,
  blockType: "callToAction",
  heading,
  button: { label: "Book", href: "/book" },
})
const hero = (id: string, heading: string) => ({
  id,
  blockType: "hero",
  heading,
})

const FIRST = "First Block heading"
const SECOND = "Second Block heading"
const STRIP = "Header strip words"

const documentOf = (over: Partial<Doc> = {}): Doc => ({
  mode: "page",
  page: [hero("b1", FIRST), cta("b2", SECOND)],
  header: [{ id: "h1", blockType: "utilityStrip", text: STRIP }],
  footer: [],
  theme: null,
  ...over,
})

let browser: Browser
let staff: Session
let page: Page

const send = (doc: Doc) =>
  page.evaluate(
    (document) =>
      (
        window as unknown as { sendDocument: (d: unknown) => void }
      ).sendDocument(document),
    doc
  )

const requests = () =>
  page.evaluate(() =>
    (window as unknown as { requests: unknown[] }).requests.slice()
  )

const clearRequests = () =>
  page.evaluate(() => {
    ;(window as unknown as { requests: unknown[] }).requests.length = 0
  })

/** The canvas's own label over a Block: a span the overlay draws. */
const label = (text: string) =>
  canvas(page).locator("[data-canvas-label]", { hasText: text })

/** The middle of a locator, on the Admin page: the iframe's box plus its own. */
async function centreOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error("No box")
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

beforeAll(async () => {
  browser = await launchBrowser()
  staff = await openSession(browser)
  page = staff.page
  await signIn(page)
  await staff.context.route(HARNESS, (route) =>
    route.fulfill({ contentType: "text/html", body: HARNESS_HTML })
  )
  await page.goto(HARNESS, { waitUntil: "networkidle" })
  await page.waitForFunction(
    () => (window as unknown as { readies: number }).readies > 0,
    undefined,
    { timeout: 60_000 }
  )
  await send(documentOf())
  await canvas(page)
    .getByRole("heading", { name: FIRST })
    .waitFor({ timeout: 30_000 })
})

afterAll(async () => {
  await browser?.close()
})

describe("canvas overlay", () => {
  it("outlines and labels a Block when the pointer is over it", async () => {
    await page.mouse.move(2, 2)
    expect(await label("Call to action").count()).toBe(0)

    await canvas(page)
      .getByRole("heading", { name: SECOND })
      .hover({ position: { x: 2, y: 2 } })
    await label("Call to action").waitFor({ timeout: 5_000 })

    // The outline lies over the Block's own section.
    const outline = await canvas(page)
      .locator("[data-canvas-outline=hover]")
      .boundingBox()
    const section = await canvas(page)
      .locator("section")
      .filter({ has: canvas(page).getByRole("heading", { name: SECOND }) })
      .boundingBox()
    expect(outline).not.toBeNull()
    expect(section).not.toBeNull()
    expect(Math.abs(outline!.x - section!.x)).toBeLessThan(2)
    expect(Math.abs(outline!.y - section!.y)).toBeLessThan(2)
    expect(Math.abs(outline!.width - section!.width)).toBeLessThan(2)
    expect(Math.abs(outline!.height - section!.height)).toBeLessThan(2)

    // Leaving the canvas takes the label away.
    await page.mouse.move(2, 2)
    await label("Call to action").waitFor({ state: "detached", timeout: 5_000 })
  })

  it("selects a Block by clicking it, asking the Admin", async () => {
    await clearRequests()
    await canvas(page).getByRole("heading", { name: FIRST }).click()
    await expect
      .poll(requests)
      .toEqual([{ channel: CHANNEL, type: "select", id: "b1" }])
  })

  it("shows the Block toolbar on the selected Block, and its buttons ask the Admin", async () => {
    await send(documentOf({ selectedId: "b2" }))
    const bar = canvas(page).getByRole("toolbar", { name: "Block toolbar" })
    await bar.waitFor({ timeout: 5_000 })
    await clearRequests()
    await bar.getByRole("button", { name: "Move up" }).click()
    await bar.getByRole("button", { name: "Duplicate" }).click()
    await bar.getByRole("button", { name: "Delete" }).click()
    // The last Block cannot move down.
    expect(
      await bar.getByRole("button", { name: "Move down" }).isDisabled()
    ).toBe(true)
    await expect.poll(requests).toEqual([
      { channel: CHANNEL, type: "move", id: "b2", direction: "up" },
      { channel: CHANNEL, type: "duplicate", id: "b2" },
      { channel: CHANNEL, type: "delete", id: "b2" },
    ])
    // Pressing the toolbar is not a click on the Block: no `select` above.
    await send(documentOf())
    await bar.waitFor({ state: "detached", timeout: 5_000 })
  })

  it("offers a + between Blocks that asks for an insert at that place", async () => {
    await clearRequests()
    await canvas(page)
      .getByRole("heading", { name: SECOND })
      .hover({ position: { x: 2, y: 2 } })
    const above = canvas(page).getByRole("button", { name: "Add Block above" })
    await above.waitFor({ timeout: 5_000 })
    // Moving onto the + keeps it, and pressing it asks for index 1.
    await above.hover()
    await above.click()
    await expect
      .poll(requests)
      .toEqual([
        { channel: CHANNEL, type: "insert-request", region: "page", index: 1 },
      ])
  })

  it("does not select or label the Layout's Blocks in Page mode", async () => {
    await clearRequests()
    const strip = canvas(page).getByText(STRIP)
    await strip.hover({ force: true })
    await page.waitForTimeout(300)
    expect(await label("Utility strip").count()).toBe(0)
    // The Layout is inert, so click where the strip is, as a pointer would.
    const at = await centreOf(strip)
    await page.mouse.click(at.x, at.y)
    await page.waitForTimeout(300)
    expect(await requests()).toEqual([])
  })

  it("locks the Page's Blocks in Layout mode, and selects the Layout's", async () => {
    await send(documentOf({ mode: "layout" }))
    await canvas(page).locator("main[inert]").waitFor({ timeout: 5_000 })
    await clearRequests()
    const heading = canvas(page).getByRole("heading", { name: FIRST })
    const at = await centreOf(heading)
    await page.mouse.click(at.x, at.y)
    await page.waitForTimeout(300)
    expect(await requests()).toEqual([])

    await canvas(page).getByText(STRIP).click()
    await expect
      .poll(requests)
      .toEqual([{ channel: CHANNEL, type: "select", id: "h1" }])
  })

  it("offers nothing in Theme mode", async () => {
    await send(documentOf({ mode: "theme", selectedId: "b1" }))
    await page.waitForTimeout(300)
    await clearRequests()
    await canvas(page).getByRole("heading", { name: FIRST }).click()
    await page.waitForTimeout(300)
    expect(await requests()).toEqual([])
    expect(await canvas(page).locator("[data-canvas-outline]").count()).toBe(0)
    expect(await canvas(page).getByRole("toolbar").count()).toBe(0)
    // The iframe exists, so the locators above were not vacuous.
    expect(await canvasElement(page).count()).toBe(1)
  })
})
