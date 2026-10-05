import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Doc } from "../3-layouts/support/api"
import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import { runPath, toast } from "../5-visual-editor/support/editor"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Editing an image's details, from its card in the Media library.
 *
 * - The pencil on a card opens a sheet titled "Edit image" with the file name,
 *   and fields for Alt text, Caption, Credit, and (under "Attribution")
 *   Author, Source URL and Licence. It has no file control.
 * - Alt text is required: saving without it keeps the sheet open and says so.
 * - A Source URL must be a full web address; the error is on that field.
 * - Saved, the sheet closes, the card shows the new alt text, the details are
 *   stored, and a Page that shows the image uses the new alt text.
 * - The sheet passes WCAG 2.2 AA.
 */

const RUN = Date.now().toString(36)
const ALT = `Before ${RUN}`
const NEW_ALT = `After ${RUN}`
const PATH = runPath("media-edit")

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let h: Harness
let mediaId: number
let filename: string
let pageDoc: Doc

const openSheet = async (page: Page) => {
  await visit(page, `/admin/media?q=${encodeURIComponent(`e2e-edit-${RUN}`)}`)
  await page.getByRole("button", { name: `Edit ${filename}` }).click()
  const dialog = page.getByRole("dialog", { name: "Edit image" })
  await dialog.waitFor()
  return dialog
}

beforeAll(async () => {
  h = await openHarness()
  const request = h.user.context.request
  const uploaded = await request.post(`${ORIGIN}/api/media`, {
    multipart: {
      file: { name: `e2e-edit-${RUN}.png`, mimeType: "image/png", buffer: PNG },
      _payload: JSON.stringify({ alt: ALT }),
    },
  })
  expect(uploaded.ok(), await uploaded.text()).toBe(true)
  const { doc } = (await uploaded.json()) as {
    doc: { id: number; filename: string }
  }
  mediaId = doc.id
  filename = doc.filename
  const made = await request.post(`${ORIGIN}/api/pages?draft=false`, {
    data: {
      title: `Media edit ${RUN}`,
      path: PATH,
      _status: "published",
      blocks: [{ blockType: "image", aspect: "16x9", image: mediaId }],
    },
  })
  expect(made.ok(), await made.text()).toBe(true)
  pageDoc = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", pageDoc.id)
})

afterAll(async () => {
  if (h) {
    // The Page first: an image in use can't be deleted.
    const request = h.user.context.request
    if (pageDoc) await request.delete(`${ORIGIN}/api/pages/${pageDoc.id}`)
    if (mediaId) await request.delete(`${ORIGIN}/api/media/${mediaId}`)
  }
  await closeHarness(h)
})

describe("editing an image's details", () => {
  it("opens a sheet with the file name and the fields, and no file control", async () => {
    const { page } = h.user
    const dialog = await openSheet(page)
    expect(await dialog.textContent()).toContain(filename)
    for (const label of ["Alt text", "Caption", "Credit"]) {
      expect(await dialog.getByLabel(label, { exact: true }).count()).toBe(1)
    }
    const attribution = dialog.getByRole("group", { name: "Attribution" })
    for (const label of ["Author", "Source URL", "Licence"]) {
      expect(await attribution.getByLabel(label, { exact: true }).count()).toBe(
        1
      )
    }
    expect(
      await dialog.getByLabel("Alt text", { exact: true }).inputValue()
    ).toBe(ALT)
    expect(await dialog.locator("input[type=file]").count()).toBe(0)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("keeps the sheet open and asks for alt text when it is cleared", async () => {
    const { page } = h.user
    const dialog = await openSheet(page)
    await dialog.getByLabel("Alt text", { exact: true }).fill("")
    await dialog.getByRole("button", { name: "Save", exact: true }).click()
    await dialog.getByText("Some fields need attention.").waitFor()
    await dialog.getByText("Describe the image in alt text.").waitFor()
    expect(await dialog.isVisible()).toBe(true)
  })

  it("refuses a Source URL that isn't a full web address, on that field", async () => {
    const { page } = h.user
    const dialog = await openSheet(page)
    await dialog.getByLabel("Alt text", { exact: true }).fill(NEW_ALT)
    await dialog
      .getByLabel("Source URL", { exact: true })
      .fill("unsplash.com/x")
    await dialog.getByRole("button", { name: "Save", exact: true }).click()
    const message = "Enter a full web address that starts with https://"
    await dialog.getByText(message).waitFor()
    const field = dialog.getByLabel("Source URL", { exact: true })
    expect(await field.getAttribute("aria-invalid")).toBe("true")
    expect(
      await dialog.locator("#media-source-url-error").textContent()
    ).toContain(message)
    expect(await dialog.isVisible()).toBe(true)
  })

  it("saves the details, closes the sheet, and shows the new alt text on the card and the Site", async () => {
    const { page } = h.user
    const dialog = await openSheet(page)
    await dialog.getByLabel("Alt text", { exact: true }).fill(NEW_ALT)
    await dialog.getByLabel("Caption", { exact: true }).fill(`Caption ${RUN}`)
    await dialog.getByLabel("Credit", { exact: true }).fill(`© Credit ${RUN}`)
    await dialog.getByLabel("Author", { exact: true }).fill(`Author ${RUN}`)
    await dialog
      .getByLabel("Source URL", { exact: true })
      .fill("https://unsplash.com/photos/abc")
    await dialog.getByLabel("Licence", { exact: true }).fill("Unsplash License")
    await dialog.getByRole("button", { name: "Save", exact: true }).click()
    await toast(page, /Saved e2e-edit-/).waitFor()
    await dialog.waitFor({ state: "hidden" })

    const card = page.getByRole("listitem").filter({ hasText: filename })
    await card.getByText(NEW_ALT, { exact: true }).waitFor()

    const stored = await h.user.context.request.get(
      `${ORIGIN}/api/media/${mediaId}?depth=0`
    )
    expect(await stored.json()).toMatchObject({
      alt: NEW_ALT,
      caption: `Caption ${RUN}`,
      credit: `© Credit ${RUN}`,
      attribution: {
        author: `Author ${RUN}`,
        sourceUrl: "https://unsplash.com/photos/abc",
        licence: "Unsplash License",
      },
    })

    await visit(h.visitor.page, PATH)
    expect(
      await h.visitor.page.locator(`img[alt="${NEW_ALT}"]`).count(),
      "the Page shows the image with its new alt text"
    ).toBeGreaterThan(0)
    expect(await h.visitor.page.locator(`img[alt="${ALT}"]`).count()).toBe(0)
  })
})
