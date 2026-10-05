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
 * Searching and paging the Media library.
 *
 * - The search box finds images by alt text or file name, and the URL holds
 *   the search (`?q=`).
 * - The library shows 48 images a page. Below them are Previous and Next
 *   (a link, or plain disabled text at the ends) and "Page 1 of 2".
 * - Paging keeps the search; the page in the URL is clamped when it is out
 *   of range and ignored when it isn't a number.
 * - A search with no match says so, and offers to clear it.
 * - The list passes WCAG 2.2 AA.
 */

const RUN = Date.now().toString(36)
const PAGING = `e2e-paging-${RUN}`
const FIND = `e2e-findme-${RUN}`

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let h: Harness
const made: number[] = []

async function upload(name: string, alt: string) {
  const response = await h.user.context.request.post(`${ORIGIN}/api/media`, {
    multipart: {
      file: { name: `${name}.png`, mimeType: "image/png", buffer: PNG },
      _payload: JSON.stringify({ alt }),
    },
  })
  expect(response.ok(), await response.text()).toBe(true)
  const { doc } = (await response.json()) as { doc: { id: number } }
  made.push(doc.id)
}

const cards = (page: Page) => page.getByRole("button", { name: /^Edit e2e-/ })
const pagination = (page: Page) =>
  page.getByRole("navigation", { name: "Pagination" })
const searchUrl = (q: string, extra = "") =>
  `/admin/media?q=${encodeURIComponent(q)}${extra}`

beforeAll(async () => {
  h = await openHarness()
  // 49 images match the paging search: one full page of 48, and one more.
  for (let i = 1; i <= 49; i++) {
    const n = String(i).padStart(2, "0")
    await upload(`${PAGING}-${n}`, `${PAGING}-${n}`)
  }
  await upload(FIND, "A quiet harbour")
}, 300_000)

afterAll(async () => {
  if (h) {
    for (const id of made) {
      await h.user.context.request.delete(`${ORIGIN}/api/media/${id}`)
    }
  }
  await closeHarness(h)
})

describe("searching and paging the Media library", () => {
  it("searches from the box, shows 48 a page, and passes WCAG 2.2 AA", async () => {
    const { page } = h.user
    await visit(page, "/admin/media")
    await page.getByLabel("Search Media by alt text or file name").fill(PAGING)
    await page.getByRole("button", { name: "Search", exact: true }).click()
    await page.waitForURL(
      (url) =>
        url.pathname === "/admin/media" && url.searchParams.get("q") === PAGING
    )
    await pagination(page).waitFor()
    expect(await cards(page).count()).toBe(48)
    expect(await pagination(page).textContent()).toContain("Page 1 of 2")
    // At the start, Previous is plain text, not a link.
    const previous = pagination(page).getByText("Previous")
    expect(await previous.getAttribute("aria-disabled")).toBe("true")
    expect(
      await pagination(page).getByRole("link", { name: "Previous" }).count()
    ).toBe(0)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("pages forward and back with the search kept", async () => {
    const { page } = h.user
    await visit(page, searchUrl(PAGING))
    await pagination(page).getByRole("link", { name: "Next" }).click()
    await page.waitForURL((url) => url.searchParams.get("page") === "2")
    expect(new URL(page.url()).searchParams.get("q")).toBe(PAGING)
    await page.getByText("Page 2 of 2").waitFor()
    expect(await cards(page).count()).toBe(1)
    expect(
      await pagination(page).getByText("Next").getAttribute("aria-disabled")
    ).toBe("true")
    expect(
      await pagination(page).getByRole("link", { name: "Next" }).count()
    ).toBe(0)

    await pagination(page).getByRole("link", { name: "Previous" }).click()
    await page.getByText("Page 1 of 2").waitFor()
    expect(new URL(page.url()).searchParams.get("q")).toBe(PAGING)
    expect(await cards(page).count()).toBe(48)
  })

  it("clamps a page past the end, and ignores a page that isn't a number", async () => {
    const { page } = h.user
    await visit(page, searchUrl(PAGING, "&page=99"))
    await page.getByText("Page 2 of 2").waitFor()
    expect(await cards(page).count()).toBe(1)

    await visit(page, searchUrl(PAGING, "&page=abc"))
    await page.getByText("Page 1 of 2").waitFor()
    expect(await cards(page).count()).toBe(48)
  })

  it("finds an image by its file name alone", async () => {
    const { page } = h.user
    await visit(page, searchUrl(FIND))
    expect(await cards(page).count()).toBe(1)
    await page
      .getByRole("listitem")
      .filter({ hasText: `${FIND}.png` })
      .getByText("A quiet harbour", { exact: true })
      .waitFor()
    expect(await pagination(page).count(), "one page needs no paging").toBe(0)
  })

  it("says so when nothing matches, and clears the search", async () => {
    const { page } = h.user
    const none = `nothing-${RUN}`
    await visit(page, searchUrl(none))
    await page.getByText("No images match your search").waitFor()
    await page
      .getByText(`Nothing matches "${none}" in alt text or a file name.`)
      .waitFor()
    expect(await cards(page).count()).toBe(0)
    // The search form can clear it too.
    expect(
      await page
        .getByRole("search")
        .getByRole("link", { name: "Clear", exact: true })
        .count()
    ).toBe(1)
    await page.getByRole("link", { name: "Clear search" }).click()
    await page.waitForURL(
      (url) => url.pathname === "/admin/media" && url.search === ""
    )
  })
})
