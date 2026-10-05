import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import { openScratchSite, type ScratchSite } from "../theme/support/site"
import { addUser, removeUser, signInAs } from "./support/users"

/**
 * The Users screen (Settings, Users).
 *
 * - It lists the people who can sign in, under one h1 and a captioned table,
 *   and the Settings group of the sidebar marks it as the current screen.
 * - Your own row says "You" and has no Remove, and a User signed in from
 *   another browser can use the Admin.
 * - Remove asks first, and says the person can sign in again while they hold
 *   the Entra app role; confirming removes the User.
 * - Over `/api` a User still can't delete themselves.
 * - The screen passes WCAG 2.2 AA.
 */

const RUN = Date.now().toString(36)
const SAM_NAME = `Sam Example ${RUN}`

let h: Harness
let site: ScratchSite
let samId: number

beforeAll(async () => {
  h = await openHarness()
  site = await openScratchSite()
  samId = (await addUser(site.payload, RUN)).id
})

afterAll(async () => {
  if (site) {
    await removeUser(site.payload, samId)
    await site.close()
  }
  await closeHarness(h)
})

describe("the Users screen", () => {
  it("lists the Users, marks the signed-in one, and passes WCAG 2.2 AA", async () => {
    const { page } = h.user
    await visit(page, "/admin/settings/users")
    expect(
      await page.getByRole("heading", { level: 1, name: "Users" }).count()
    ).toBe(1)
    const current = page
      .getByRole("group", { name: "Settings" })
      .getByRole("link", { name: "Users" })
    expect(await current.getAttribute("aria-current")).toBe("page")
    await page.getByRole("table", { name: "Users" }).waitFor()

    const row = (name: string) =>
      page
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name }) })
    const you = row("Dev User")
    expect(await you.getByText("You", { exact: true }).count()).toBe(1)
    expect(
      await page.getByRole("button", { name: "Remove Dev User" }).count()
    ).toBe(0)

    const sam = row(SAM_NAME)
    expect(await sam.textContent()).toContain(`sam-${RUN}@awayday.test`)
    expect(
      await sam.getByRole("button", { name: `Remove ${SAM_NAME}` }).count()
    ).toBe(1)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("lets a second User, signed in elsewhere, into the Admin", async () => {
    const sam = await h.browser.newContext()
    try {
      await signInAs(sam, samId)
      const page = await sam.newPage()
      await page.goto(`${ORIGIN}/admin/settings/users`)
      expect(new URL(page.url()).pathname).toBe("/admin/settings/users")
      await page
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name: SAM_NAME }) })
        .getByText("You", { exact: true })
        .waitFor()
    } finally {
      await sam.close()
    }
  })

  it("asks before removing a User, and removes them when confirmed", async () => {
    const { page } = h.user
    await visit(page, "/admin/settings/users")
    const row = page
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: SAM_NAME }) })
    await row.getByRole("button", { name: `Remove ${SAM_NAME}` }).click()
    const dialog = page.getByRole("alertdialog")
    await dialog
      .getByRole("heading", { name: `Remove “${SAM_NAME}”?` })
      .waitFor()
    expect(await dialog.textContent()).toContain(
      "they can sign in again for as long as they hold the Entra app role"
    )
    await dialog.getByRole("button", { name: "Remove User" }).click()
    await page
      .locator("[data-sonner-toast]")
      .filter({ hasText: `Removed ${SAM_NAME}.` })
      .first()
      .waitFor()
    await row.waitFor({ state: "detached" })
    const found = await site.payload.find({
      collection: "users",
      where: { entraOid: { equals: `e2e-${RUN}` } },
      depth: 0,
    })
    expect(found.totalDocs).toBe(0)
  })

  it("refuses over /api to delete the signed-in User", async () => {
    const request = h.user.context.request
    const response = await request.delete(`${ORIGIN}/api/users/${site.user.id}`)
    expect(response.ok()).toBe(false)
    expect(response.status()).toBe(403)
    const still = await request.get(`${ORIGIN}/api/users/${site.user.id}`)
    expect(still.ok()).toBe(true)
  })
})
