import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  signIn,
  visit,
  type Session,
} from "../theme/support/browser"
import {
  EDITOR_ROUTE,
  HEADER_ONLY_BLOCKS,
  PAGE_BLOCKS,
  RUN,
  addBlock,
  addBlockButtons,
  anyVisibleInEditor,
  barButton,
  blockPicker,
  blockToolbarButton,
  canvas,
  canvasMainText,
  control,
  createPage,
  deleteCreatedSince,
  discard,
  drag,
  editingInPlace,
  editorUrl,
  expectHidden,
  expectNoAxeViolations,
  expectVisible,
  inOrder,
  labelOverCanvas,
  modeChip,
  openEditor,
  openTab,
  outlineItems,
  outlineTree,
  panelTab,
  pickerOption,
  runPath,
  searchField,
  toast,
  topBar,
  visibleInEditor,
  type Doc,
} from "./support/editor"

/**
 * Phase 5 acceptance: "Page edits: add, edit and reorder Blocks on a Page,
 * publish it, and the Site matches", with the editing rules of the spec's
 * "Editing" and "Page mode" sections and the keyboard shortcuts.
 *
 * One Draft Page is built up step by step, as a User would: Blocks are
 * added from the picker ("+" in the Outline), edited in the Block tab and in
 * place (plain text, and rich text with its floating toolbar), moved,
 * duplicated, deleted and brought back with Undo, dragged in the Outline, and
 * saved with Ctrl-S. It is then published, and the visitor's Site must show
 * the same Blocks, in the same order, with the same text. A later edit shows
 * "Changes not published" until it is published too.
 */

const STARTED = new Date().toISOString()
const TITLE = `Visual Editor edits ${RUN}`
const PATH = runPath("edits")
const NEW_PATH = runPath("edits-moved")
const NEW_TITLE = `Edited in place ${RUN}`
const HERO = `Welcome aboard ${RUN}`
const HERO_AGAIN = `Welcome back ${RUN}`
const CTA_DRAFT = `Stay a while ${RUN}`
const CTA = `Book your stay ${RUN}`
const RICH = `Plain words ${RUN} then bold`
const SEO_DESCRIPTION = `A Page built in the Visual Editor (${RUN}).`

let browser: Browser
let admin: Session
let visitor: Session
let page: Page
let doc: Doc

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  visitor = await openSession(browser)
  page = admin.page
  await signIn(page)
  doc = await createPage(admin.context.request, {
    title: TITLE,
    path: PATH,
    publish: false,
  })
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/** The Outline's Page Blocks, in order, by the names in the tree. */
async function outlineOrder(): Promise<string> {
  return (await outlineTree(page).getByRole("treeitem").allTextContents()).join(
    " | "
  )
}

/** Selects a Block by its item in the Outline and opens the Block tab. */
async function selectInOutline(name: string, nth = 0) {
  // The Block tab is open after the last selection: go back to the Outline.
  await openTab(page, "Outline")
  await outlineItems(page, name).nth(nth).click()
  await expect
    .poll(() => panelTab(page, "Block").getAttribute("aria-selected"), {
      message: `selecting the ${name} Block opens the Block tab`,
      timeout: 5_000,
    })
    .toBe("true")
  return page.getByRole("tabpanel", { name: "Block", exact: true })
}

/** The Site's main content as a visitor sees it at `path`. */
async function siteMainText(path: string): Promise<string> {
  const response = await visit(visitor.page, path)
  expect(response?.status(), `the Site answers at ${path}`).toBe(200)
  return (await visitor.page.locator("main").first().textContent()) ?? ""
}

