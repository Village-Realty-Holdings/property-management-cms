import pg from "pg"
import type { Page } from "playwright-core"
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
  expectNoAxeViolations,
  getDoc,
  openTab,
  runPath,
  toast,
  type Doc,
} from "../5-visual-editor/support/editor"
import { openSession, visit, type Session } from "../theme/support/browser"
import { databaseUrl, ORIGIN, SCHEMA } from "../theme/support/env"
import { openScratchSite, type ScratchSite } from "../theme/support/site"
import { openEditorNow } from "./support/open"
import { addUser, removeUser, signInAs } from "./support/users"

/**
 * Refusing a save over someone else's change (Dev User and Sam are two Users
 * signed in on two browsers, with the same Page open).
 *
 * - The second to save is refused: a dialog says "This Page changed since you
 *   opened it", who saved and when, and that the version they replace stays in
 *   History. Reload comes before Save anyway. Escape keeps the editor as it was.
 * - Save anyway saves over it, and the replaced version is still in History.
 * - Reload loads what is stored, without asking about unsaved changes.
 * - The Brand does the same, without a name and without History.
 */

const RUN = Date.now().toString(36)
const STARTED = new Date().toISOString()
const SAM = `Sam Example ${RUN}`
const DEV_TITLE = `Dev ${RUN}`
const SAM_TITLE = `Sam ${RUN}`

let h: Harness
let site: ScratchSite
let samId: number
let sam: Session
let doc: Doc
/** The Brand before the spec: undefined when nobody had saved one. */
let brand: { name: string; tagline: string | null } | undefined

const getTitle = async () =>
  (await getDoc(h.user.context.request, "pages", doc.id)).title

const titleField = async (page: Page) =>
  (await openTab(page, "Page")).getByLabel("Title", { exact: true })

const staleDialog = (page: Page, title: string) =>
  page.getByRole("alertdialog").filter({ hasText: title })

beforeAll(async () => {
  h = await openHarness()
  site = await openScratchSite()
  samId = (await addUser(site.payload, RUN)).id
  sam = await openSession(h.browser)
  await signInAs(sam.context, samId)
  doc = await createPage(h.user.context.request, {
    title: `Stale ${RUN}`,
    path: runPath("stale"),
    publish: true,
  })
  // The Brand as it is now, so the spec can put it back. Saved once first, so
  // that it has a last-saved time to compare.
  const request = h.user.context.request
  const read = await request.get(`${ORIGIN}/api/globals/brand?depth=0`)
  const found = (await read.json()) as {
    id?: number
    name?: string
    tagline?: string | null
  }
  brand = found.id
    ? { name: found.name ?? "Awayday", tagline: found.tagline ?? null }
    : undefined
  const seeded = await request.post(`${ORIGIN}/api/globals/brand`, {
    data: { name: found.name || "Awayday", tagline: found.tagline ?? "" },
  })
  expect(seeded.ok(), await seeded.text()).toBe(true)
})

afterAll(async () => {
  if (h) {
    await discard(h.user.page).catch(() => undefined)
    for (const page of [h.user.page, sam?.page]) {
      await page?.goto("about:blank").catch(() => undefined)
    }
    await deleteCreatedSince(h.user.context.request, STARTED)
    // The Brand as it was: other specs read its name, and the Admin look is
    // photographed with whatever is left.
    if (brand) {
      await h.user.context.request.post(`${ORIGIN}/api/globals/brand`, {
        data: brand,
      })
    } else {
      // Nobody had saved the Brand, and a saved Brand can't lose its name
      // again through the API: take the record away, as it was.
      const client = new pg.Client({ connectionString: databaseUrl() })
      await client.connect()
      try {
        await client.query(`DELETE FROM "${SCHEMA}"."brand"`)
      } finally {
        await client.end()
      }
    }
  }
  if (site) {
    await removeUser(site.payload, samId)
    await site.close()
  }
  await closeHarness(h)
})

