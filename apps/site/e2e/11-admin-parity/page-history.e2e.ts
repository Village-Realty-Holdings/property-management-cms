import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
  type Doc,
  editorUrl,
  expectNoAxeViolations,
  expectVisible,
  getDoc,
  openTab,
  runPath,
  toast,
  topBar,
} from "../5-visual-editor/support/editor"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import { openEditorNow } from "./support/open"

/**
 * A Page's History tab: every save is kept, and an earlier version can be
 * brought back.
 *
 * - The tab lists the versions newest first, each with when it was saved, who
 *   saved it, and whether it was a Draft or a publish. The newest says "Latest
 *   version" and has no Restore.
 * - Restore asks first. Confirmed, the old version becomes a new Draft (a new
 *   row in the list, the chip says "Changes not published"), and the Page
 *   visitors see is not changed.
 * - With unsaved changes open, the confirmation says they are discarded.
 * - The tab passes WCAG 2.2 AA.
 */

const RUN = Date.now().toString(36)
const STARTED = new Date().toISOString()
const PATH = runPath("history")
const TITLE = `History ${RUN}`

let h: Harness
let doc: Doc

const hero = (heading: string) => [{ blockType: "hero", heading }]
const heroHeading = (page: Doc) =>
  (page.blocks as { heading?: string }[])[0]?.heading

const versions = (page: import("playwright-core").Page) =>
  page.getByRole("list", { name: "Page versions" }).getByRole("listitem")

beforeAll(async () => {
  h = await openHarness()
  const request = h.user.context.request
  const made = await request.post(`${ORIGIN}/api/pages?draft=false`, {
    data: {
      title: TITLE,
      path: PATH,
      _status: "published",
      blocks: hero(`First ${RUN}`),
    },
  })
  expect(made.ok(), await made.text()).toBe(true)
  doc = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", Number(doc.id))
  const second = await request.patch(
    `${ORIGIN}/api/pages/${doc.id}?draft=false`,
    { data: { _status: "published", blocks: hero(`Second ${RUN}`) } }
  )
  expect(second.ok(), await second.text()).toBe(true)
  const third = await request.patch(
    `${ORIGIN}/api/pages/${doc.id}?draft=true`,
    {
      data: { _status: "draft", blocks: hero(`Third ${RUN}`) },
    }
  )
  expect(third.ok(), await third.text()).toBe(true)
})

afterAll(async () => {
  if (h) {
    await discard(h.user.page).catch(() => undefined)
    await deleteCreatedSince(h.user.context.request, STARTED)
  }
  await closeHarness(h)
})

describe("a Page's History tab", () => {
  it("lists the versions newest first, with who saved each", async () => {
    const { page } = h.user
    await openEditorNow(page, editorUrl.page(doc.id))
    const tab = await openTab(page, "History")
    await versions(page).first().waitFor()
    expect(await versions(page).count()).toBe(3)

    const [newest, middle, oldest] = await versions(page).all()
    expect(await newest!.textContent()).toContain("Latest version")
    expect(await newest!.textContent()).toContain("Draft")
    expect(
      await newest!.getByRole("button", { name: /^Restore/ }).count()
    ).toBe(0)
    for (const row of [middle!, oldest!]) {
      expect(await row.textContent()).toContain("Published")
      expect(await row.getByRole("button", { name: /^Restore/ }).count()).toBe(
        1
      )
    }
    for (const row of await versions(page).all()) {
      expect(await row.textContent()).toContain("Dev User")
    }
    await expectNoAxeViolations(page, "History tab", { includeCanvas: false })
    expect(await tab.isVisible()).toBe(true)
  })

  it("restores an old version as a Draft, and leaves the Published Page alone", async () => {
    const { page } = h.user
    const request = h.user.context.request
    await versions(page)
      .nth(2)
      .getByRole("button", { name: /^Restore the version saved / })
      .click()
    const dialog = page.getByRole("alertdialog")
    await dialog
      .getByRole("heading", { name: "Restore this version?" })
      .waitFor()
    await dialog.getByRole("button", { name: "Restore version" }).click()
    await toast(page, /Restored the version from .*saved as a Draft/).waitFor()
    await dialog.waitFor({ state: "hidden" })

    await expect.poll(() => versions(page).count()).toBe(4)
    const newest = versions(page).first()
    expect(await newest.textContent()).toContain("Draft")
    expect(await newest.textContent()).toContain("Latest version")
    await expectVisible(
      topBar(page).getByText("Changes not published"),
      "the chip says there are changes to publish"
    )
    await expectVisible(
      canvas(page).getByRole("heading", { name: `First ${RUN}` }),
      "the canvas shows the restored version"
    )

    expect(heroHeading(await getDoc(request, "pages", doc.id))).toBe(
      `First ${RUN}`
    )
    expect(heroHeading((await h.api.getPage(Number(doc.id)))!)).toBe(
      `Second ${RUN}`
    )
    await visit(h.visitor.page, PATH)
    const text = (await h.visitor.page.locator("main").textContent()) ?? ""
    expect(text).toContain(`Second ${RUN}`)
    expect(text).not.toContain(`First ${RUN}`)
  })

  it("says unsaved changes are discarded, and keeps them when the restore is cancelled", async () => {
    const { page } = h.user
    const edited = `${TITLE} edited`
    const pageTab = await openTab(page, "Page")
    await pageTab.getByLabel("Title", { exact: true }).fill(edited)
    await openTab(page, "History")
    await versions(page)
      .nth(1)
      .getByRole("button", { name: /^Restore the version saved / })
      .click()
    const dialog = page.getByRole("alertdialog")
    await dialog
      .getByRole("heading", { name: "Restore this version?" })
      .waitFor()
    expect(await dialog.textContent()).toContain(
      "Your unsaved changes here are discarded."
    )
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await dialog.waitFor({ state: "hidden" })

    const back = await openTab(page, "Page")
    expect(await back.getByLabel("Title", { exact: true }).inputValue()).toBe(
      edited
    )
    expect(await barButton(page, "Save").isEnabled()).toBe(true)
    await discard(page)
  })
})
