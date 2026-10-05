import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import {
  deleteCreatedSince,
  getDoc,
  type Doc,
  pageAt,
  toast,
} from "../5-visual-editor/support/editor"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Duplicating a Page, from its row in the Pages list.
 *
 * - Duplicate adds a Draft copy called "<title> (copy)" at the next free path,
 *   says so in a toast, and stays on the list. The copy has the same Blocks;
 *   the Page it came from is as it was, and a visitor can't see the copy.
 * - Duplicating again takes the next free path after that.
 * - A copy of a Page Template is a Page, not a Page Template.
 * - The list passes WCAG 2.2 AA.
 */

const RUN = Date.now().toString(36)
const STARTED = new Date().toISOString()
const TITLE = `Dup ${RUN}`
const PATH = `/e2e-dup-${RUN}`
const TEMPLATE = `Dup template ${RUN}`
const BLOCKS = [
  { blockType: "hero", heading: `Dup hero ${RUN}` },
  {
    blockType: "button",
    link: { label: "Book", href: "/book" },
    style: "primary",
    align: "start",
  },
]

let h: Harness
let original: Doc
let template: Doc

const blockTypes = (doc: Doc) =>
  (doc.blocks as { blockType: string }[]).map((block) => block.blockType)

const rowFor = (page: Page, title: string) =>
  page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: title, exact: true }) })

async function duplicateFrom(page: Page, search: string, title: string) {
  await visit(page, `/admin/pages?q=${encodeURIComponent(search)}`)
  await rowFor(page, title)
    .getByRole("button", { name: `Duplicate ${title}`, exact: true })
    .click()
}

beforeAll(async () => {
  h = await openHarness()
  const request = h.user.context.request
  const made = await request.post(`${ORIGIN}/api/pages?draft=false`, {
    data: { title: TITLE, path: PATH, _status: "published", blocks: BLOCKS },
  })
  expect(made.ok(), await made.text()).toBe(true)
  original = ((await made.json()) as { doc: Doc }).doc
  const madeTemplate = await request.post(`${ORIGIN}/api/pages?draft=true`, {
    data: {
      title: TEMPLATE,
      path: `/e2e-dup-template-${RUN}`,
      isTemplate: true,
      _status: "draft",
      blocks: BLOCKS,
    },
  })
  expect(madeTemplate.ok(), await madeTemplate.text()).toBe(true)
  template = ((await madeTemplate.json()) as { doc: Doc }).doc
})

afterAll(async () => {
  if (h) await deleteCreatedSince(h.user.context.request, STARTED)
  await closeHarness(h)
})

describe("duplicating a Page", () => {
  it("adds a Draft copy at the next free path, and leaves the original as it was", async () => {
    const { page } = h.user
    await duplicateFrom(page, TITLE, TITLE)
    await toast(
      page,
      new RegExp(`Duplicated as “${TITLE} \\(copy\\)” at ${PATH}-2\\.`)
    ).waitFor()
    expect(new URL(page.url()).pathname).toBe("/admin/pages")

    const copyRow = rowFor(page, `${TITLE} (copy)`)
    await copyRow.waitFor()
    expect(await copyRow.textContent()).toContain("Draft")

    const copy = await pageAt(h.user.context.request, `${PATH}-2`)
    expect(copy).toMatchObject({
      title: `${TITLE} (copy)`,
      _status: "draft",
      isTemplate: false,
    })
    expect(blockTypes(copy!)).toEqual(["hero", "button"])

    const same = await h.api.getPage(Number(original.id))
    expect(same).toMatchObject({ title: TITLE, path: PATH })
    expect(same?._status).toBe("published")
    expect(blockTypes(same!)).toEqual(["hero", "button"])

    const response = await visit(h.visitor.page, `${PATH}-2`)
    expect(response?.status(), "the Draft copy is not on the Site").toBe(404)
  })

  it("takes the next free path when the Page is duplicated again", async () => {
    const { page } = h.user
    await duplicateFrom(page, TITLE, TITLE)
    await toast(page, new RegExp(`at ${PATH}-3\\.`)).waitFor()
    const copy = await pageAt(h.user.context.request, `${PATH}-3`)
    expect(copy).toMatchObject({ title: `${TITLE} (copy)`, _status: "draft" })
  })

  it("makes a Page, not a Page Template, from a Page Template", async () => {
    const { page } = h.user
    await visit(page, `/admin/pages?q=${encodeURIComponent(TEMPLATE)}`)
    const source = page
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: TEMPLATE }) })
    expect(await source.textContent()).toContain("Page Template")
    await source
      .getByRole("button", { name: `Duplicate ${TEMPLATE}`, exact: true })
      .click()
    await toast(
      page,
      new RegExp(`Duplicated as “${TEMPLATE} \\(copy\\)”`)
    ).waitFor()

    const copyRow = rowFor(page, `${TEMPLATE} (copy)`)
    await copyRow.waitFor()
    expect(await copyRow.textContent()).not.toContain("Page Template")
    const copy = await pageAt(
      h.user.context.request,
      `/e2e-dup-template-${RUN}-2`
    )
    expect(copy).toBeDefined()
    expect(
      (await getDoc(h.user.context.request, "pages", copy!.id)).isTemplate
    ).toBe(false)
    // The Page Template it came from is still one.
    expect(
      (await getDoc(h.user.context.request, "pages", template.id)).isTemplate
    ).toBe(true)
  })

  it("passes WCAG 2.2 AA", async () => {
    const { page } = h.user
    await visit(page, `/admin/pages?q=${encodeURIComponent(TITLE)}`)
    expect(await accessibilityProblems(page)).toBe("")
  })
})
