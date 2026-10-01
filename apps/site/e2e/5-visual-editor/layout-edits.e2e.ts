import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { compareImages } from "../theme/images"
import {
  launchBrowser,
  openSession,
  screenshot,
  signIn,
  visit,
  type Session,
} from "../theme/support/browser"
import {
  EDITOR_ROUTE,
  FOOTER_BLOCKS,
  HEADER_BLOCKS,
  RUN,
  addBlock,
  addBlockButtons,
  anyVisibleInEditor,
  barButton,
  blockPicker,
  canvas,
  control,
  createPage,
  deleteCreatedSince,
  editingInPlace,
  editorUrl,
  expectNoAxeViolations,
  expectVisible,
  firstTextField,
  layoutNamed,
  modeChip,
  openEditor,
  openTab,
  outlineTree,
  pickLayout,
  pickerOption,
  runPath,
  toast,
  topBar,
  type Doc,
} from "./support/editor"

/**
 * Phase 5 acceptance: "Layout edits: edit a Layout, and every Page using it
 * changes on save. Restore works." (ADR-0006), with the spec's Layout mode:
 * the Page content is dimmed and locked, Save is live at once and says how
 * far it reaches, the panel has History, and the Block picker in a Header or
 * Footer offers only the Blocks allowed there.
 *
 * Page A makes a new Layout from its current one (and switches to it); Page B
 * picks the same Layout; Page C stays on the default. The Layout gets a
 * Utility strip in its Header and is saved: A and B show it at once, C does
 * not. Restoring the previous version from History puts A back exactly
 * (compared pixel for pixel) and takes the strip off B.
 */

const STARTED = new Date().toISOString()
const LAYOUT_NAME = `Acceptance Layout ${RUN}`
const STRIP = `Summer offers ${RUN}`

const PAGES = {
  a: { title: `Layout A ${RUN}`, path: runPath("layout-a") },
  b: { title: `Layout B ${RUN}`, path: runPath("layout-b") },
  c: { title: `Layout C ${RUN}`, path: runPath("layout-c") },
}

let browser: Browser
let admin: Session
let visitor: Session
let page: Page
const docs: Partial<Record<keyof typeof PAGES, Doc>> = {}
let layout: Doc | undefined
let beforeEdit: Buffer

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  visitor = await openSession(browser)
  page = admin.page
  await signIn(page)
  for (const key of ["a", "b", "c"] as const) {
    docs[key] = await createPage(admin.context.request, {
      ...PAGES[key],
      publish: true,
    })
  }
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/** The text of the Site's header at `path`, as a visitor sees it. */
async function siteHeaderText(path: string): Promise<string> {
  const response = await visit(visitor.page, path)
  expect(response?.status(), `the Site answers at ${path}`).toBe(200)
  return (await visitor.page.locator("header").first().textContent()) ?? ""
}

