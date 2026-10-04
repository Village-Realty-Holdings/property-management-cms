import type { Browser, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import {
  EDITOR_ROUTE,
  RUN,
  addBlock,
  addBlockButtons,
  control,
  createPage,
  defaultLayout,
  deleteCreatedSince,
  editorUrl,
  expectHidden,
  expectNoAxeViolations,
  expectVisible,
  getDoc,
  goToPage,
  openEditor,
  openTab,
  outlineTree,
  runPath,
  topBar,
  unsavedDialog,
  type Doc,
} from "./support/editor"

/**
 * Phase 5 acceptance: "the guard works for in-app navigation and for tab
 * close", in each Visual Editor mode (Page, Layout, Theme). The Visual Editor
 * uses the Phase 1 guard: leaving inside the Admin with unsaved changes (Back,
 * or Ctrl-K to another Page) asks Save / Discard / Stay, and closing or
 * reloading the tab triggers the browser's beforeunload warning. With nothing
 * unsaved, nothing asks.
 */

const STARTED = new Date().toISOString()
const G = { title: `Guarded ${RUN}`, path: runPath("guarded") }
const H = { title: `Elsewhere ${RUN}`, path: runPath("elsewhere") }

let browser: Browser
let admin: Session
let page: Page
const docs: { g?: Doc; h?: Doc } = {}

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  docs.g = await createPage(admin.context.request, { ...G, publish: true })
  docs.h = await createPage(admin.context.request, { ...H, publish: true })
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

/** Makes the open Page's title unsaved, typing as a person would. */
async function editTitle(p: Page, title: string) {
  const pageTab = await openTab(p, "Page")
  const field = pageTab.getByLabel("Title", { exact: true })
  await field.click()
  await p.keyboard.press("Control+a")
  await p.keyboard.type(title)
}

/** Clicks Back in the top bar. */
const back = (p: Page) => control(topBar(p), /^Back\b/).click()

/**
 * The type of the dialog `act` raises in `p` ("beforeunload"), or null when
 * none comes. The dialog is dismissed, so the page stays.
 */
async function dialogDuring(
  p: Page,
  act: () => Promise<unknown>
): Promise<string | null> {
  let type: string | null = null
  const onDialog = (dialog: { type(): string; dismiss(): Promise<void> }) => {
    type = dialog.type()
    void dialog.dismiss()
  }
  p.on("dialog", onDialog)
  try {
    await act()
    await p.waitForTimeout(1_000)
  } finally {
    p.off("dialog", onDialog)
  }
  return type
}

/** A fresh tab of the signed-in User, with `url` open. */
async function newTab(url: string): Promise<Page> {
  const tab = await admin.context.newPage()
  await openEditor(tab, url)
  return tab
}

describe("the unsaved-changes guard in Page mode", () => {
  it("lets a clean editor go without asking", async () => {
    await openEditor(page, editorUrl.page(docs.g!.id))
    await back(page)
    await page.waitForURL((url) => !EDITOR_ROUTE.page.test(url.pathname))
    expect(await unsavedDialog(page).count()).toBe(0)
  })

  it("asks Save / Discard / Stay on Back, and Stay keeps the edits", async () => {
    await openEditor(page, editorUrl.page(docs.g!.id))
    await editTitle(page, `${G.title} (unsaved)`)
    await back(page)
    const dialog = unsavedDialog(page)
    await expectVisible(dialog, "the unsaved-changes dialog")
    for (const name of ["Save", "Discard changes", "Stay"])
      await expectVisible(
        dialog.getByRole("button", { name, exact: true }),
        `the ${name} choice`
      )
    await expectNoAxeViolations(page, "the unsaved-changes dialog", {
      includeCanvas: false,
    })

    await dialog.getByRole("button", { name: "Stay", exact: true }).click()
    await expectHidden(dialog, "Stay closes the dialog")
    expect(page.url()).toContain(`/admin/pages/${docs.g!.id}`)
    expect(
      await page
        .getByRole("tabpanel", { name: "Page", exact: true })
        .getByLabel("Title", { exact: true })
        .inputValue()
    ).toBe(`${G.title} (unsaved)`)
  })

  it("asks on Ctrl-K to another Page too, and Discard leaves without saving", async () => {
    await goToPage(page, H.path, H.title)
    const dialog = unsavedDialog(page)
    await expectVisible(dialog, "the unsaved-changes dialog")
    await dialog
      .getByRole("button", { name: "Discard changes", exact: true })
      .click()
    await page.waitForURL(`**/admin/pages/${docs.h!.id}`)
    const g = await getDoc(admin.context.request, "pages", docs.g!.id)
    expect(g.title, "the discarded title was not saved").toBe(G.title)
  })

  it("saves, then leaves, when Save is chosen", async () => {
    await openEditor(page, editorUrl.page(docs.g!.id))
    const saved = `${G.title} (saved on the way out)`
    await editTitle(page, saved)
    await back(page)
    const dialog = unsavedDialog(page)
    await expectVisible(dialog, "the unsaved-changes dialog")
    await dialog.getByRole("button", { name: "Save", exact: true }).click()
    await page.waitForURL((url) => !EDITOR_ROUTE.page.test(url.pathname))
    const g = await getDoc(admin.context.request, "pages", docs.g!.id)
    expect(g.title).toBe(saved)
  })

  it("warns before the tab is closed or reloaded, and only with unsaved changes", async () => {
    const tab = await newTab(editorUrl.page(docs.h!.id))
    expect(
      await dialogDuring(tab, () => tab.reload()),
      "a clean editor reloads without a warning"
    ).toBeNull()
    await editTitle(tab, `${H.title} (unsaved)`)
    expect(
      await dialogDuring(tab, () => tab.close({ runBeforeUnload: true })),
      "closing the tab"
    ).toBe("beforeunload")
    expect(tab.isClosed(), "dismissing the warning keeps the tab").toBe(false)
    expect(
      await dialogDuring(tab, () =>
        tab.evaluate(() => {
          location.reload()
        })
      ),
      "reloading the tab"
    ).toBe("beforeunload")
    await tab.close()
  })
})

describe("the unsaved-changes guard in Layout mode", () => {
  let layout: Doc

  it("asks on Back, and Discard leaves the Layout as it was", async () => {
    layout = await defaultLayout(admin.context.request)
    const before = await getDoc(admin.context.request, "layouts", layout.id)
    await openEditor(page, editorUrl.layout(layout.id))
    await openTab(page, "Outline")
    await addBlock(
      page,
      addBlockButtons(outlineTree(page), "Header").first(),
      "Utility strip"
    )
    await back(page)
    const dialog = unsavedDialog(page)
    await expectVisible(dialog, "the unsaved-changes dialog")
    await dialog.getByRole("button", { name: "Stay", exact: true }).click()
    await expectHidden(dialog, "Stay closes the dialog")
    expect(page.url()).toContain(`/admin/layouts/${layout.id}`)

    await back(page)
    await expectVisible(dialog, "the dialog again")
    await dialog
      .getByRole("button", { name: "Discard changes", exact: true })
      .click()
    await page.waitForURL((url) => !EDITOR_ROUTE.layout.test(url.pathname))
    const after = await getDoc(admin.context.request, "layouts", layout.id)
    expect(after.updatedAt, "the Layout was not saved").toBe(before.updatedAt)
  })

  it("warns before the tab is closed", async () => {
    const tab = await newTab(editorUrl.layout(layout.id))
    await openTab(tab, "Outline")
    await addBlock(
      tab,
      addBlockButtons(outlineTree(tab), "Header").first(),
      "Utility strip"
    )
    expect(
      await dialogDuring(tab, () => tab.close({ runBeforeUnload: true }))
    ).toBe("beforeunload")
    await tab.close()
  })
})

describe("the unsaved-changes guard in Theme mode", () => {
  /** Makes the Theme unsaved: a new Primary colour, typed. */
  async function editPrimary(p: Page) {
    // The hex field: its swatch ("Primary colour picker") is typed into by
    // value, not by keys.
    const field = p.getByRole("textbox", {
      name: "Primary colour",
      exact: true,
    })
    await field.click()
    await p.keyboard.press("Control+a")
    await p.keyboard.type("#6b2d5c")
    await p.keyboard.press("Tab")
  }

  it("asks on Back, and Discard leaves the Theme as it was", async () => {
    await openEditor(page, editorUrl.theme())
    await editPrimary(page)
    await back(page)
    const dialog = unsavedDialog(page)
    await expectVisible(dialog, "the unsaved-changes dialog")
    await dialog
      .getByRole("button", { name: "Discard changes", exact: true })
      .click()
    await page.waitForURL((url) => !EDITOR_ROUTE.theme.test(url.pathname))
  })

  it("warns before the tab is closed or reloaded", async () => {
    const tab = await newTab(editorUrl.theme())
    await editPrimary(tab)
    expect(
      await dialogDuring(tab, () => tab.close({ runBeforeUnload: true }))
    ).toBe("beforeunload")
    expect(
      await dialogDuring(tab, () =>
        tab.evaluate(() => {
          location.reload()
        })
      )
    ).toBe("beforeunload")
    await tab.close()
  })
})
