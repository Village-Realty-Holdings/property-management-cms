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
  addBlock,
  barButton,
  canvas,
  deleteCreatedSince,
  editingInPlace,
  editorUrl,
  expectHidden,
  expectVisible,
  getDoc,
  openEditor,
  runPath,
  toast,
  type Doc,
} from "../5-visual-editor/support/editor"

/**
 * Container Blocks, Phase 5: the canvas does for a Block in a Container what
 * it does for one on the Page. A click selects the innermost Block and its
 * label names the Containers it is in; Esc goes up one level. A "+" beside a
 * Block in a Container, and the one in an empty Container, add a Block there.
 * A Rich text and a Button label in a Container are edited in place, and
 * what was typed is what is saved and what the editor shows after a reload.
 *
 * The Page holds a Hero, a stacked Container A of a Rich text and a Button,
 * and a two-column Container B of a Button beside an empty Container C.
 */

const STARTED = new Date().toISOString()
const button = (label: string) => ({
  blockType: "button",
  link: { label, href: "/contact" },
  style: "primary",
  align: "start",
})
const container = (children: object[], columns = "1") => ({
  blockType: "container",
  columns,
  children,
})
const lexical = (text: string) => ({
  root: {
    type: "root",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    children: [
      {
        type: "paragraph",
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        textFormat: 0,
        children: [
          {
            type: "text",
            text,
            format: 0,
            detail: 0,
            mode: "normal",
            style: "",
            version: 1,
          },
        ],
      },
    ],
  },
})

const NESTED_TEXT = `Words in a Container ${RUN}`
const TYPED_TEXT = `Typed in a Container ${RUN}`
const TYPED_LABEL = `Read our story ${RUN}`

let browser: Browser
let admin: Session
let page: Page
let doc: Doc
/** The Blocks' ids by name: hero, a, text, more, b, left, c. */
let ids: Record<string, string>

type Stored = {
  id: string
  blockType: string
  link?: { label?: string }
  content?: unknown
  children?: Stored[]
}

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  const response = await admin.context.request.post(
    `${ORIGIN}/api/pages?draft=true`,
    {
      data: {
        title: `Canvas in Containers ${RUN}`,
        path: runPath("canvas-containers"),
        _status: "draft",
        blocks: [
          { blockType: "hero", heading: `Canvas in Containers ${RUN}` },
          container([
            { blockType: "richText", content: lexical(NESTED_TEXT) },
            button("Learn More"),
          ]),
          container([button("Left"), container([])], "2"),
        ],
      },
    }
  )
  expect(response.ok()).toBe(true)
  doc = ((await response.json()) as { doc: Doc }).doc
  const [hero, a, b] = doc.blocks as Stored[]
  ids = {
    hero: hero!.id,
    a: a!.id,
    text: a!.children![0]!.id,
    more: a!.children![1]!.id,
    b: b!.id,
    left: b!.children![0]!.id,
    c: b!.children![1]!.id,
  }
  await openEditor(page, editorUrl.page(doc.id))
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/** A Block's frame in the canvas, by its id. */
const frame = (id: string): Locator =>
  canvas(page).locator(`[data-block-id="${id}"]`).first()

/** Clicks a Block near the right end of its box, away from its text. */
async function clickBlock(id: string): Promise<void> {
  const box = await frame(id).locator("> *").first().boundingBox()
  if (!box) throw new Error(`The Block ${id} has no box in the canvas.`)
  await page.mouse.click(box.x + box.width - 8, box.y + box.height / 2)
}

/** The label on the selected Block's outline, or null when none is selected. */
const selectedLabel = async (): Promise<string | null> => {
  const label = canvas(page).locator(
    "[data-canvas-outline=selected] + [data-canvas-label]"
  )
  return (await label.count()) ? await label.textContent() : null
}

const saved = async () =>
  (await getDoc(admin.context.request, "pages", doc.id)).blocks as Stored[]

describe("Container Blocks in the canvas", () => {
  it("selects the innermost Block clicked, labels it with its Containers, and Esc goes up a level", async () => {
    await clickBlock(ids.more!)
    await expect.poll(selectedLabel).toBe("Container › Button")
    await expectVisible(
      canvas(page).getByRole("toolbar", { name: "Block toolbar" }),
      "the selected Block's toolbar"
    )
    // The Button is the last Block of its Container, not of the Page.
    await expect
      .poll(() =>
        canvas(page).getByRole("button", { name: "Move down" }).isDisabled()
      )
      .toBe(true)

    await page.keyboard.press("Escape")
    await expect.poll(selectedLabel).toBe("Container")
    await page.keyboard.press("Escape")
    await expect.poll(selectedLabel).toBeNull()
  })

  it("adds a Block in a Container from a + beside one of its Blocks", async () => {
    await frame(ids.more!).locator("> *").first().hover()
    await addBlock(
      page,
      canvas(page).getByRole("button", { name: "Add Block below" }),
      "Button"
    )
    await expect
      .poll(async () => frame(ids.a!).locator("[data-block-parent]").count())
      .toBe(3)
    await expect.poll(selectedLabel).toBe("Container › Button")
  })

  it("adds a Block in an empty Container, in a column", async () => {
    await addBlock(
      page,
      canvas(page).getByRole("button", {
        name: "Add a Block to this Container",
      }),
      "Button"
    )
    await expectHidden(
      canvas(page).getByRole("button", {
        name: "Add a Block to this Container",
      }),
      "the Container is no longer empty"
    )
    await expect.poll(selectedLabel).toBe("Container › Container › Button")
  })

  it("edits a Rich text and a Button label in a Container in place", async () => {
    const text = frame(ids.text!).getByRole("textbox", { name: "Rich text" })
    await text.click()
    expect(await editingInPlace(page), "the Rich text is edited in place").toBe(
      true
    )
    await page.keyboard.press("Control+a")
    await page.keyboard.type(TYPED_TEXT)
    await expectVisible(
      frame(ids.text!).getByText(TYPED_TEXT),
      "the Rich text typed in place"
    )

    const label = frame(ids.more!).locator("[data-editable-field='link.label']")
    await label.click()
    expect(await editingInPlace(page), "the label is edited in place").toBe(
      true
    )
    await page.keyboard.press("Control+a")
    await page.keyboard.type(TYPED_LABEL)
    await page.keyboard.press("Enter")
    await expect.poll(() => label.textContent()).toBe(TYPED_LABEL)
  })

  it("saves what was added and typed, and shows it after a reload", async () => {
    await barButton(page, "Save").click()
    await expectVisible(toast(page, /saved/i), "a toast confirms the save")
    await expect
      .poll(async () => {
        const [, a, b] = await saved()
        return {
          a: a!.children!.map((child) => child.blockType),
          text: JSON.stringify(a!.children![0]!.content).includes(TYPED_TEXT),
          label: a!.children![1]!.link?.label,
          c: b!.children![1]!.children!.map((child) => child.blockType),
        }
      })
      .toEqual({
        a: ["richText", "button", "button"],
        text: true,
        label: TYPED_LABEL,
        c: ["button"],
      })

    await openEditor(page, editorUrl.page(doc.id))
    await expectVisible(
      frame(ids.text!).getByText(TYPED_TEXT),
      "the Rich text after a reload"
    )
    await expectVisible(
      frame(ids.more!).getByText(TYPED_LABEL),
      "the Button label after a reload"
    )
  })
})