describe("editing a Page in the Visual Editor", () => {
  it("opens the new Page as a Draft, in Page mode", async () => {
    await openEditor(page, editorUrl.page(doc.id))
    await expectVisible(modeChip(page, "Page"), "the Page mode chip")
    await expectVisible(
      topBar(page).getByText("Draft", { exact: true }),
      "the Draft status chip"
    )
    await openTab(page, "Outline")
    for (const group of ["Header", "Page", "Footer"]) {
      await expectVisible(
        outlineTree(page).getByText(group, { exact: true }).first(),
        `the Outline's ${group} group`
      )
    }
  })

  it("adds Blocks with + in the Outline, from a searchable, grouped picker with thumbnails", async () => {
    await addBlockButtons(outlineTree(page), "Page").first().click()
    const picker = blockPicker(page)
    await expectVisible(picker, "the Block picker")

    // Every Page Block is offered, and no Header-only Block is.
    for (const name of PAGE_BLOCKS) {
      expect(
        await pickerOption(picker, name).count(),
        `the picker offers ${name}`
      ).toBe(1)
    }
    for (const name of HEADER_ONLY_BLOCKS) {
      expect(
        await pickerOption(picker, name).count(),
        `the picker leaves out the Header Block ${name}`
      ).toBe(0)
    }

    // Grouped: named groups, or a heading per group under the dialog's own.
    const groups = await picker.getByRole("group").count()
    const headings = (await picker.getByRole("heading").count()) - 1
    expect(Math.max(groups, headings), "the picker is grouped").toBeGreaterThan(
      1
    )

    // Each entry has a thumbnail.
    for (const name of ["Hero", "Call to action", "Rich text", "FAQ"]) {
      expect(
        await pickerOption(picker, name).locator("img").count(),
        `${name} has a thumbnail`
      ).toBeGreaterThan(0)
    }

    await expectNoAxeViolations(page, "the Block picker", {
      includeCanvas: false,
    })

    // Searchable.
    await searchField(picker).fill("call")
    await expectVisible(
      pickerOption(picker, "Call to action"),
      "Call to action matches the search"
    )
    await expectHidden(pickerOption(picker, "Hero"), "Hero does not match")
    await searchField(picker).fill("")

    await pickerOption(picker, "Hero").click()
    await expectHidden(picker, "the picker closes once a Block is chosen")
    await expect.poll(() => outlineItems(page, "Hero").count()).toBe(1)

    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Page").last(),
      "Call to action"
    )
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Page").last(),
      "Rich text"
    )
    expect(
      inOrder(await outlineOrder(), ["Hero", "Call to action", "Rich text"]),
      "the Blocks are added in order"
    ).toBe(true)
  })

  it("edits a Block's settings in the Block tab, and the canvas follows", async () => {
    const heroTab = await selectInOutline("Hero")
    await heroTab.getByLabel("Heading", { exact: true }).fill(HERO)
    await expectVisible(
      canvas(page).getByRole("heading", { name: HERO }),
      "the Hero's new heading in the canvas"
    )

    const ctaTab = await selectInOutline("Call to action")
    await ctaTab.getByLabel("Heading", { exact: true }).fill(CTA_DRAFT)
    await expectVisible(
      canvas(page).getByRole("heading", { name: CTA_DRAFT }),
      "the Call to action's heading in the canvas"
    )
  })

  it("selects a Block by clicking it in the canvas", async () => {
    await canvas(page).getByRole("heading", { name: HERO }).click()
    await expect
      .poll(() => panelTab(page, "Block").getAttribute("aria-selected"))
      .toBe("true")
    await expect
      .poll(() =>
        page
          .getByRole("tabpanel", { name: "Block", exact: true })
          .getByLabel("Heading", { exact: true })
          .inputValue()
      )
      .toBe(HERO)
  })

  it("outlines and labels a Block when the pointer is over it", async () => {
    // Away from the canvas first: no label for the Call to action yet.
    await topBar(page).hover()
    expect(await labelOverCanvas(page, "Call to action")).toBe(false)
    await canvas(page)
      .getByRole("heading", { name: CTA_DRAFT })
      .hover({ position: { x: 2, y: 2 } })
    await expect
      .poll(() => labelOverCanvas(page, "Call to action"), {
        message: "hovering the Block labels it with its name",
        timeout: 5_000,
      })
      .toBe(true)
  })

  it("offers + between Blocks in the canvas, which opens the Block picker", async () => {
    await canvas(page).getByRole("heading", { name: CTA_DRAFT }).hover()
    const plus = canvas(page).getByRole("button", { name: /^Add (a )?Block/i })
    await expect
      .poll(
        async () => {
          for (const button of await plus.all())
            if (await button.isVisible()) return true
          return false
        },
        { message: "a + between Blocks in the canvas", timeout: 5_000 }
      )
      .toBe(true)
    const visible = (
      await Promise.all(
        (await plus.all()).map(async (b) => ((await b.isVisible()) ? b : null))
      )
    ).find(Boolean)
    await visible!.click()
    await expectVisible(blockPicker(page), "the Block picker")
    await page.keyboard.press("Escape")
    await expectHidden(blockPicker(page), "Esc closes the picker")
  })

  it("edits plain text in place", async () => {
    const heading = canvas(page).getByRole("heading", { name: CTA_DRAFT })
    await heading.click()
    await heading.click()
    expect(await editingInPlace(page), "the heading is editable in place").toBe(
      true
    )
    await page.keyboard.press("Control+a")
    await page.keyboard.type(CTA)
    await expectVisible(
      canvas(page).getByRole("heading", { name: CTA }),
      "the heading typed in place"
    )
    // The Block tab shows the same value: one Block, two ways to edit it.
    const ctaTab = await selectInOutline("Call to action")
    await expect
      .poll(() => ctaTab.getByLabel("Heading", { exact: true }).inputValue())
      .toBe(CTA)
  })

  it("edits rich text in place, with a floating toolbar: bold, italic, link, list", async () => {
    // The Rich text Block is the last section of the Page's content.
    const richText = canvas(page).locator("main section").last()
    await richText.click()
    await richText.click()
    expect(await editingInPlace(page), "rich text is editable in place").toBe(
      true
    )
    await page.keyboard.press("Control+a")
    await page.keyboard.type(RICH)
    for (let i = 0; i < "bold".length; i++)
      await page.keyboard.press("Shift+ArrowLeft")

    for (const name of [/^Bold$/i, /^Italic$/i, /Link/i, /List/i]) {
      await visibleInEditor(page, (root) => root.getByRole("button", { name }))
    }
    const bold = await visibleInEditor(page, (root) =>
      root.getByRole("button", { name: /^Bold$/i })
    )
    await bold.click()
    await expectVisible(
      richText.locator("strong, b").filter({ hasText: /^bold$/ }),
      "the selected word is bold"
    )
  })

  it("moves, duplicates and deletes the selected Block from its toolbar, and Undo / Redo bring changes back", async () => {
    await selectInOutline("Rich text")
    await (await blockToolbarButton(page, "Move up")).click()
    await expect
      .poll(async () => inOrder(await canvasMainText(page), [HERO, RICH, CTA]))
      .toBe(true)
    await (await blockToolbarButton(page, "Move down")).click()
    await expect
      .poll(async () => inOrder(await canvasMainText(page), [HERO, CTA, RICH]))
      .toBe(true)
    await (await blockToolbarButton(page, "Move up")).click()
    await expect
      .poll(async () => inOrder(await canvasMainText(page), [HERO, RICH, CTA]))
      .toBe(true)

    await selectInOutline("Call to action")
    await expectNoAxeViolations(page, "Page mode with a Block selected")
    await (await blockToolbarButton(page, "Duplicate")).click()
    // The Block tab is open: the Outline is where the Blocks are counted.
    await openTab(page, "Outline")
    await expect
      .poll(() => outlineItems(page, "Call to action").count())
      .toBe(2)

    await (await blockToolbarButton(page, "Delete")).click()
    await expect
      .poll(() => outlineItems(page, "Call to action").count())
      .toBe(1)

    // Delete is undoable: Undo in the top bar, then Redo with the keyboard.
    await barButton(page, "Undo").click()
    await expect
      .poll(() => outlineItems(page, "Call to action").count())
      .toBe(2)
    await page.keyboard.press("Control+Shift+z")
    await expect
      .poll(() => outlineItems(page, "Call to action").count())
      .toBe(1)
    await page.keyboard.press("Control+z")
    await expect
      .poll(() => outlineItems(page, "Call to action").count())
      .toBe(2)
    await barButton(page, "Redo").click()
    await expect
      .poll(() => outlineItems(page, "Call to action").count())
      .toBe(1)
    await expect
      .poll(async () => inOrder(await canvasMainText(page), [HERO, RICH, CTA]))
      .toBe(true)
  })

  it("reorders Blocks by dragging them in the Outline", async () => {
    await openTab(page, "Outline")
    await drag(
      page,
      outlineItems(page, "Call to action").first(),
      outlineItems(page, "Rich text").first()
    )
    await expect
      .poll(async () =>
        inOrder(await outlineOrder(), ["Hero", "Call to action", "Rich text"])
      )
      .toBe(true)
    await expect
      .poll(async () => inOrder(await canvasMainText(page), [HERO, CTA, RICH]))
      .toBe(true)
  })

  it("has the keyboard shortcuts: Esc deselects, Delete removes the Block, Ctrl-Z undoes", async () => {
    await selectInOutline("Rich text")
    await visibleInEditor(page, (root) =>
      root.getByRole("button", { name: "Duplicate", exact: true })
    )
    await page.keyboard.press("Escape")
    await expect
      .poll(
        () =>
          anyVisibleInEditor(page, (root) =>
            root.getByRole("button", { name: "Duplicate", exact: true })
          ),
        { message: "Esc deselects: the Block toolbar goes", timeout: 5_000 }
      )
      .toBe(false)

    await selectInOutline("Rich text")
    await page.keyboard.press("Delete")
    await openTab(page, "Outline")
    await expect.poll(() => outlineItems(page, "Rich text").count()).toBe(0)
    await page.keyboard.press("Control+z")
    await expect.poll(() => outlineItems(page, "Rich text").count()).toBe(1)
    await expect
      .poll(async () => inOrder(await canvasMainText(page), [HERO, CTA, RICH]))
      .toBe(true)
  })

  it("saves the Draft with Ctrl-S; visitors still see nothing", async () => {
    await page.keyboard.press("Control+s")
    await expectVisible(toast(page, /saved/i), "a toast confirms the save")
    await expectVisible(
      topBar(page).getByText("Draft", { exact: true }),
      "the Page is still a Draft"
    )
    const response = await visit(visitor.page, PATH)
    expect(response?.status(), "a Draft is not on the Site").toBe(404)
  })

  it("publishes, and the Site matches: the same Blocks, in the same order, with the same text", async () => {
    await barButton(page, "Publish").click()
    await expectVisible(toast(page, /publish/i), "a toast confirms publishing")
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "the Published chip"
    )
    const text = await siteMainText(PATH)
    expect(inOrder(text, [HERO, CTA, RICH]), `the Site shows: ${text}`).toBe(
      true
    )
    await expectVisible(
      visitor.page.locator("main strong, main b").filter({ hasText: /^bold$/ }),
      "the bold word on the Site"
    )
  })

  it("shows Changes not published after a save, until it is published", async () => {
    const heroTab = await selectInOutline("Hero")
    await heroTab.getByLabel("Heading", { exact: true }).fill(HERO_AGAIN)
    await barButton(page, "Save").click()
    await expectVisible(toast(page, /saved/i), "a toast confirms the save")
    await expectVisible(
      topBar(page).getByText("Changes not published", { exact: true }),
      "the Changes not published chip"
    )
    expect(
      await siteMainText(PATH),
      "visitors still see the published Page"
    ).toContain(HERO)

    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "the Published chip"
    )
    const text = await siteMainText(PATH)
    expect(inOrder(text, [HERO_AGAIN, CTA, RICH])).toBe(true)
  })

  it("Discard throws away unsaved changes", async () => {
    const heroTab = await selectInOutline("Hero")
    await heroTab.getByLabel("Heading", { exact: true }).fill("Thrown away")
    await expectVisible(
      canvas(page).getByRole("heading", { name: "Thrown away" }),
      "the unsaved heading"
    )
    await discard(page)
    await expectVisible(
      canvas(page).getByRole("heading", { name: HERO_AGAIN }),
      "the saved heading is back"
    )
  })

  it("edits the title, path, Layout mode and SEO in the Page tab", async () => {
    const pageTab = await openTab(page, "Page")
    await pageTab.getByLabel("Title", { exact: true }).fill(NEW_TITLE)
    await expectVisible(
      topBar(page).getByText(NEW_TITLE, { exact: true }),
      "the top bar shows the new title at once"
    )
    await pageTab.getByLabel("Path", { exact: true }).fill(NEW_PATH)
    await expectVisible(
      control(pageTab, "Make a new Layout from this one"),
      "Make a new Layout from this one"
    )
    await expectVisible(
      pageTab.getByText("No Layout", { exact: true }).first(),
      "the No Layout choice"
    )
    await pageTab.getByLabel(/^(SEO )?description$/i).fill(SEO_DESCRIPTION)

    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "the Published chip"
    )
    const text = await siteMainText(NEW_PATH)
    expect(inOrder(text, [HERO_AGAIN, CTA, RICH])).toBe(true)
    expect(
      await visitor.page
        .locator('meta[name="description"]')
        .getAttribute("content")
    ).toBe(SEO_DESCRIPTION)
    expect((await visit(visitor.page, PATH))?.status()).toBe(404)
  })

  it("shows the Layout but keeps it locked, and Edit Layout switches to Layout mode", async () => {
    const header = canvas(page).locator("header").first()
    await expectVisible(header, "the Layout's Header in the canvas")
    // The locked Layout is `inert`, so a click on it falls through to the
    // page: Playwright must press there without waiting for it to be a target.
    await header.click({ position: { x: 5, y: 5 }, force: true })
    expect(
      await anyVisibleInEditor(page, (root) =>
        root.getByRole("button", { name: "Duplicate", exact: true })
      ),
      "the Header can't be selected in Page mode"
    ).toBe(false)
    expect(await editingInPlace(page), "nor edited in place").toBe(false)

    await control(page, "Edit Layout").click()
    await page.waitForURL((url) => EDITOR_ROUTE.layout.test(url.pathname))
    await expectVisible(modeChip(page, "Layout"), "the Layout mode chip")
  })
})
