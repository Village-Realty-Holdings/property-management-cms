import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { compareImages } from "../theme/images"
import { screenshot, visit } from "../theme/support/browser"
import {
  blocks,
  bodyText,
  footerMark,
  type Block,
  type Doc,
} from "./support/api"
import {
  chromeOf,
  closeHarness,
  openHarness,
  type Harness,
} from "./support/site"

/**
 * Phase 3 acceptance: Layouts go live on save, with a history and restore
 * (apps/site ADR-0006). There are no Drafts: a save changes every Page that
 * uses the Layout on its next load, with nothing to publish. Each save is
 * kept as a version, and restoring an earlier version puts the Site back
 * exactly (compared pixel for pixel), by saving it as a new version.
 */

const PREFIX = "/e2e-live"
const NAME = "Seasonal"

let h: Harness
let layout: Doc
const pages = [`${PREFIX}`, `${PREFIX}/cabin`, `${PREFIX}/lodge`]

const header = (text: string): Block[] => [
  blocks.utilityStrip(text),
  blocks.logo(),
]

/** The utility strip's text in a version of the Layout. */
function stripText(version: Doc): string | undefined {
  const saved = (version.version ?? version) as { header?: Block[] }
  const strip = saved.header?.find((b) => b.blockType === "utilityStrip")
  return strip?.text as string | undefined
}

beforeAll(async () => {
  h = await openHarness()
  layout = await h.api.createLayout({
    name: NAME,
    paths: [PREFIX],
    header: header("Summer sale: 10% off"),
    footer: [blocks.legalBar(footerMark(NAME))],
  })
  for (const path of pages)
    await h.api.createPage({ title: `Live ${path}`, path })
})

afterAll(async () => {
  await closeHarness(h)
})

describe("saving a Layout", () => {
  let before: Buffer

  it("is what every Page using it shows", async () => {
    for (const path of pages) {
      const chrome = await chromeOf(h.visitor.page, path)
      expect(chrome.header, path).toContain("Summer sale: 10% off")
    }
    await visit(h.visitor.page, PREFIX)
    before = await screenshot(h.visitor.page)
  })

  it("has no Drafts", async () => {
    const saved = await h.api.getLayout(layout.id)
    expect(saved).not.toHaveProperty("_status")
  })

  it("goes live on every Page at once, with nothing to publish", async () => {
    await h.api.updateLayout(layout.id, {
      header: header("Winter sale: 20% off"),
    })
    for (const path of pages) {
      const chrome = await chromeOf(h.visitor.page, path)
      expect(chrome.header, path).toContain("Winter sale: 20% off")
      expect(chrome.header, path).not.toContain("Summer sale")
    }
    await visit(h.visitor.page, PREFIX)
    const after = await screenshot(h.visitor.page)
    expect(compareImages(before, after).differentPixels).toBeGreaterThan(0)
  })

  it("keeps each save as a version", async () => {
    const versions = await h.api.layoutVersions(layout.id)
    expect(versions.length).toBeGreaterThanOrEqual(2)
    const texts = versions.map(stripText)
    // Newest first.
    expect(texts[0]).toBe("Winter sale: 20% off")
    expect(texts).toContain("Summer sale: 10% off")
    for (const version of versions)
      expect(Number.isNaN(Date.parse(String(version.updatedAt)))).toBe(false)
  })
})

describe("restoring a Layout version", () => {
  it("puts every Page back exactly, and saves the restore as a new version", async () => {
    const versions = await h.api.layoutVersions(layout.id)
    const summer = versions.find((v) => stripText(v) === "Summer sale: 10% off")
    expect(summer, "the Summer version is in the history").toBeDefined()

    const response = await h.api.restoreLayoutVersion(summer!.id)
    expect(response.ok(), await bodyText(response)).toBe(true)

    for (const path of pages) {
      const chrome = await chromeOf(h.visitor.page, path)
      expect(chrome.header, path).toContain("Summer sale: 10% off")
      expect(chrome.header, path).not.toContain("Winter sale")
    }
    const after = await h.api.layoutVersions(layout.id)
    expect(after.length, "restoring adds a version").toBe(versions.length + 1)
    expect(stripText(after[0]!)).toBe("Summer sale: 10% off")
  })
})

describe("restoring puts the Site back pixel for pixel", () => {
  it("matches the screenshot taken before the change", async () => {
    await h.api.updateLayout(layout.id, { header: header("Spring sale") })
    await visit(h.visitor.page, PREFIX)
    const spring = await screenshot(h.visitor.page)

    await h.api.updateLayout(layout.id, { header: header("Autumn sale") })
    await visit(h.visitor.page, PREFIX)
    const autumn = await screenshot(h.visitor.page)
    expect(compareImages(spring, autumn).differentPixels).toBeGreaterThan(0)

    const versions = await h.api.layoutVersions(layout.id)
    const target = versions.find((v) => stripText(v) === "Spring sale")
    const response = await h.api.restoreLayoutVersion(target!.id)
    expect(response.ok(), await bodyText(response)).toBe(true)

    await visit(h.visitor.page, PREFIX)
    const restored = await screenshot(h.visitor.page)
    const result = compareImages(spring, restored)
    expect(result.sameSize).toBe(true)
    expect(result.differentPixels).toBe(0)
  })
})
