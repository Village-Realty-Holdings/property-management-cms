import type { Locator, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Doc } from "../3-layouts/support/api"
import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import {
  barButton,
  canvas,
  canvasFrame,
  control,
  createPage,
  deleteCreatedSince,
  expectVisible,
  openTab,
  pageAt,
  RUN,
  runPath,
  toast,
} from "../5-visual-editor/support/editor"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * The New Page dialog: it asks for the Title and the Path before the Visual
 * Editor opens.
 *
 * - It opens from the Pages list, the Dashboard and a Page Template's row,
 *   as "New Page", with "Start from" on Blank Page (or that Page Template).
 * - The Path follows the Title until it is edited by hand.
 * - The Path's shape is checked as it is typed; an empty Title and a Path
 *   another Page uses are refused on Continue, with focus on the field.
 * - Continue opens the Visual Editor with that Title and Path, and nothing is
 *   created until the first Save.
 * - The route checks what the address says again: a taken path or an empty
 *   title falls back to a free path or "Untitled Page".
 * - The dialog passes WCAG 2.2 AA.
 */

const STARTED = new Date().toISOString()
const LOWER = RUN.toLowerCase()
const TAKEN = runPath("taken")
const TEMPLATE_NAME = `Template ${RUN}`
const TEMPLATE_HEADING = `From template ${RUN}`

let h: Harness
let template: Doc

const titleOf = (dialog: Locator) => dialog.getByLabel("Title", { exact: true })
const pathOf = (dialog: Locator) => dialog.getByLabel("Path", { exact: true })

async function openDialog(page: Page, from = "/admin/pages"): Promise<Locator> {
  await visit(page, from)
  await control(page, "New Page").click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("heading", { name: "New Page" }).waitFor()
  return dialog
}

const isFocused = (field: Locator) =>
  field.evaluate((el) => el === document.activeElement)

/** The Title and Path the editor opened on, read from its Page tab. */
async function pageTabValues(page: Page) {
  const tab = await openTab(page, "Page")
  return {
    title: await tab.getByLabel("Title", { exact: true }).inputValue(),
    path: await tab.getByLabel("Path", { exact: true }).inputValue(),
  }
}

beforeAll(async () => {
  h = await openHarness()
  const request = h.user.context.request
  await createPage(request, {
    title: `Taken ${RUN}`,
    path: TAKEN,
    publish: true,
  })
  const made = await request.post(`${ORIGIN}/api/pages?draft=true`, {
    data: {
      title: TEMPLATE_NAME,
      path: runPath("template"),
      isTemplate: true,
      _status: "draft",
      blocks: [{ blockType: "hero", heading: TEMPLATE_HEADING }],
    },
  })
  expect(made.ok(), await made.text()).toBe(true)
  template = ((await made.json()) as { doc: Doc }).doc
})

afterAll(async () => {
  if (h) await deleteCreatedSince(h.user.context.request, STARTED)
  await closeHarness(h)
})

