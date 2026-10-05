import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import {
  createPage,
  deleteCreatedSince,
  discard,
  editorUrl,
  expectNoAxeViolations,
  openTab,
  runPath,
  type Doc,
} from "../5-visual-editor/support/editor"
import { openSession, visit, type Session } from "../theme/support/browser"
import { openScratchSite, type ScratchSite } from "../theme/support/site"
import { openEditorNow } from "./support/open"
import {
  addUser,
  holderOf,
  nudge,
  removeUser,
  signInAs,
  waitForHolder,
} from "./support/users"

/**
 * Showing who else is editing a Page or a Layout (Dev User and Sam are two
 * Users signed in on two browsers).
 *
 * - The first to open a Page holds it and sees no banner. The second sees "Dev
 *   User is editing this Page." with Take over, and the banner passes WCAG 2.2
 *   AA.
 * - Taking over is one click and loses nothing: the first User's banner says
 *   who took over, and their unsaved changes are still in the editor. They can
 *   take it back, and the other then sees the same.
 * - Leaving the editor lets go of the Page.
 * - A Layout shows the same banner.
 */

const RUN = Date.now().toString(36)
const STARTED = new Date().toISOString()

let h: Harness
let site: ScratchSite
let samId: number
let sam: Session
let doc: Doc
let layout: Doc
const SAM = `Sam Example ${RUN}`

const editing = (page: Page, thing: "Page" | "Layout") =>
  page
    .getByRole("status")
    .filter({ hasText: new RegExp(`is editing this ${thing}`) })
const tookOver = (page: Page) =>
  page.getByRole("status").filter({ hasText: /took over this Page/ })

beforeAll(async () => {
  h = await openHarness()
  site = await openScratchSite()
  const made = await addUser(site.payload, RUN)
  samId = made.id
  sam = await openSession(h.browser)
  await signInAs(sam.context, samId)
  doc = await createPage(h.user.context.request, {
    title: `Presence ${RUN}`,
    path: runPath("presence"),
    publish: true,
  })
  layout = await h.api.createLayout({ name: `Presence layout ${RUN}` })
})

afterAll(async () => {
  if (h) {
    await discard(h.user.page).catch(() => undefined)
    // Leaving the editors stops their heartbeats before the documents go.
    for (const page of [h.user.page, sam?.page]) {
      await page?.goto("about:blank").catch(() => undefined)
    }
    await deleteCreatedSince(h.user.context.request, STARTED)
  }
  if (site) {
    await removeUser(site.payload, samId)
    await site.close()
  }
  await closeHarness(h)
})

describe("presence on a Page", () => {
  it("shows nothing to the first editor, and who is editing to the second", async () => {
    const dev = h.user.page
    await openEditorNow(dev, editorUrl.page(doc.id))
    await waitForHolder(
      site.payload,
      "pages",
      Number(doc.id),
      site.user.id,
      dev
    )
    expect(await editing(dev, "Page").count()).toBe(0)

    await openEditorNow(sam.page, editorUrl.page(doc.id))
    const banner = editing(sam.page, "Page")
    await banner.waitFor()
    await banner
      .getByText("Dev User is editing this Page.", { exact: true })
      .waitFor()
    await banner.getByRole("button", { name: "Take over" }).waitFor()
    await expectNoAxeViolations(sam.page, "presence banner", {
      includeCanvas: false,
    })
  })

  it("lets the second User take over, and tells the first, who keeps their changes", async () => {
    const dev = h.user.page
    const title = `Dev draft ${RUN}`
    const pageTab = await openTab(dev, "Page")
    await pageTab.getByLabel("Title", { exact: true }).fill(title)

    await editing(sam.page, "Page")
      .getByRole("button", { name: "Take over" })
      .click()
    await editing(sam.page, "Page").waitFor({ state: "hidden" })
    await waitForHolder(site.payload, "pages", Number(doc.id), samId, sam.page)

    await expect
      .poll(
        async () => {
          await nudge(dev)
          return (
            (await tookOver(dev)
              .textContent()
              .catch(() => null)) ?? ""
          )
        },
        { timeout: 70_000, interval: 1_000 }
      )
      .toContain(
        `${SAM} took over this Page. Your unsaved changes are still here.`
      )
    const back = await openTab(dev, "Page")
    expect(await back.getByLabel("Title", { exact: true }).inputValue()).toBe(
      title
    )
  })

  it("lets the first User take it back, and tells the second", async () => {
    const dev = h.user.page
    await tookOver(dev).getByRole("button", { name: "Take over" }).click()
    await tookOver(dev).waitFor({ state: "hidden" })
    await waitForHolder(
      site.payload,
      "pages",
      Number(doc.id),
      site.user.id,
      dev
    )

    await expect
      .poll(
        async () => {
          await nudge(sam.page)
          return (
            (await tookOver(sam.page)
              .textContent()
              .catch(() => null)) ?? ""
          )
        },
        { timeout: 70_000, interval: 1_000 }
      )
      .toContain("Dev User took over this Page.")
  })

  it("lets go of the Page when its editor is left", async () => {
    // Sam takes it once more, then leaves.
    await tookOver(sam.page).getByRole("button", { name: "Take over" }).click()
    await waitForHolder(site.payload, "pages", Number(doc.id), samId, sam.page)

    await visit(sam.page, "/admin")
    await expect
      .poll(() => holderOf(site.payload, "pages", Number(doc.id)), {
        timeout: 20_000,
        interval: 500,
      })
      .not.toBe(samId)
    await discard(h.user.page)
  })
})

describe("presence on a Layout", () => {
  it("shows the second editor who is editing it", async () => {
    const dev = h.user.page
    await openEditorNow(dev, editorUrl.layout(layout.id))
    await waitForHolder(
      site.payload,
      "layouts",
      Number(layout.id),
      site.user.id,
      dev
    )
    await openEditorNow(sam.page, editorUrl.layout(layout.id))
    const banner = editing(sam.page, "Layout")
    await banner.waitFor()
    await banner
      .getByText("Dev User is editing this Layout.", { exact: true })
      .waitFor()
    await banner.getByRole("button", { name: "Take over" }).waitFor()
  })
})