describe("editing a Layout that several Pages use", () => {
  it("makes a new Layout from Page A's current one, and switches A to it", async () => {
    await openEditor(page, editorUrl.page(docs.a!.id))
    // Some Page content, to see it dimmed in Layout mode later.
    await openTab(page, "Outline")
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Page").first(),
      "Hero"
    )
    const pageTab = await openTab(page, "Page")
    await control(pageTab, "Make a new Layout from this one").click()
    const ask = page.getByRole("dialog").or(page.getByRole("alertdialog"))
    await expectVisible(ask.first(), "a dialog asks for the new Layout's name")
    await ask.first().getByLabel(/name/i).fill(LAYOUT_NAME)
    await ask
      .first()
      .getByRole("button", { name: /make|create|duplicate|copy/i })
      .click()

    await expect
      .poll(
        async () => (await layoutNamed(admin.context.request, LAYOUT_NAME))?.id,
        {
          message: "the copy is saved under its new name",
          timeout: 15_000,
        }
      )
      .toBeDefined()
    layout = await layoutNamed(admin.context.request, LAYOUT_NAME)
    await expectVisible(
      (await openTab(page, "Page")).getByText(LAYOUT_NAME).first(),
      "the Page tab shows the Page now uses the copy"
    )
    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "A is published with its new Layout"
    )
  })

  it("lets Page B pick the same Layout in its Page tab", async () => {
    await openEditor(page, editorUrl.page(docs.b!.id))
    const pageTab = await openTab(page, "Page")
    await pickLayout(page, pageTab, LAYOUT_NAME)
    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "B is published with the Layout"
    )
  })

  it("opens the Layout from Page A with Edit Layout, in Layout mode: Used by 2 Pages, Save goes live on 2 Pages", async () => {
    await openEditor(page, editorUrl.page(docs.a!.id))
    await control(page, "Edit Layout").click()
    await page.waitForURL((url) => EDITOR_ROUTE.layout.test(url.pathname))
    expect(page.url()).toContain(`/admin/layouts/${layout!.id}`)
    await expectVisible(modeChip(page, "Layout"), "the Layout mode chip")
    await expectVisible(
      topBar(page).getByText(LAYOUT_NAME, { exact: true }),
      "the Layout's name"
    )
    await expectVisible(
      topBar(page).getByText(/Used by 2 Pages/),
      "Used by 2 Pages"
    )
    await expectVisible(
      topBar(page).getByText(/Goes live on 2 Pages/),
      "Goes live on 2 Pages"
    )
    await expectNoAxeViolations(page, "Layout mode")
  })

  it("dims the Page content and locks it", async () => {
    const main = canvas(page).locator("main").first()
    const dimmed = await main.evaluate((el) => {
      let opacity = 1
      let filtered = false
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        opacity *= Number(style.opacity)
        if (style.filter !== "none") filtered = true
      }
      // Or an overlay drawn over it.
      const box = el.getBoundingClientRect()
      const top = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + Math.min(box.height / 2, 200)
      )
      const covered = top !== null && !el.contains(top)
      return opacity < 1 || filtered || covered
    })
    expect(dimmed, "the Page content is dimmed").toBe(true)

    await main.click({ position: { x: 20, y: 20 }, force: true })
    expect(
      await anyVisibleInEditor(page, (root) =>
        root.getByRole("button", { name: "Duplicate", exact: true })
      ),
      "Page Blocks can't be selected in Layout mode"
    ).toBe(false)
    expect(await editingInPlace(page), "nor edited in place").toBe(false)
  })

  it("offers only Header Blocks in the Header", async () => {
    await openTab(page, "Outline")
    await addBlockButtons(outlineTree(page), "Header").first().click()
    const picker = blockPicker(page)
    await expectVisible(picker, "the Block picker")
    for (const name of HEADER_BLOCKS)
      expect(await pickerOption(picker, name).count(), `offers ${name}`).toBe(1)
    for (const name of ["Hero", "FAQ", "Footer columns", "Legal bar"])
      expect(
        await pickerOption(picker, name).count(),
        `leaves out ${name}`
      ).toBe(0)
    await expectNoAxeViolations(page, "the Header's Block picker", {
      includeCanvas: false,
    })
    await page.keyboard.press("Escape")
  })

  it("offers only Footer Blocks, Newsletter and Call to action in the Footer", async () => {
    await addBlockButtons(outlineTree(page), "Footer").first().click()
    const picker = blockPicker(page)
    await expectVisible(picker, "the Block picker")
    for (const name of FOOTER_BLOCKS)
      expect(await pickerOption(picker, name).count(), `offers ${name}`).toBe(1)
    for (const name of ["Hero", "FAQ", "Navigation", "Utility strip"])
      expect(
        await pickerOption(picker, name).count(),
        `leaves out ${name}`
      ).toBe(0)
    await page.keyboard.press("Escape")
  })

  it("saves the Header, and every Page using the Layout changes at once", async () => {
    // A as it looks before the edit, to compare after Restore.
    await visit(visitor.page, PAGES.a.path)
    beforeEdit = await screenshot(visitor.page)
    expect(await siteHeaderText(PAGES.a.path)).not.toContain(STRIP)

    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Header").first(),
      "Utility strip"
    )
    const blockTab = await openTab(page, "Block")
    await firstTextField(blockTab).fill(STRIP)
    await expectVisible(
      canvas(page).locator("header").getByText(STRIP).first(),
      "the strip in the canvas's Header"
    )

    await barButton(page, /^Save\b/).click()
    await expectVisible(toast(page, /saved/i), "a toast confirms the save")

    expect(await siteHeaderText(PAGES.a.path), "Page A").toContain(STRIP)
    expect(await siteHeaderText(PAGES.b.path), "Page B").toContain(STRIP)
    expect(
      await siteHeaderText(PAGES.c.path),
      "Page C, on the default Layout"
    ).not.toContain(STRIP)
  })

  it("lists every save in History, and Restore puts every Page back", async () => {
    const history = await openTab(page, "History")
    const versions = history.getByRole("listitem")
    await expect.poll(() => versions.count()).toBeGreaterThanOrEqual(2)
    await expectNoAxeViolations(page, "the Layout's History", {
      includeCanvas: false,
    })

    // The newest is live; restore the one before it.
    await versions
      .nth(1)
      .getByRole("button", { name: /Restore/ })
      .click()
    const confirm = page.getByRole("alertdialog")
    await expectVisible(confirm, "Restore asks first")
    await confirm.getByRole("button", { name: /Restore/ }).click()
    await expectVisible(toast(page, /restored|saved/i), "a toast confirms it")

    await expect
      .poll(() => siteHeaderText(PAGES.a.path), { timeout: 15_000 })
      .not.toContain(STRIP)
    expect(await siteHeaderText(PAGES.b.path)).not.toContain(STRIP)

    await visit(visitor.page, PAGES.a.path)
    const restored = await screenshot(visitor.page)
    const result = compareImages(beforeEdit, restored)
    expect(result.sameSize, "Page A: same size as before the edit").toBe(true)
    expect(result.differentPixels, "Page A: pixels that differ").toBe(0)

    // Restoring saves a new version: History only grows.
    await expect.poll(() => versions.count()).toBeGreaterThanOrEqual(3)
  })
})