describe("a stale save of a Page", () => {
  it("is refused with who saved first, and says the replaced version stays in History", async () => {
    const dev = h.user.page
    await openEditorNow(dev, editorUrl.page(doc.id))
    await openEditorNow(sam.page, editorUrl.page(doc.id))

    await (await titleField(dev)).fill(DEV_TITLE)
    await (await titleField(sam.page)).fill(SAM_TITLE)
    await barButton(sam.page, "Save").click()
    await toast(sam.page, /Draft saved/).waitFor()
    expect(await getTitle()).toBe(SAM_TITLE)

    await barButton(dev, "Save").click()
    const dialog = staleDialog(dev, "This Page changed since you opened it")
    await dialog
      .getByRole("heading", { name: "This Page changed since you opened it" })
      .waitFor()
    const words = (await dialog.textContent()) ?? ""
    expect(words).toMatch(new RegExp(`${SAM} saved it at`))
    expect(words).toContain("The version you replace stays in History.")
    expect(await dialog.getByRole("button").allTextContents()).toEqual([
      "Reload",
      "Save anyway",
    ])
    expect(await getTitle(), "nothing was saved over it").toBe(SAM_TITLE)
    await expectNoAxeViolations(dev, "stale save dialog", {
      includeCanvas: false,
    })
  })

  it("keeps editing on Escape, and Save anyway saves over it with the old version kept", async () => {
    const dev = h.user.page
    const request = h.user.context.request
    const dialog = staleDialog(dev, "This Page changed since you opened it")
    await dev.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
    expect(await (await titleField(dev)).inputValue()).toBe(DEV_TITLE)

    await barButton(dev, "Save").click()
    await dialog.waitFor()
    await dialog.getByRole("button", { name: "Save anyway" }).click()
    await dialog.waitFor({ state: "hidden" })
    await toast(dev, /Draft saved/).waitFor()
    expect(await getTitle()).toBe(DEV_TITLE)

    // Sam's version is still there to restore.
    const versions = await request.get(
      `${ORIGIN}/api/pages/versions?where[parent][equals]=${doc.id}&depth=0&limit=50`
    )
    const titles = (
      (await versions.json()) as { docs: { version: { title: string } }[] }
    ).docs.map((row) => row.version.title)
    expect(titles).toContain(SAM_TITLE)
    await openTab(dev, "History")
    const rows = dev
      .getByRole("list", { name: "Page versions" })
      .getByRole("listitem")
    expect(await rows.count()).toBeGreaterThanOrEqual(3)
  })

  it("names the other User, and Reload loads what is stored without asking", async () => {
    const page = sam.page
    const asked: string[] = []
    page.on("dialog", (dialog) => {
      asked.push(dialog.type())
      void dialog.dismiss()
    })
    await (await titleField(page)).fill(`Sam again ${RUN}`)
    await barButton(page, "Save").click()
    const dialog = staleDialog(page, "This Page changed since you opened it")
    await dialog.waitFor()
    expect(await dialog.textContent()).toMatch(/Dev User saved it at/)

    await page.evaluate(() => {
      ;(window as unknown as { staleMarker?: boolean }).staleMarker = true
    })
    await dialog.getByRole("button", { name: "Reload" }).click()
    await expect
      .poll(() =>
        page
          .evaluate(
            () => (window as unknown as { staleMarker?: boolean }).staleMarker
          )
          .catch(() => true)
      )
      .toBeUndefined()
    await page.getByRole("tab").first().waitFor()
    await expect
      .poll(async () => (await titleField(page)).inputValue())
      .toBe(DEV_TITLE)
    expect(asked, "the editor did not ask about unsaved changes").toEqual([])
    expect(await getTitle()).toBe(DEV_TITLE)
  })
})

describe("a stale save of the Brand", () => {
  it("is refused without a name or History, and Reload shows the other change", async () => {
    const dev = h.user.page
    const samName = `Sam brand ${RUN}`
    await visit(dev, "/admin/settings/brand")
    await visit(sam.page, "/admin/settings/brand")

    await sam.page.getByLabel("Site name", { exact: true }).fill(samName)
    await sam.page.getByRole("button", { name: "Save", exact: true }).click()
    await toast(sam.page, /saved/i).waitFor()

    await dev.getByLabel("Tagline", { exact: true }).fill(`Dev tagline ${RUN}`)
    await dev.getByRole("button", { name: "Save", exact: true }).click()
    const dialog = staleDialog(dev, "The Brand changed since you opened it")
    await dialog
      .getByRole("heading", { name: "The Brand changed since you opened it" })
      .waitFor()
    const words = (await dialog.textContent()) ?? ""
    expect(words).toContain("It was saved at")
    expect(words).not.toContain("stays in History")

    await dialog.getByRole("button", { name: "Reload" }).click()
    await expect
      .poll(async () =>
        dev
          .getByLabel("Site name", { exact: true })
          .inputValue()
          .catch(() => "")
      )
      .toBe(samName)
  })
})
