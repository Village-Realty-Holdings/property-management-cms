import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import { blocks, type Doc } from "../3-layouts/support/api"
import {
  accessibilityProblems,
  closeHarness,
  focusIsVisible,
  openHarness,
  tabTo,
  type Harness,
} from "../3-layouts/support/site"

/**
 * Tools acceptance: the sidebar's Tools group, and Replace Text.
 *
 * - Tools sits below Settings in the sidebar and links Replace Text.
 * - Replace Text follows the one page-header pattern and passes WCAG 2.2 AA.
 * - Preview lists every Page and Layout the text is in, and where.
 * - Replacing asks first. Saved as Drafts, a Published Page stays as it is on
 *   the Site while a Layout, which has no Drafts, changes at once. Published
 *   now, the Page changes on the Site too.
 * - Page Templates are left alone unless "Include Page Templates", which is
 *   off to start with, is switched on.
 * - The whole flow works from the keyboard.
 */

const SCREEN = "/admin/tools/replace-text"

let h: Harness
let page1: Doc
let page2: Doc
let layout: Doc
let template: Doc

beforeAll(async () => {
  h = await openHarness()
  page1 = await h.api.createPage({
    title: "E2E tools Quokka lodge",
    path: "/e2e-tools-one",
  })
  page2 = await h.api.createPage({
    title: "E2E tools Numbat lodge",
    path: "/e2e-tools-two",
  })
  layout = await h.api.createLayout({
    name: "E2E tools layout",
    footer: [blocks.legalBar("© Quokka Rentals")],
  })
  const made = await h.user.context.request.post(
    `${ORIGIN}/api/pages?draft=true`,
    {
      data: {
        title: "E2E tools Quoll starter",
        path: "/e2e-tools-starter",
        isTemplate: true,
        _status: "draft",
      },
    }
  )
  expect(made.ok(), await made.text()).toBe(true)
  template = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", template.id)
})

afterAll(async () => {
  await closeHarness(h)
})

async function preview(page: Page, find: string, replaceWith: string) {
  await visit(page, SCREEN)
  await page.getByLabel("Find", { exact: true }).fill(find)
  await page.getByLabel("Replace with").fill(replaceWith)
  await page.getByRole("button", { name: "Preview" }).click()
  await page.getByRole("table", { name: "What would change" }).waitFor()
}

const rowFor = (page: Page, name: string) =>
  page
    .getByRole("table", { name: "What would change" })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name }) })

describe("the Tools group", () => {
  it("sits below Settings in the sidebar and links Replace Text", async () => {
    const { page } = h.user
    await visit(page, "/admin")
    const groups = await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("group")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")))
    expect(groups.slice(-2)).toEqual(["Settings", "Tools"])
    const link = page
      .getByRole("group", { name: "Tools" })
      .getByRole("link", { name: "Replace Text" })
    await link.click()
    await page.waitForURL(`**${SCREEN}`)
    expect(await link.getAttribute("aria-current")).toBe("page")
  })
})

describe("Replace Text", () => {
  it("follows the page-header pattern and passes WCAG 2.2 AA", async () => {
    const { page } = h.user
    await visit(page, SCREEN)
    expect(
      await page
        .getByRole("heading", { level: 1, name: "Replace Text" })
        .count()
    ).toBe(1)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("says so when nothing matches", async () => {
    const { page } = h.user
    await visit(page, SCREEN)
    await page.getByLabel("Find", { exact: true }).fill("Zzyzx-not-there")
    await page.getByRole("button", { name: "Preview" }).click()
    await page.getByText("Nothing on the Site matches.").waitFor()
  })

  it("asks for the text to find", async () => {
    const { page } = h.user
    await visit(page, SCREEN)
    await page.getByRole("button", { name: "Preview" }).click()
    await page.getByText("Enter the text to find.").waitFor()
  })

  it("previews every Page and Layout the text is in, and where", async () => {
    const { page } = h.user
    await preview(page, "Quokka", "Wombat")
    expect(
      await rowFor(page, "E2E tools Quokka lodge").textContent()
    ).toContain("Title")
    const layoutRow = await rowFor(page, "E2E tools layout").textContent()
    expect(layoutRow).toContain("Footer Block 1, Legal bar: Copyright text")
    expect(layoutRow).toContain("live on save")
    expect(await rowFor(page, "E2E tools Numbat lodge").count()).toBe(0)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("leaves Page Templates out unless they are included", async () => {
    const { page } = h.user
    await visit(page, SCREEN)
    const include = page.getByRole("switch", { name: "Include Page Templates" })
    expect(await include.isChecked()).toBe(false)
    await page.getByLabel("Find", { exact: true }).fill("Quoll")
    await page.getByRole("button", { name: "Preview" }).click()
    await page.getByText("Nothing on the Site matches.").waitFor()

    await include.click()
    expect(await include.isChecked()).toBe(true)
    await page.getByRole("button", { name: "Preview" }).click()
    expect(
      await rowFor(page, "E2E tools Quoll starter").textContent()
    ).toContain("Page Template")
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("saved as Drafts, leaves the Published Page alone and changes the Layout", async () => {
    const { page } = h.user
    await preview(page, "Quokka", "Wombat")
    await page.getByRole("button", { name: "Replace…" }).click()
    const dialog = page.getByRole("alertdialog")
    await dialog.getByText("Replace “Quokka” with “Wombat”?").waitFor()
    expect(
      await dialog.getByRole("radio", { name: "Save as Drafts" }).isChecked()
    ).toBe(true)
    expect(await dialog.textContent()).toContain(
      "1 Layout has no Drafts: it changes on the Site straight away."
    )
    expect(await accessibilityProblems(page)).toBe("")
    await dialog.getByRole("button", { name: "Replace" }).click()
    await page.getByText("Replaced in 1 Page and 1 Layout.").first().waitFor()

    expect((await h.api.getPage(page1.id))?.title).toBe(
      "E2E tools Quokka lodge"
    )
    expect(
      JSON.stringify((await h.api.getLayout(layout.id))?.footer)
    ).toContain("© Wombat Rentals")
    const footer = await visit(h.visitor.page, "/e2e-tools-one").then(() =>
      h.visitor.page.getByRole("contentinfo").textContent()
    )
    expect(footer).not.toContain("Quokka")
  })

  it("published now, changes the Page on the Site, from the keyboard alone", async () => {
    const { page } = h.user
    await visit(page, SCREEN)
    await page.getByLabel("Find", { exact: true }).focus()
    await page.keyboard.type("Numbat")
    await page.keyboard.press("Tab")
    await page.keyboard.type("Bilby")
    await page.keyboard.press("Enter")
    await page.getByRole("table", { name: "What would change" }).waitFor()
    expect(await tabTo(page, (f) => f.name === "Replace…")).toBe(true)
    expect(await focusIsVisible(page)).toBe(true)
    await page.keyboard.press("Enter")
    const dialog = page.getByRole("alertdialog")
    await dialog.waitFor()
    expect(await tabTo(page, (f) => f.tag !== "body")).toBe(true)
    await dialog.getByRole("radio", { name: "Save as Drafts" }).focus()
    await page.keyboard.press("ArrowDown")
    expect(
      await dialog.getByRole("radio", { name: "Publish now" }).isChecked()
    ).toBe(true)
    expect(await tabTo(page, (f) => f.name === "Replace")).toBe(true)
    await page.keyboard.press("Enter")
    await page.getByText("Replaced in 1 Page.").first().waitFor()
    expect((await h.api.getPage(page2.id))?.title).toBe("E2E tools Bilby lodge")
  })
})
