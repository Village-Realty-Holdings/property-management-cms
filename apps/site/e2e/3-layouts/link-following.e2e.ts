import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { visit } from "../theme/support/browser"
import {
  blocks,
  bodyText,
  nav,
  pageLink,
  urlLink,
  type Doc,
} from "./support/api"
import { closeHarness, openHarness, type Harness } from "./support/site"

/**
 * Phase 3 acceptance: links follow Pages (spec "Layouts and region Blocks").
 * A Navigation link to a Page is a relationship, so when the Page's path
 * changes the menu follows it; and deleting a Page that a menu links to is
 * blocked, with an error that lists those menus (by their Layout's name).
 */

const PREFIX = "/e2e-links"
const TOP = "Links top menu"
const DROPDOWN = "Links dropdown menu"

let h: Harness
let cottage: Doc
let harbour: Doc
let topMenu: Doc
let dropdownMenu: Doc

beforeAll(async () => {
  h = await openHarness()
  cottage = await h.api.createPage({
    title: "Harbour cottage",
    path: `${PREFIX}/harbour-cottage`,
  })
  harbour = await h.api.createPage({
    title: "Harbour guide",
    path: `${PREFIX}/guide`,
  })
  topMenu = await h.api.createLayout({
    name: TOP,
    paths: [PREFIX],
    header: [
      blocks.navigation([
        nav.link("Our cottage", pageLink(cottage.id)),
        nav.link("Elsewhere", urlLink("https://example.com/elsewhere")),
      ]),
    ],
  })
  dropdownMenu = await h.api.createLayout({
    name: DROPDOWN,
    header: [
      blocks.navigation([
        nav.dropdown("More", [nav.link("The guide", pageLink(harbour.id))]),
      ]),
    ],
  })
})

afterAll(async () => {
  await closeHarness(h)
})

async function menuHref(path: string, label: string) {
  const { page } = h.visitor
  await visit(page, path)
  const link = page.getByRole("banner").getByRole("link", { name: label })
  expect(await link.count(), `menu link "${label}"`).toBe(1)
  return link.getAttribute("href")
}

describe("a menu link to a Page", () => {
  it("points at the Page's path", async () => {
    expect(await menuHref(`${PREFIX}/guide`, "Our cottage")).toBe(
      `${PREFIX}/harbour-cottage`
    )
  })

  it("follows the Page when its path changes", async () => {
    await h.api.updatePage(cottage.id, { path: `${PREFIX}/the-cottage` })
    expect(await menuHref(`${PREFIX}/guide`, "Our cottage")).toBe(
      `${PREFIX}/the-cottage`
    )
    // And the menu's own link reaches the Page.
    const response = await visit(h.visitor.page, `${PREFIX}/the-cottage`)
    expect(response?.status()).toBe(200)
  })

  it("follows the Page from inside a dropdown too", async () => {
    await h.api.updatePage(harbour.id, { path: `${PREFIX}/harbour-guide` })
    const { page } = h.visitor
    // Show the dropdown's Layout on a Page that picks it.
    await h.api.createPage({
      title: "Dropdown host",
      path: `${PREFIX}-host`,
      layout: { mode: "specific", layout: dropdownMenu.id },
    })
    await visit(page, `${PREFIX}-host`)
    await page.getByRole("banner").getByRole("button", { name: "More" }).click()
    const link = page
      .getByRole("banner")
      .getByRole("link", { name: "The guide" })
    await link.waitFor({ state: "visible" })
    expect(await link.getAttribute("href")).toBe(`${PREFIX}/harbour-guide`)
  })
})

describe("deleting a Page a menu links to", () => {
  it("is blocked, and the error lists the menus", async () => {
    const response = await h.api.deletePage(cottage.id)
    expect(response.ok(), "the delete is refused").toBe(false)
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(response.status()).toBeLessThan(500)
    expect(await bodyText(response)).toContain(TOP)
    expect(
      await h.api.getPage(cottage.id),
      "the Page is still there"
    ).not.toBeNull()
  })

  it("is blocked by a link inside a dropdown", async () => {
    const response = await h.api.deletePage(harbour.id)
    expect(response.ok()).toBe(false)
    expect(await bodyText(response)).toContain(DROPDOWN)
    expect(await h.api.getPage(harbour.id)).not.toBeNull()
  })

  it("goes ahead once no menu links to the Page", async () => {
    await h.api.updateLayout(topMenu.id, {
      header: [
        blocks.navigation([
          nav.link("Elsewhere", urlLink("https://example.com/elsewhere")),
        ]),
      ],
    })
    const response = await h.api.deletePage(cottage.id)
    expect(response.ok(), await bodyText(response)).toBe(true)
    expect(await h.api.getPage(cottage.id)).toBeNull()
  })
})
