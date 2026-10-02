import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import type { Browser, Locator, Page } from "playwright-core"
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
  canvas,
  deleteCreatedSince,
  editorUrl,
  openEditor,
  runPath,
  type Doc,
} from "../5-visual-editor/support/editor"

/**
 * Container Blocks: an Image Block shows in the Visual Editor's canvas as it
 * does on the Site. The editor holds the Page as stored, with the image as a
 * Media id, and the canvas draws it from the Site's Media. An Image Block
 * with no image yet is a box that says to choose one, so it can be seen and
 * clicked.
 *
 * The Page holds a two-column Container: an Image beside an Image with no
 * image.
 */

const STARTED = new Date().toISOString()
const PHOTO = fileURLToPath(
  new URL(
    "../../public/fixtures/beachside/rental-sunset-terrace.webp",
    import.meta.url
  )
)
const ALT = `A terrace at sunset ${RUN}`

let browser: Browser
let admin: Session
let page: Page
let mediaId: number
/** The two Image Blocks' ids: with the photo, and with none. */
let ids: { photo: string; empty: string }

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  const upload = await admin.context.request.post(`${ORIGIN}/api/media`, {
    multipart: {
      file: {
        name: `terrace-${RUN}.webp`,
        mimeType: "image/webp",
        buffer: await readFile(PHOTO),
      },
      _payload: JSON.stringify({ alt: ALT }),
    },
  })
  expect(upload.ok(), await upload.text()).toBe(true)
  mediaId = ((await upload.json()) as { doc: { id: number } }).doc.id

  const response = await admin.context.request.post(
    `${ORIGIN}/api/pages?draft=true`,
    {
      data: {
        title: `Images in Containers ${RUN}`,
        path: runPath("canvas-images"),
        _status: "draft",
        blocks: [
          {
            blockType: "container",
            columns: "2",
            children: [
              { blockType: "image", aspect: "16x9", image: mediaId },
              { blockType: "image", aspect: "4x3" },
            ],
          },
        ],
      },
    }
  )
  expect(response.ok()).toBe(true)
  const doc = ((await response.json()) as { doc: Doc }).doc
  const [photo, empty] = (doc.blocks as { children: { id: string }[] }[])[0]!
    .children
  ids = { photo: photo!.id, empty: empty!.id }
  await openEditor(page, editorUrl.page(doc.id))
})

afterAll(async () => {
  if (admin) {
    await deleteCreatedSince(admin.context.request, STARTED)
    if (mediaId) {
      await admin.context.request.delete(`${ORIGIN}/api/media/${mediaId}`)
    }
  }
  await browser?.close()
})

const frame = (id: string): Locator =>
  canvas(page).locator(`[data-block-id="${id}"]`).first()

describe("an Image Block in the canvas", () => {
  it("shows its image, from the Media id the editor holds, at the size it has on the Site", async () => {
    const image = frame(ids.photo).getByRole("img", { name: ALT })
    await expect.poll(() => image.count()).toBe(1)
    const box = await frame(ids.photo).boundingBox()
    expect(box?.width).toBeGreaterThan(200)
    expect(box?.height).toBeGreaterThan(100)
  })

  it("with no image is a box that says to choose one, and a click selects it", async () => {
    const empty = frame(ids.empty)
    await expect
      .poll(() => empty.getByText("Choose an image for this Block.").count())
      .toBe(1)
    const box = await empty.boundingBox()
    expect(box?.height).toBeGreaterThan(100)
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect
      .poll(() =>
        canvas(page)
          .locator("[data-canvas-outline=selected] + [data-canvas-label]")
          .textContent()
      )
      .toBe("Container › Image")
  })
})
