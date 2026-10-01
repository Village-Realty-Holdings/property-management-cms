import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { markedRegions, headerMark, type Doc } from "./support/api"
import {
  chromeOf,
  closeHarness,
  openHarness,
  type Harness,
} from "./support/site"

/**
 * Phase 3 acceptance: the default Layout (apps/site ADR-0006, spec "Layouts
 * and region Blocks"). SiteFrame's hardcoded header and footer became a
 * seeded default Layout, so a Site that has only migrated still shows the
 * Brand's header and footer; and there is always exactly one default Layout.
 */

let h: Harness

beforeAll(async () => {
  h = await openHarness()
})

afterAll(async () => {
  await closeHarness(h)
})

describe("the seeded default Layout", () => {
  it("exists on a migrated Site: exactly one Layout is the default", async () => {
    const defaults = await h.api.defaultLayouts()
    expect(defaults).toHaveLength(1)
    const [layout] = defaults as [Doc]
    expect(typeof layout.name === "string" && layout.name.length > 0).toBe(true)
    // SiteFrame's header and footer, now as region Blocks.
    expect(Array.isArray(layout.header) && layout.header.length > 0).toBe(true)
    expect(Array.isArray(layout.footer) && layout.footer.length > 0).toBe(true)
  })

  it("has no Drafts: it is live as saved", async () => {
    const [layout] = (await h.api.defaultLayouts()) as [Doc]
    expect(layout).not.toHaveProperty("_status")
  })

  it("wraps a Page with the Brand's header and footer", async () => {
    await h.api.createPage({
      title: "Default Layout check",
      path: "/e2e-default/plain",
    })
    const brandName = await h.api.brandName()
    const chrome = await chromeOf(h.visitor.page, "/e2e-default/plain")
    expect(chrome.status).toBe(200)
    expect(chrome.headers).toBe(1)
    expect(chrome.footers).toBe(1)

    // The Logo Block: the Brand's logo, or its name, linking Home.
    const home = h.visitor.page
      .getByRole("banner")
      .getByRole("link", { name: brandName })
    expect(await home.count()).toBeGreaterThan(0)
    expect(await home.first().getAttribute("href")).toBe("/")
    expect(chrome.footer).toContain(brandName)
  })
})

describe("exactly one default Layout", () => {
  it("moves the default when another Layout is made the default", async () => {
    const original = h.api.originalDefault!
    const other = await h.api.createLayout({
      name: "Default contender",
      ...markedRegions("Default contender"),
    })
    await h.api.updateLayout(other.id, { isDefault: true })

    const defaults = await h.api.defaultLayouts()
    expect(defaults.map((d) => d.id)).toEqual([other.id])
    expect((await h.api.getLayout(original.id))?.isDefault).toBe(false)

    // A Page no path prefix covers now gets the new default.
    const chrome = await chromeOf(h.visitor.page, "/e2e-default/plain")
    expect(chrome.header).toContain(headerMark("Default contender"))

    await h.api.updateLayout(original.id, { isDefault: true })
    expect((await h.api.defaultLayouts()).map((d) => d.id)).toEqual([
      original.id,
    ])
  })

  it("keeps one default when a new Layout is created as the default", async () => {
    const created = await h.api.createLayout({
      name: "Created as default",
      ...markedRegions("Created as default"),
      isDefault: true,
    })
    expect((await h.api.defaultLayouts()).map((d) => d.id)).toEqual([
      created.id,
    ])
    await h.api.updateLayout(h.api.originalDefault!.id, { isDefault: true })
    expect((await h.api.defaultLayouts()).map((d) => d.id)).toEqual([
      h.api.originalDefault!.id,
    ])
  })

  it("never leaves the Site without a default Layout", async () => {
    const original = h.api.originalDefault!
    // Refused, or ignored: either way one Layout is still the default.
    await h.api.patchLayout(original.id, { isDefault: false })
    expect(await h.api.defaultLayouts()).toHaveLength(1)
  })
})
