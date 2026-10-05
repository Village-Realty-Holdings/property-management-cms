import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import {
  barButton,
  createPage,
  deleteCreatedSince,
  discard,
  editorUrl,
  expectHidden,
  expectNoAxeViolations,
  expectVisible,
  openTab,
  toast,
  topBar,
  type Doc,
} from "../5-visual-editor/support/editor"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import { openEditorNow } from "./support/open"

/**
 * Changing a Published Page's path warns what links to the old one.
 *
 * - In the Page tab, a path that differs from the live one shows a notice under
 *   Path: how many links still lead to the old path, which Pages they are on
 *   (each a link to that Page), and a link to Tools, Links. The Path field is
 *   described by the notice.
 * - Saving is not blocked. A Draft save leaves the live path, so the notice
 *   stays and visitors still reach the old path.
 * - Setting the path back hides the notice; publishing the new path ends it.
 * - A Page that was never published has no links to lose, so no notice.
 * - The notice passes WCAG 2.2 AA.
 */

const RUN = Date.now().toString(36)
const STARTED = new Date().toISOString()
const OLD = `/e2e-moving-${RUN}`
const NEW = `/e2e-moved-${RUN}`
const NOTICE = "#page-path-change-notice"

let h: Harness
let moving: Doc
let links: Doc
let draft: Doc

const button = (label: string, href: string) => ({
  blockType: "button",
  link: { label, href },
  style: "primary",
  align: "start",
})

beforeAll(async () => {
  h = await openHarness()
  const request = h.user.context.request
  moving = await createPage(request, {
    title: `Moving ${RUN}`,
    path: OLD,
    publish: true,
  })
  const made = await request.post(`${ORIGIN}/api/pages?draft=false`, {
    data: {
      title: `Links home ${RUN}`,
      path: `/e2e-links-home-${RUN}`,
      _status: "published",
      blocks: [button("First", OLD), button("Second", OLD)],
    },
  })
  expect(made.ok(), await made.text()).toBe(true)
  links = ((await made.json()) as { doc: Doc }).doc
  draft = await createPage(request, {
    title: `Never published ${RUN}`,
    path: `/e2e-never-${RUN}`,
    publish: false,
  })
})

afterAll(async () => {
  if (h) {
    await discard(h.user.page).catch(() => undefined)
    await deleteCreatedSince(h.user.context.request, STARTED)
  }
  await closeHarness(h)
})

describe("the path-change warning", () => {
  it("lists what links to the old path when a Published Page's path is changed", async () => {
    const { page } = h.user
    await openEditorNow(page, editorUrl.page(moving.id))
    const tab = await openTab(page, "Page")
    const path = tab.getByLabel("Path", { exact: true })
    await path.fill(NEW)

    const notice = page.locator(NOTICE)
    await notice.waitFor()
    expect(await notice.getAttribute("role")).toBe("status")
    const words = (await notice.textContent()) ?? ""
    expect(words).toContain(`2 links still lead to “${OLD}”.`)
    expect(words).toContain("Saving does not change them.")
    const onPage = notice.getByRole("link", { name: `Links home ${RUN}` })
    expect(await onPage.count()).toBeGreaterThan(0)
    expect(await onPage.first().getAttribute("href")).toBe(
      `/admin/pages/${links.id}`
    )
    expect(
      await notice
        .getByRole("link", { name: "Open Tools, Links" })
        .getAttribute("href")
    ).toBe("/admin/tools/links")
    expect(await path.getAttribute("aria-describedby")).toContain(
      "page-path-change-notice"
    )
    await expectNoAxeViolations(page, "path notice", { includeCanvas: false })
  })

  it("does not block saving, and keeps the notice while the live path is the old one", async () => {
    const { page } = h.user
    const save = barButton(page, "Save")
    expect(await save.isEnabled()).toBe(true)
    await save.click()
    await toast(page, /Draft saved/).waitFor()
    await expectVisible(
      page.locator(NOTICE),
      "the notice stays after a Draft save"
    )
    const response = await visit(h.visitor.page, OLD)
    expect(response?.status(), "visitors still reach the old path").toBe(200)
  })

  it("hides the notice when the path is set back, and ends it when the new path is published", async () => {
    const { page } = h.user
    const tab = await openTab(page, "Page")
    const path = tab.getByLabel("Path", { exact: true })
    await path.fill(OLD)
    await expectHidden(page.locator(NOTICE), "the path is the live one again")

    await path.fill(NEW)
    await expectVisible(page.locator(NOTICE), "the notice is back")
    await barButton(page, "Publish").click()
    await expectVisible(
      topBar(page).getByText("Published", { exact: true }),
      "the Published chip"
    )
    await expectHidden(page.locator(NOTICE), "the new path is the live one now")
    expect((await h.api.getPage(Number(moving.id)))?.path).toBe(NEW)
  })

  it("shows no notice for a Page that was never published", async () => {
    const { page } = h.user
    await openEditorNow(page, editorUrl.page(draft.id))
    const tab = await openTab(page, "Page")
    await tab
      .getByLabel("Path", { exact: true })
      .fill(`/e2e-never-moved-${RUN}`)
    // The lookup, if there were one, is quick; give it time to show itself.
    await page.waitForTimeout(2_000)
    expect(await page.locator(NOTICE).count()).toBe(0)
    await discard(page)
  })
})
