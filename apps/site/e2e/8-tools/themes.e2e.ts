import { readFile } from "node:fs/promises"

import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Tools acceptance: Themes.
 *
 * - The screen follows the one page-header pattern and passes WCAG 2.2 AA.
 * - It lists the built-in Themes, and marks the one the Site wears as Live.
 * - Applying a Theme asks first, then the Site wears it.
 * - "Save current Theme" keeps the Site's Theme in the list under a name.
 * - A Theme exports as a file, and the file imports as a Saved Theme under a
 *   free name, without changing the Site's Theme.
 * - A Saved Theme can be renamed and deleted.
 */

const SCREEN = "/admin/tools/themes"
const NAME = `E2E look ${Date.now()}`

type Json = Record<string, unknown>

let h: Harness
/** The Theme the Site wore before this spec, put back at the end. */
let original: Json

const theme = async (): Promise<Json> =>
  (
    await h.staff.context.request.get(`${ORIGIN}/api/globals/theme?depth=0`)
  ).json()

beforeAll(async () => {
  h = await openHarness()
  original = await theme()
})

afterAll(async () => {
  if (h) {
    const request = h.staff.context.request
    if (original?.id) {
      // The Theme's inputs: everything but what the record sets itself.
      const record = ["id", "createdAt", "updatedAt", "globalType"]
      const own = [...record, "updatedBy", "changeSummary"]
      const inputs = Object.fromEntries(
        Object.entries(original).filter(([key]) => !own.includes(key))
      )
      await request.post(`${ORIGIN}/api/globals/theme`, { data: inputs })
    }
    const saved = (await (
      await request.get(`${ORIGIN}/api/saved-themes?limit=100&depth=0`)
    ).json()) as { docs: { id: number; name: string }[] }
    for (const doc of saved.docs) {
      if (doc.name.startsWith("E2E look") || doc.name.startsWith("Harbour ")) {
        await request.delete(`${ORIGIN}/api/saved-themes/${doc.id}`)
      }
    }
  }
  await closeHarness(h)
})

const cardOf = (page: Page, name: string) =>
  page.getByRole("listitem", { name, exact: true })

describe("Themes", () => {
  it("follows the page-header pattern and passes WCAG 2.2 AA", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    expect(
      await page.getByRole("heading", { level: 1, name: "Themes" }).count()
    ).toBe(1)
    expect(
      await page
        .getByRole("group", { name: "Tools" })
        .getByRole("link", { name: "Themes" })
        .getAttribute("aria-current")
    ).toBe("page")
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("lists the built-in Themes", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    for (const name of ["Harbour", "Terracotta", "Classic", "Meadow"]) {
      expect(await cardOf(page, name).count(), name).toBe(1)
    }
  })

  it("applies a Theme after asking, and marks it Live", async () => {
    const { page } = h.staff
    // Start from another Theme, so applying Harbour is a change.
    await visit(page, SCREEN)
    if ((await theme()).primary === "#2d4447") {
      await page.getByRole("button", { name: "Apply Meadow" }).click()
      await page.getByRole("button", { name: "Apply Theme" }).click()
      await cardOf(page, "Meadow").getByText("Live").waitFor()
    }
    await page.getByRole("button", { name: "Apply Harbour" }).click()
    const dialog = page.getByRole("alertdialog")
    await dialog.getByText("Apply “Harbour”?").waitFor()
    expect(await dialog.textContent()).toContain("straight away")
    expect(await accessibilityProblems(page)).toBe("")
    await dialog.getByRole("button", { name: "Apply Theme" }).click()
    await cardOf(page, "Harbour").getByText("Live").waitFor()
    expect((await theme()).primary).toBe("#2d4447")
    expect(
      await cardOf(page, "Harbour")
        .getByRole("link", { name: "Edit Harbour" })
        .count()
    ).toBe(1)
  })

  it("keeps the current Theme in the list under a name", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    // The header's button; the empty list offers the same action.
    await page
      .getByRole("button", { name: "Save current Theme" })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Save" }).click()
    await dialog.getByText("Give the Theme a name.").waitFor()
    await dialog.getByLabel("Name").fill(NAME)
    expect(await accessibilityProblems(page)).toBe("")
    await page.keyboard.press("Enter")
    await cardOf(page, NAME).getByText("Live").waitFor()
  })

  it("exports a Theme as a file and imports it under a free name", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export Harbour" }).click(),
    ])
    expect(download.suggestedFilename()).toBe("harbour.theme.json")
    const text = await readFile(await download.path(), "utf8")
    expect(JSON.parse(text)).toMatchObject({
      awaydayTheme: 1,
      name: "Harbour",
      inputs: { primary: "#2d4447", headingFont: "Bricolage Grotesque" },
    })

    const before = (await theme()).updatedAt
    await page.getByLabel("Theme file to import").setInputFiles({
      name: "harbour.theme.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    })
    await cardOf(page, "Harbour 2").waitFor()
    expect((await theme()).updatedAt).toBe(before)
  })

  it("says why a file can't be imported", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    await page.getByLabel("Theme file to import").setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"hello":"world"}'),
    })
    await page.getByRole("alert").getByText("isn't a Theme").waitFor()
  })

  it("renames and deletes a Saved Theme", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    await page.getByRole("button", { name: `Rename ${NAME}` }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Name").fill(`${NAME} b`)
    await dialog.getByRole("button", { name: "Rename" }).click()
    await cardOf(page, `${NAME} b`).waitFor()

    await page.getByRole("button", { name: `Delete ${NAME} b` }).click()
    const confirm = page.getByRole("alertdialog")
    expect(await confirm.textContent()).toContain(
      "Your Site’s Theme does not change."
    )
    await confirm.getByRole("button", { name: "Delete Saved Theme" }).click()
    await cardOf(page, `${NAME} b`).waitFor({ state: "detached" })
    expect((await theme()).primary).toBe("#2d4447")
  })
})
