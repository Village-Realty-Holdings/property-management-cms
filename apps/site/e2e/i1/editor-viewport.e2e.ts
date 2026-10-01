import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import {
  RUN,
  canvasElement,
  canvasFrame,
  createPage,
  defaultLayout,
  deleteCreatedSince,
  editorUrl,
  openEditor,
  runPath,
  type Doc,
} from "../5-visual-editor/support/editor"

/**
 * Iteration 1, user note 7: "The Visual Editor scrolls past its end into a
 * white screen." The editor shell fills the viewport and owns its scrolling:
 * the left panel scrolls inside itself, the canvas iframe scrolls its own
 * document, and the page around them never scrolls, at any window size or
 * canvas width.
 */

const STARTED = new Date().toISOString()
const LONG_TITLE = `Long page ${RUN}`
const SECTIONS = 30

let browser: Browser
let admin: Session
let page: Page
let longPage: Doc

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  // The first hit on an editor route compiles it (and the machine may be busy).
  await page.goto(editorUrl.theme(), { timeout: 180_000 })
  const request = admin.context.request
  longPage = await createPage(request, {
    title: LONG_TITLE,
    path: runPath("long"),
    publish: true,
  })
  // Enough Call to action Blocks that the canvas, and the Outline, are far
  // taller than any window.
  const blocks = Array.from({ length: SECTIONS }, (_, i) => ({
    blockType: "callToAction",
    heading: `Section ${i + 1}`,
    body: "A paragraph to give the section some height. ".repeat(8),
    style: "primary",
  }))
  const response = await request.patch(`${ORIGIN}/api/pages/${longPage.id}`, {
    data: { blocks, _status: "published" },
  })
  if (!response.ok()) {
    throw new Error(
      `Giving the Page its Blocks failed: ${response.status()} ${(await response.text()).slice(0, 500)}`
    )
  }
  await page.goto(editorUrl.page(longPage.id), { timeout: 180_000 })
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/** What the outer document measures (not the canvas's). */
const documentMetrics = (p: Page) =>
  p.evaluate(() => {
    const root = document.scrollingElement!
    return {
      scrollHeight: root.scrollHeight,
      scrollWidth: root.scrollWidth,
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    }
  })

async function expectDocumentFillsViewport(p: Page, when: string) {
  const m = await documentMetrics(p)
  expect(m.scrollHeight, `${when}: document height is the window's`).toBe(
    m.innerHeight
  )
  expect(m.scrollWidth, `${when}: document width is the window's`).toBe(
    m.innerWidth
  )
  expect(m.scrollY, `${when}: the page has not scrolled`).toBe(0)
  expect(m.scrollX, `${when}: the page has not scrolled sideways`).toBe(0)
}

/** Wheels over the middle of `target`, `rounds` times by `delta`. */
async function wheelOver(
  p: Page,
  target: ReturnType<Page["locator"]>,
  rounds = 8,
  delta = 4000
) {
  const box = await target.boundingBox()
  if (!box) throw new Error("Nothing to scroll over: no box.")
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < rounds; i++) {
    await p.mouse.wheel(0, delta)
    await p.waitForTimeout(60)
  }
  await p.waitForTimeout(200)
}

const frameScrollY = async (p: Page) =>
  (await canvasFrame(p)).evaluate(() => window.scrollY)

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  describe(`the Visual Editor at ${viewport.width}x${viewport.height}`, () => {
    it("lets the canvas scroll its own document and never the page around it", async () => {
      await page.setViewportSize(viewport)
      await openEditor(page, editorUrl.page(longPage.id))
      await expectDocumentFillsViewport(page, "before scrolling")

      expect(await frameScrollY(page), "the canvas starts at the top").toBe(0)
      await wheelOver(page, canvasElement(page))
      expect(
        await frameScrollY(page),
        "the canvas document scrolled"
      ).toBeGreaterThan(0)
      await expectDocumentFillsViewport(page, "after scrolling the canvas")
    })

    it("lets the panel scroll inside itself and never the page around it", async () => {
      await page.setViewportSize(viewport)
      await openEditor(page, editorUrl.page(longPage.id))
      const panel = page.getByRole("complementary", { name: "Editor panel" })
      await wheelOver(page, panel)
      await expectDocumentFillsViewport(page, "after scrolling the panel")
    })

    it("keeps the page still at every canvas width", async () => {
      await page.setViewportSize(viewport)
      await openEditor(page, editorUrl.page(longPage.id))
      for (const width of ["Tablet", "Mobile", "Desktop"]) {
        await page
          .getByRole("group", { name: "Canvas width" })
          .getByRole("button", { name: width, exact: true })
          .click()
        await expectDocumentFillsViewport(page, `${width} width`)
        await wheelOver(page, canvasElement(page), 3)
        await expectDocumentFillsViewport(page, `${width} width, scrolled`)
      }
    })

    // The Layout and Theme editors share the shell; the Theme panel is tall
    // enough to scroll even in a big window.
    for (const mode of ["layout", "theme"] as const) {
      it(`keeps the page still in the ${mode} editor`, async () => {
        await page.setViewportSize(viewport)
        const url =
          mode === "theme"
            ? editorUrl.theme()
            : editorUrl.layout((await defaultLayout(admin.context.request)).id)
        await openEditor(page, url)
        await expectDocumentFillsViewport(page, `${mode} editor, before`)
        await wheelOver(
          page,
          page.getByRole("complementary", { name: "Editor panel" })
        )
        await expectDocumentFillsViewport(page, `${mode} editor, panel`)
        await wheelOver(page, canvasElement(page), 3)
        await expectDocumentFillsViewport(page, `${mode} editor, canvas`)
      })
    }
  })
}
