import type { Page } from "playwright-core"

import { canvasFrame } from "../../5-visual-editor/support/editor"

/**
 * Opens `url` in the Visual Editor and waits until the canvas has rendered
 * the Site, like `openEditor` of the Visual Editor specs, but without waiting
 * for the network to go idle: with Next's dev server the editor's page can sit
 * in "networkidle" for good (the dev server's own sockets) and `goto` then
 * times out, though the editor is ready. Here the editor is ready when its
 * tabs and the canvas are there; the network gets a moment to settle so the
 * page is hydrated before a spec clicks.
 */
export async function openEditorNow(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await page.getByRole("tab").first().waitFor()
  const frame = await canvasFrame(page)
  await frame.waitForLoadState("load")
  await frame.locator("body").waitFor()
  await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => {})
}
