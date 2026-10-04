import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { CLASSIC } from "../../src/theme"
import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import {
  RUN,
  canvas,
  canvasFrame,
  canvasToken,
  recordRoundTrips,
} from "./support/editor"

/**
 * The canvas bridge (Phase 5): the Site route in its editing mode renders
 * whatever document the Admin posts to it, and shows a change with no network
 * round trip. Until the Visual Editor's mode routes exist, a small same-origin
 * page stands in for the Admin: it frames `/?__edit=1` and speaks the same
 * protocol as src/admin/editor/bridge.ts.
 */

const CHANNEL = "site-builder/canvas"
const HARNESS = `${ORIGIN}/__canvas-harness`
const IMMEDIATE_MS = 1_000

const HARNESS_HTML = `<!doctype html><title>Canvas harness</title>
<iframe id="canvas" src="/?__edit=1" style="width:100%;height:800px;border:0"></iframe>
<script>
  const frame = document.getElementById("canvas")
  window.readies = 0
  window.latest = null
  const send = () =>
    frame.contentWindow.postMessage(
      { channel: "${CHANNEL}", type: "document", document: window.latest },
      location.origin
    )
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) return
    if (event.source !== frame.contentWindow) return
    if (event.data?.channel !== "${CHANNEL}" || event.data.type !== "ready") return
    window.readies++
    if (window.latest) send()
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
}

const hero = (heading: string) => ({ id: "b1", blockType: "hero", heading })
const documentOf = (heading: string, over: Partial<Doc> = {}): Doc => ({
  mode: "page",
  page: [hero(heading)],
  header: [],
  footer: [],
  theme: null,
  ...over,
})

let browser: Browser
let user: Session
let page: Page

const send = (doc: Doc) =>
  page.evaluate(
    (document) =>
      (
        window as unknown as { sendDocument: (d: unknown) => void }
      ).sendDocument(document),
    doc
  )

beforeAll(async () => {
  browser = await launchBrowser()
  user = await openSession(browser)
  page = user.page
  await signIn(page)
  await user.context.route(HARNESS, (route) =>
    route.fulfill({ contentType: "text/html", body: HARNESS_HTML })
  )
  await page.goto(HARNESS, { waitUntil: "networkidle" })
  // The canvas announces itself once its listener is on.
  await page.waitForFunction(
    () => (window as unknown as { readies: number }).readies > 0,
    undefined,
    { timeout: 60_000 }
  )
})

afterAll(async () => {
  await browser?.close()
})

describe("canvas bridge", () => {
  it("renders the document the Admin posts, and nothing before it", async () => {
    const heading = `Posted ${RUN}`
    await send(documentOf(heading))
    await canvas(page)
      .getByRole("heading", { name: heading })
      .waitFor({ timeout: 15_000 })
  })

  it("shows a changed document at once, with no network round trip", async () => {
    const recording = recordRoundTrips(page)
    const heading = `Changed ${RUN}`
    const start = Date.now()
    await send(documentOf(heading))
    await canvas(page)
      .getByRole("heading", { name: heading })
      .waitFor({ timeout: 5_000 })
    const ms = Date.now() - start
    expect(recording.stop(), "round trips for the preview").toEqual([])
    expect(ms, "ms until the canvas showed it").toBeLessThan(IMMEDIATE_MS)
  })

  it("names plain text's field, so the canvas is in editing mode", async () => {
    const field = canvas(page).locator("[data-editable-field=heading]").first()
    await field.waitFor()
    expect(await field.getAttribute("data-block-index")).toBe("0")
  })

  it("applies unsaved Theme inputs as tokens, with no round trip", async () => {
    // The scratch Site has saved no Theme, so it shows Classic (pill buttons).
    await send(documentOf("Saved"))
    await expect
      .poll(() => canvasToken(page, "--btn-radius"), { timeout: 5_000 })
      .toBe("9999px")

    await send(
      documentOf("Theme", {
        mode: "theme",
        theme: { ...CLASSIC.inputs, buttonCorners: "square" },
      })
    )
    await expect
      .poll(() => canvasToken(page, "--btn-radius"), { timeout: 5_000 })
      .toBe("0px")

    const recording = recordRoundTrips(page)
    const start = Date.now()
    await send(
      documentOf("Theme", {
        mode: "theme",
        theme: { ...CLASSIC.inputs, buttonCorners: "soft" },
      })
    )
    await expect
      .poll(() => canvasToken(page, "--btn-radius"), { timeout: 5_000 })
      .toBe("8px")
    const ms = Date.now() - start
    expect(recording.stop(), "round trips for the preview").toEqual([])
    expect(ms, "ms until the canvas showed it").toBeLessThan(IMMEDIATE_MS)

    // Without the unsaved Theme, the saved one the route emitted applies.
    await send(documentOf("Back"))
    await expect
      .poll(() => canvasToken(page, "--btn-radius"), { timeout: 5_000 })
      .toBe("9999px")
  })

  it("ignores a message that does not come from the Admin window", async () => {
    await send(documentOf(`Kept ${RUN}`))
    const frame = await canvasFrame(page)
    await canvas(page)
      .getByRole("heading", { name: `Kept ${RUN}` })
      .waitFor()
    // The canvas posting to itself has the canvas as its source, not the Admin.
    await frame.evaluate(
      ([channel, document]) =>
        window.postMessage(
          { channel, type: "document", document },
          location.origin
        ),
      [CHANNEL, documentOf("Forged")] as const
    )
    await page.waitForTimeout(500)
    expect(await canvas(page).getByRole("heading").allTextContents()).toEqual([
      `Kept ${RUN}`,
    ])
  })

  it("answers a User's request noindex and uncached", async () => {
    const response = await user.context.request.get(`${ORIGIN}/?__edit=1`)
    expect(response.status()).toBe(200)
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow")
    // Dynamic, so Next sends no-cache (and no-store in production).
    expect(response.headers()["cache-control"]).toMatch(/no-cache|no-store/)
    expect(response.headers()["cache-control"]).not.toMatch(/public|s-maxage/)
    expect(await response.text()).toMatch(
      /<meta name="robots" content="noindex, nofollow(, nocache)?"/
    )
  })

  it("ignores the flag for a visitor", async () => {
    const visitor = await browser.newContext()
    try {
      const plain = await visitor.request.get(`${ORIGIN}/`)
      const flagged = await visitor.request.get(`${ORIGIN}/?__edit=1`)
      expect(flagged.status()).toBe(plain.status())
      expect(await flagged.text()).not.toContain('aria-busy="true"')
    } finally {
      await visitor.close()
    }
  })
})
