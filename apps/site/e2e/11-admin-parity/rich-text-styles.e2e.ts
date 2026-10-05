import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Doc } from "../3-layouts/support/api"
import {
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import {
  barButton,
  canvas,
  deleteCreatedSince,
  discard,
  editingInPlace,
  editorUrl,
  expectVisible,
  getDoc,
  runPath,
  toast,
  topBar,
  visibleInEditor,
} from "../5-visual-editor/support/editor"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import { openEditorNow } from "./support/open"

/**
 * The "Text style" select in a Rich text Block's toolbar (Paragraph, Heading
 * 2 to 4, Quote).
 *
 * - The toolbar's first item is the select; on a plain line it reads
 *   Paragraph and offers exactly Paragraph, Heading 2, Heading 3, Heading 4
 *   and Quote.
 * - Choosing a style changes the line in the canvas: a heading, a quote, and
 *   back to a paragraph.
 * - A line that is a Heading 5 keeps showing it, in a disabled option, and
 *   stays a Heading 5.
 * - Saved and published, the Site shows the headings and the quote, and the
 *   Draft holds them as heading, quote and paragraph nodes.
 */

const RUN = Date.now().toString(36)
const STARTED = new Date().toISOString()
const PATH = runPath("rich-text")

const OPENING = `Opening line ${RUN}`
const QUOTED = `Quoted line ${RUN}`
const BODY = `Body line ${RUN}`
const SMALL = `Small heading ${RUN}`

let h: Harness
let doc: Doc

const text = (value: string) => ({
  type: "text",
  version: 1,
  text: value,
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
})

const line = (value: string, type = "paragraph", extra = {}) => ({
  type,
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  children: [text(value)],
  ...extra,
})

const richText = (children: unknown[]) => ({
  root: {
    type: "root",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    children,
  },
})

const styleSelect = (page: Page) =>
  visibleInEditor(page, (root) =>
    root.getByRole("combobox", { name: "Text style" })
  )

/** Puts the caret in the canvas line that has `words`, editing in place. */
async function clickInto(page: Page, selector: string, words: string) {
  const target = canvas(page).locator(selector, { hasText: words }).first()
  await target.click()
  if (!(await editingInPlace(page))) await target.click()
  expect(await editingInPlace(page), `"${words}" is editable in place`).toBe(
    true
  )
}

/** Moves focus to the toolbar's first item, the select, with the keyboard. */
async function openStyle(page: Page) {
  await page.keyboard.press("Alt+F10")
  const select = await styleSelect(page)
  expect(
    await select.evaluate((el) => el === el.ownerDocument.activeElement),
    "Alt+F10 focuses the Text style select"
  ).toBe(true)
  return select
}

beforeAll(async () => {
  h = await openHarness()
  const made = await h.user.context.request.post(
    `${ORIGIN}/api/pages?draft=false`,
    {
      data: {
        title: `Rich text ${RUN}`,
        path: PATH,
        _status: "published",
        blocks: [
          {
            blockType: "richText",
            content: richText([
              line(OPENING),
              line(QUOTED),
              line(BODY),
              line(SMALL, "heading", { tag: "h5" }),
            ]),
          },
        ],
      },
    }
  )
  expect(made.ok(), await made.text()).toBe(true)
  doc = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", doc.id)
})

afterAll(async () => {
  if (h) {
    await discard(h.user.page).catch(() => undefined)
    await deleteCreatedSince(h.user.context.request, STARTED)
  }
  await closeHarness(h)
})

describe("the Text style select", () => {
  it("is the toolbar's first item, offering Paragraph, Heading 2 to 4 and Quote", async () => {
    const { page } = h.user
    await openEditorNow(page, editorUrl.page(doc.id))
    await clickInto(page, "main p", OPENING)
    const toolbar = await visibleInEditor(page, (root) =>
      root.getByRole("toolbar", { name: "Text formatting" })
    )
    const first = toolbar.locator("button, select").first()
    expect(await first.getAttribute("aria-label")).toBe("Text style")

    const select = await openStyle(page)
    expect(await select.inputValue()).toBe("paragraph")
    expect(await select.locator("option").allTextContents()).toEqual([
      "Paragraph",
      "Heading 2",
      "Heading 3",
      "Heading 4",
      "Quote",
    ])
  })

  it("changes a line to a heading, a quote, and back to a paragraph", async () => {
    const { page } = h.user
    let select = await openStyle(page)
    await select.selectOption("h2")
    await expectVisible(
      canvas(page).locator("main h2", { hasText: OPENING }),
      "the opening line is a Heading 2"
    )

    await clickInto(page, "main p", QUOTED)
    select = await openStyle(page)
    await select.selectOption("quote")
    await expectVisible(
      canvas(page).locator("main blockquote", { hasText: QUOTED }),
      "the quoted line is a Quote"
    )

    await clickInto(page, "main p", BODY)
    select = await openStyle(page)
    await select.selectOption("h3")
    await expectVisible(
      canvas(page).locator("main h3", { hasText: BODY }),
      "the body line is a Heading 3"
    )
    await clickInto(page, "main h3", BODY)
    select = await openStyle(page)
    expect(await select.inputValue()).toBe("h3")
    await select.selectOption("paragraph")
    await expectVisible(
      canvas(page).locator("main p", { hasText: BODY }),
      "the body line is a paragraph again"
    )
    expect(await canvas(page).locator("main h3").count()).toBe(0)
  })

  it("shows a Heading 5 as a disabled option, and leaves it a Heading 5", async () => {
    const { page } = h.user
    await clickInto(page, "main h5", SMALL)
    const select = await openStyle(page)
    expect(await select.inputValue()).toBe("h5")
    const option = select.locator("option", { hasText: "Heading 5" })
    expect(await option.count()).toBe(1)
    expect(await option.isDisabled()).toBe(true)
    expect(
      await canvas(page).locator("main h5", { hasText: SMALL }).count()
    ).toBe(1)
  })

  it("saves and publishes: the Site shows the styles, and the Draft holds them", async () => {
    const { page } = h.user
    await clickInto(page, "main p", BODY)
    await page.keyboard.press("Control+s")
    await expectVisible(toast(page, /saved/i), "a toast confirms the save")
    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "the Published chip"
    )

    await visit(h.visitor.page, PATH)
    const site = h.visitor.page.locator("main")
    expect(await site.locator("h2", { hasText: OPENING }).count()).toBe(1)
    expect(await site.locator("blockquote", { hasText: QUOTED }).count()).toBe(
      1
    )
    expect(await site.locator("h5", { hasText: SMALL }).count()).toBe(1)

    const saved = await getDoc(h.user.context.request, "pages", doc.id)
    const content = (
      saved.blocks as {
        content: { root: { children: Record<string, unknown>[] } }
      }[]
    )[0]!.content
    expect(
      content.root.children.map((node) =>
        node.type === "heading" ? `heading:${String(node.tag)}` : node.type
      )
    ).toEqual(["heading:h2", "quote", "paragraph", "heading:h5"])
  })
})