describe("the New Page dialog", () => {
  it("opens on Blank Page, with its description, and passes WCAG 2.2 AA", async () => {
    const { page } = h.user
    const dialog = await openDialog(page)
    await dialog
      .getByText(
        "Name the Page and choose where it lives. It is not created until you save it."
      )
      .waitFor()
    const startFrom = dialog.getByLabel("Start from", { exact: true })
    expect(
      await startFrom.evaluate(
        (el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent
      )
    ).toBe("Blank Page")
    await dialog.getByText("A Hero, ready to fill in.").waitFor()
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("makes the Path follow the Title until the Path is edited by hand", async () => {
    const { page } = h.user
    const dialog = await openDialog(page)
    await titleOf(dialog).fill(`Garden Rooms ${RUN}`)
    expect(await pathOf(dialog).inputValue()).toBe(`/garden-rooms-${LOWER}`)

    await pathOf(dialog).fill(`/garden-${LOWER}`)
    await titleOf(dialog).fill(`Garden Rooms ${RUN} again`)
    expect(await pathOf(dialog).inputValue()).toBe(`/garden-${LOWER}`)
  })

  it("checks the Path's shape as it is typed, and asks for a Title", async () => {
    const { page } = h.user
    const dialog = await openDialog(page)
    await pathOf(dialog).fill("about us")
    await dialog.getByText('The path must start with "/".').waitFor()
    await pathOf(dialog).fill("/About us")
    await dialog
      .getByText(
        'Use lower-case letters, numbers and hyphens, like "/about" or "/company/team".'
      )
      .waitFor()

    await control(dialog, "Continue").click()
    await dialog.getByText("A title is required.").waitFor()
    expect(await isFocused(titleOf(dialog))).toBe(true)
    expect(new URL(page.url()).pathname).toBe("/admin/pages")
  })

  it("refuses a Path another Page uses, with focus on the Path", async () => {
    const { page } = h.user
    const dialog = await openDialog(page)
    await titleOf(dialog).fill(`Clash ${RUN}`)
    await pathOf(dialog).fill(TAKEN)
    await control(dialog, "Continue").click()
    await dialog.getByText("Another Page uses this path.").waitFor()
    await expect.poll(() => isFocused(pathOf(dialog))).toBe(true)
    expect(new URL(page.url()).pathname).toBe("/admin/pages")
    expect(await dialog.isVisible()).toBe(true)
  })

  it("opens the Visual Editor with the Title and Path, and creates the Page on its first Save", async () => {
    const { page } = h.user
    const request = h.user.context.request
    const path = runPath("garden")
    const dialog = await openDialog(page)
    await titleOf(dialog).fill(`Garden Rooms ${RUN}`)
    await pathOf(dialog).fill(path)
    await control(dialog, "Continue").click()
    await page.waitForURL((url) => url.pathname === "/admin/pages/new")
    const params = new URL(page.url()).searchParams
    expect(params.get("title")).toBe(`Garden Rooms ${RUN}`)
    expect(params.get("path")).toBe(path)
    await canvasFrame(page)

    expect(await pageTabValues(page)).toEqual({
      title: `Garden Rooms ${RUN}`,
      path,
    })
    expect(await pageAt(request, path), "nothing is created yet").toBe(
      undefined
    )

    await barButton(page, "Save").click()
    await toast(page, /Draft saved/).waitFor()
    await page.waitForURL(/\/admin\/pages\/\d+$/)
    expect(await pageAt(request, path)).toMatchObject({
      title: `Garden Rooms ${RUN}`,
      _status: "draft",
    })
  })

  it("checks the address again when the route is opened directly", async () => {
    const { page } = h.user
    const request = h.user.context.request
    const base = "/admin/pages/new"

    await visit(page, `${base}?title=&path=${TAKEN}`)
    await canvasFrame(page)
    const empty = await pageTabValues(page)
    expect(empty.title).toBe("Untitled Page")
    expect(empty.path).toMatch(/^\/untitled-page(-\d+)?$/)
    expect(empty.path).not.toBe(TAKEN)

    const harbour = `Harbour ${RUN}`
    await visit(
      page,
      `${base}?title=${encodeURIComponent(harbour)}&path=${TAKEN}`
    )
    await canvasFrame(page)
    expect(await pageTabValues(page)).toEqual({
      title: harbour,
      path: `/harbour-${LOWER}`,
    })

    await visit(page, "/admin/pages")
    expect(await pageAt(request, `/harbour-${LOWER}`)).toBe(undefined)
    expect(await pageAt(request, empty.path)).toBe(undefined)
  })

  it("is the same dialog from the Dashboard", async () => {
    const dialog = await openDialog(h.user.page, "/admin")
    await dialog
      .getByText(
        "Name the Page and choose where it lives. It is not created until you save it."
      )
      .waitFor()
  })

  it("starts on a Page Template from its row, and opens the editor with that template", async () => {
    const { page } = h.user
    await visit(page, "/admin/pages/templates")
    await page
      .getByRole("button", { name: `New Page from ${TEMPLATE_NAME}` })
      .click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("heading", { name: "New Page" }).waitFor()
    expect(
      await dialog.getByLabel("Start from", { exact: true }).inputValue()
    ).toBe(String(template.id))
    await dialog
      .getByText("A copy of the Page Template's Blocks and Layout choice.")
      .waitFor()

    await titleOf(dialog).fill(`From a template ${RUN}`)
    await pathOf(dialog).fill(runPath("from-template"))
    await control(dialog, "Continue").click()
    await page.waitForURL((url) => url.pathname === "/admin/pages/new")
    expect(new URL(page.url()).searchParams.get("template")).toBe(
      String(template.id)
    )
    await canvasFrame(page)
    await expectVisible(
      canvas(page).getByRole("heading", { name: TEMPLATE_HEADING }),
      "the Page Template's Hero in the canvas"
    )
  })
})
