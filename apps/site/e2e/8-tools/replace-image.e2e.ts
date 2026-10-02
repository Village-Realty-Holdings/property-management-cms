import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Doc } from "../3-layouts/support/api"
import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Tools acceptance: Replace Image.
 *
 * - The screen follows the one page-header pattern and passes WCAG 2.2 AA.
 * - It asks for both images before it previews.
 * - Each image is picked from the Media library in the picker's dialog.
 * - Preview lists every place that shows the first image.
 * - Published now, the Page shows the second image, and the first stays in
 *   Media.
 */

const SCREEN = "/admin/tools/replace-image"
const RUN = Date.now()

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let h: Harness
let before: number
let after: number
let doc: Doc

async function upload(alt: string): Promise<number> {
  const response = await h.staff.context.request.post(`${ORIGIN}/api/media`, {
    multipart: {
      file: { name: `${alt}.png`, mimeType: "image/png", buffer: PNG },
      _payload: JSON.stringify({ alt }),
    },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return ((await response.json()) as { doc: { id: number } }).doc.id
}

beforeAll(async () => {
  h = await openHarness()
  before = await upload(`e2e-tools-before-${RUN}`)
  after = await upload(`e2e-tools-after-${RUN}`)
  const made = await h.staff.context.request.post(
    `${ORIGIN}/api/pages?draft=false`,
    {
      data: {
        title: "E2E tools gallery",
        path: "/e2e-tools-gallery",
        _status: "published",
        blocks: [{ blockType: "image", aspect: "16x9", image: before }],
      },
    }
  )
  expect(made.ok(), await made.text()).toBe(true)
  doc = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", doc.id)
})

afterAll(async () => {
  if (h) {
    // The Page first: an image in use can't be deleted.
    const request = h.staff.context.request
    if (doc) await request.delete(`${ORIGIN}/api/pages/${doc.id}`)
    for (const id of [before, after]) {
      if (id) await request.delete(`${ORIGIN}/api/media/${id}`)
    }
  }
  await closeHarness(h)
})

/** Picks the image whose name has `alt` in the picker opened from `label`. */
async function pick(page: Page, label: string, alt: string) {
  await page.getByLabel(label, { exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor()
  await dialog.getByRole("button", { name: new RegExp(alt) }).click()
  await dialog.waitFor({ state: "hidden" })
}

describe("Replace Image", () => {
  it("follows the page-header pattern and passes WCAG 2.2 AA", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    expect(
      await page
        .getByRole("heading", { level: 1, name: "Replace Image" })
        .count()
    ).toBe(1)
    expect(
      await page
        .getByRole("group", { name: "Tools" })
        .getByRole("link", { name: "Replace Image" })
        .getAttribute("aria-current")
    ).toBe("page")
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("asks for both images", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    await page.getByRole("button", { name: "Preview" }).click()
    await page.getByText("Choose the image to replace.").waitFor()
  })

  it("previews where the image is shown, then swaps it on the Site", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    await pick(page, "Replace", `e2e-tools-before-${RUN}`)
    await pick(page, "With", `e2e-tools-after-${RUN}`)
    await page.getByRole("button", { name: "Preview" }).click()
    const row = page
      .getByRole("table", { name: "What would change" })
      .getByRole("row")
      .filter({
        has: page.getByRole("rowheader", { name: "E2E tools gallery" }),
      })
    expect(await row.textContent()).toContain("Block 1, Image: Image")
    expect(await accessibilityProblems(page)).toBe("")

    await page.getByRole("button", { name: "Replace…" }).click()
    const dialog = page.getByRole("alertdialog")
    await dialog.getByRole("radio", { name: "Publish now" }).click()
    await dialog.getByRole("button", { name: "Replace" }).click()
    await page.getByText("Replaced in 1 Page.").first().waitFor()

    const live = await h.api.getPage(doc.id)
    expect((live?.blocks as { image: number }[])[0]?.image).toBe(after)
    const kept = await h.staff.context.request.get(
      `${ORIGIN}/api/media/${before}`
    )
    expect(kept.ok()).toBe(true)
  })
})
