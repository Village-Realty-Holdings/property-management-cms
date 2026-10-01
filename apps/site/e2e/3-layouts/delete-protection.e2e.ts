import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bodyText, headerMark, markedRegions, type Doc } from "./support/api"
import {
  chromeOf,
  closeHarness,
  openHarness,
  type Harness,
} from "./support/site"

/**
 * Phase 3 acceptance: deleting Layouts (apps/site ADR-0006).
 *
 * - The default Layout can't be deleted.
 * - Nor can a Layout that Pages pick explicitly; the error lists those Pages.
 * - A Layout that is only a path default can be: its paths simply drop, and
 *   the Pages under them fall back to the next match (here, the default).
 */

const PREFIX = "/e2e-delete"
const PICKED = "Picked by Pages"
const PATHS_ONLY = "Paths only"

let h: Harness
let picked: Doc
let pathsOnly: Doc
let pickedPages: Doc[]

beforeAll(async () => {
  h = await openHarness()
  picked = await h.api.createLayout({
    name: PICKED,
    ...markedRegions(PICKED),
  })
  pathsOnly = await h.api.createLayout({
    name: PATHS_ONLY,
    paths: [PREFIX],
    ...markedRegions(PATHS_ONLY),
  })
  pickedPages = [
    await h.api.createPage({
      title: "Picks it once",
      path: `${PREFIX}-picks/one`,
      layout: { mode: "specific", layout: picked.id },
    }),
    await h.api.createPage({
      title: "Picks it twice",
      path: `${PREFIX}-picks/two`,
      layout: { mode: "specific", layout: picked.id },
    }),
  ]
  await h.api.createPage({ title: "Under the path", path: `${PREFIX}/stay` })
})

afterAll(async () => {
  await closeHarness(h)
})

describe("deleting the default Layout", () => {
  it("is refused, saying it is the default", async () => {
    const original = h.api.originalDefault!
    const response = await h.api.deleteLayout(original.id)
    expect(response.ok(), "the delete is refused").toBe(false)
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(response.status()).toBeLessThan(500)
    expect(await bodyText(response)).toMatch(/default/i)
    expect(await h.api.getLayout(original.id)).not.toBeNull()
    expect(await h.api.defaultLayouts()).toHaveLength(1)
  })
})

describe("deleting a Layout that Pages pick", () => {
  it("is refused, and the error lists those Pages", async () => {
    const response = await h.api.deleteLayout(picked.id)
    expect(response.ok(), "the delete is refused").toBe(false)
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(response.status()).toBeLessThan(500)
    const body = await bodyText(response)
    expect(body).toContain("Picks it once")
    expect(body).toContain("Picks it twice")
    expect(await h.api.getLayout(picked.id)).not.toBeNull()
    const chrome = await chromeOf(h.visitor.page, `${PREFIX}-picks/one`)
    expect(chrome.header).toContain(headerMark(PICKED))
  })

  it("goes ahead once no Page picks it", async () => {
    for (const page of pickedPages)
      await h.api.updatePage(page.id, { layout: { mode: "route" } })
    const response = await h.api.deleteLayout(picked.id)
    expect(response.ok(), await bodyText(response)).toBe(true)
    expect(await h.api.getLayout(picked.id)).toBeNull()
  })
})

describe("deleting a Layout that is only a path default", () => {
  it("goes ahead, and its Pages fall back to the default Layout", async () => {
    let chrome = await chromeOf(h.visitor.page, `${PREFIX}/stay`)
    expect(chrome.header).toContain(headerMark(PATHS_ONLY))

    const response = await h.api.deleteLayout(pathsOnly.id)
    expect(response.ok(), await bodyText(response)).toBe(true)
    expect(await h.api.getLayout(pathsOnly.id)).toBeNull()

    chrome = await chromeOf(h.visitor.page, `${PREFIX}/stay`)
    expect(chrome.status).toBe(200)
    expect(chrome.headers).toBe(1)
    expect(chrome.header).not.toContain(headerMark(PATHS_ONLY))
    // The same Header as a Page no Layout's path covers.
    const plain = await chromeOf(h.visitor.page, `${PREFIX}-picks/one`)
    expect(chrome.header).toBe(plain.header)
  })
})
