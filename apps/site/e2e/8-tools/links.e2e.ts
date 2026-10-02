import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Doc } from "../3-layouts/support/api"
import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Tools acceptance: Links.
 *
 * - The screen follows the one page-header pattern and passes WCAG 2.2 AA.
 * - It lists each link once, with its kind, whether it works, and every
 *   place it is used, each a link to the editor.
 * - An internal link to a path no Page has is Broken; one to a Published
 *   Page works; one that leaves the Site is not checked.
 * - The list filters to Internal, External and Broken, and by a search.
 * - A URL is replaced everywhere after a preview, and the list then shows it.
 */

const SCREEN = "/admin/tools/links"
const RUN = Date.now()
const GONE = `/e2e-links-gone-${RUN}`
const HERE = `/e2e-links-here-${RUN}`
const OUT = `https://example.com/e2e-links-${RUN}`

let h: Harness
let doc: Doc

const button = (label: string, href: string) => ({
  blockType: "button",
  link: { label, href },
  style: "primary",
  align: "start",
})

beforeAll(async () => {
  h = await openHarness()
  await h.api.createPage({ title: `E2E links here ${RUN}`, path: HERE })
  const made = await h.staff.context.request.post(
    `${ORIGIN}/api/pages?draft=false`,
    {
      data: {
        title: `E2E links home ${RUN}`,
        path: `/e2e-links-home-${RUN}`,
        _status: "published",
        blocks: [
          button("Gone", GONE),
          button("Here", HERE),
          button("Out", OUT),
          button("Gone again", GONE),
        ],
      },
    }
  )
  expect(made.ok(), await made.text()).toBe(true)
  doc = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", doc.id)
})

afterAll(async () => {
  await closeHarness(h)
})

const rowFor = (page: Page, target: string) =>
  page
    .getByRole("table", { name: "Links" })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: target }) })

describe("Links", () => {
  it("follows the page-header pattern and passes WCAG 2.2 AA", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    expect(
      await page.getByRole("heading", { level: 1, name: "Links" }).count()
    ).toBe(1)
    expect(
      await page
        .getByRole("group", { name: "Tools" })
        .getByRole("link", { name: "Links" })
        .getAttribute("aria-current")
    ).toBe("page")
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("lists each link once, with its kind, whether it works and where it is", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    const gone = await rowFor(page, GONE).textContent()
    expect(gone).toContain("Internal")
    expect(gone).toContain("Broken")
    expect(gone).toContain("No Page has this path.")
    expect(gone).toContain("2 places")
    expect(await rowFor(page, HERE).textContent()).toContain("Works")
    const out = await rowFor(page, OUT).textContent()
    expect(out).toContain("External")
    expect(out).toContain("Not checked")

    await rowFor(page, GONE).getByText("2 places").click()
    const use = rowFor(page, GONE)
      .getByRole("link", { name: `E2E links home ${RUN}` })
      .first()
    expect(await use.getAttribute("href")).toBe(`/admin/pages/${doc.id}`)
    expect(await rowFor(page, GONE).textContent()).toContain(
      "Block 1, Button: Link: Link"
    )
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("filters to Broken, to External, and by a search", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    await page.getByRole("radio", { name: /^Broken/ }).click()
    expect(await rowFor(page, GONE).count()).toBe(1)
    expect(await rowFor(page, HERE).count()).toBe(0)
    await page.getByRole("radio", { name: /^External/ }).click()
    expect(await rowFor(page, OUT).count()).toBe(1)
    expect(await rowFor(page, GONE).count()).toBe(0)
    await page.getByRole("radio", { name: /^All/ }).click()
    await page.getByLabel("Search").fill(`here-${RUN}`)
    expect(await rowFor(page, HERE).count()).toBe(1)
    expect(await rowFor(page, OUT).count()).toBe(0)
  })

  it("replaces a URL everywhere after a preview", async () => {
    const { page } = h.staff
    await visit(page, SCREEN)
    await page.getByRole("button", { name: `Replace ${GONE}` }).click()
    const with_ = page.getByLabel("With", { exact: true })
    await with_.fill("javascript:alert(1)")
    await page.getByRole("button", { name: "Preview" }).click()
    await page.getByText("Use a Site path").waitFor()
    await with_.fill(HERE)
    expect(
      await page
        .getByRole("switch", { name: "Include Page Templates" })
        .isChecked()
    ).toBe(false)
    await page.getByRole("button", { name: "Preview" }).click()
    await page.getByRole("table", { name: "What would change" }).waitFor()
    expect(await accessibilityProblems(page)).toBe("")
    await page.getByRole("button", { name: "Replace…" }).click()
    const dialog = page.getByRole("alertdialog")
    await dialog.getByRole("radio", { name: "Publish now" }).click()
    await dialog.getByRole("button", { name: "Replace" }).click()
    await page.getByText("Replaced in 1 Page.").first().waitFor()

    const live = await h.api.getPage(doc.id)
    expect(
      (live?.blocks as { link: { href: string } }[]).map((b) => b.link.href)
    ).toEqual([HERE, HERE, OUT, HERE])
    // The list was read again: the broken link is gone from it.
    await rowFor(page, GONE).waitFor({ state: "detached" })
    expect(await rowFor(page, HERE).textContent()).toContain("3 places")
  })
})
