import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  footerMark,
  headerMark,
  markedRegions,
  type Doc,
  type LayoutChoice,
} from "./support/api"
import {
  chromeOf,
  closeHarness,
  openHarness,
  type Harness,
} from "./support/site"

/**
 * Phase 3 acceptance: the Site renders each Page with its resolved Layout
 * (apps/site ADR-0006):
 *
 *   1. the Layout the Page picks ("specific"),
 *   2. no Layout when the Page picks "No Layout" ("none"),
 *   3. else the Layout whose path prefix is the longest match ("/stays"
 *      covers "/stays" and everything under it, and nothing else),
 *   4. else the default Layout.
 *
 * Every Layout here writes its name in its Header (a Utility strip) and its
 * Footer (a Legal bar), and each case opens the Page as a visitor and reads
 * which Header and Footer it got.
 *
 * The prefixes are made so that neither "first created wins" nor "last
 * created wins" gives the right answer: only the longest match does.
 */

const DEFAULT = "Resolution default"
const NORTH = "Stays north" // /e2e-stays/north, created first
const STAYS = "Stays" // /e2e-stays, created second
const LODGES = "Stays north lodges" // /e2e-stays/north/lodges, created third
const PINNED = "Pinned" // no paths; picked by a Page

let h: Harness
const layouts: Record<string, Doc> = {}

async function layout(name: string, paths: string[] = [], isDefault = false) {
  layouts[name] = await h.api.createLayout({
    name,
    paths,
    isDefault,
    ...markedRegions(name),
  })
}

beforeAll(async () => {
  h = await openHarness()
  await layout(DEFAULT, [], true)
  await layout(NORTH, ["/e2e-stays/north"])
  await layout(STAYS, ["/e2e-stays"])
  await layout(LODGES, ["/e2e-stays/north/lodges"])
  await layout(PINNED)
})

afterAll(async () => {
  await closeHarness(h)
})

type Case = {
  title: string
  path: string
  layout?: LayoutChoice | "pinned"
  /** The Layout the Page must render with, or null for none. */
  expected: string | null
}

const CASES: Case[] = [
  {
    title: "Stays index",
    path: "/e2e-stays",
    layout: { mode: "route" },
    expected: STAYS,
  },
  {
    title: "Beach house",
    path: "/e2e-stays/beach-house",
    layout: { mode: "route" },
    expected: STAYS,
  },
  {
    title: "North cabin",
    path: "/e2e-stays/north/cabin",
    layout: { mode: "route" },
    expected: NORTH,
  },
  {
    title: "Pine lodge",
    path: "/e2e-stays/north/lodges/pine",
    layout: { mode: "route" },
    expected: LODGES,
  },
  {
    // "/e2e-stays" is a path prefix, not a string prefix.
    title: "Staysfoo",
    path: "/e2e-staysfoo",
    layout: { mode: "route" },
    expected: DEFAULT,
  },
  {
    title: "About us",
    path: "/e2e-about",
    layout: { mode: "route" },
    expected: DEFAULT,
  },
  {
    // A Page saved without choosing: "route" is the default mode.
    title: "Implicit route",
    path: "/e2e-stays/implicit",
    expected: STAYS,
  },
  {
    // A specific Layout wins over a matching path prefix.
    title: "Pinned stay",
    path: "/e2e-stays/north/pinned",
    layout: "pinned",
    expected: PINNED,
  },
  {
    title: "Bare stay",
    path: "/e2e-stays/bare",
    layout: { mode: "none" },
    expected: null,
  },
]

describe("resolving a Page's Layout on the Site", () => {
  it("makes the spec's default the only default Layout", async () => {
    const defaults = await h.api.defaultLayouts()
    expect(defaults.map((d) => d.name)).toEqual([DEFAULT])
  })

  it.each(CASES.map((c) => [c.path, c] as const))(
    "renders %s with its resolved Layout",
    async (_path, c) => {
      await h.api.createPage({
        title: c.title,
        path: c.path,
        layout:
          c.layout === "pinned"
            ? { mode: "specific", layout: layouts[PINNED]!.id }
            : c.layout,
      })
      const chrome = await chromeOf(h.visitor.page, c.path)
      expect(chrome.status).toBe(200)

      if (c.expected === null) {
        expect(chrome.headers, "no Header").toBe(0)
        expect(chrome.footers, "no Footer").toBe(0)
        // The Page itself still renders.
        expect(await h.visitor.page.title()).toContain(c.title)
        return
      }
      expect(chrome.headers, "one Header").toBe(1)
      expect(chrome.footers, "one Footer").toBe(1)
      expect(chrome.header).toContain(headerMark(c.expected))
      expect(chrome.footer).toContain(footerMark(c.expected))
      for (const other of Object.keys(layouts)) {
        if (other === c.expected) continue
        expect(chrome.header).not.toContain(headerMark(other))
      }
    }
  )

  it("follows a Page's change of mode once it is published", async () => {
    const created = await h.api.createPage({
      title: "Changing mind",
      path: "/e2e-stays/changing",
      layout: { mode: "none" },
    })
    expect(
      (await chromeOf(h.visitor.page, "/e2e-stays/changing")).headers
    ).toBe(0)

    await h.api.updatePage(created.id, {
      layout: { mode: "specific", layout: layouts[LODGES]!.id },
    })
    let chrome = await chromeOf(h.visitor.page, "/e2e-stays/changing")
    expect(chrome.header).toContain(headerMark(LODGES))

    await h.api.updatePage(created.id, { layout: { mode: "route" } })
    chrome = await chromeOf(h.visitor.page, "/e2e-stays/changing")
    expect(chrome.header).toContain(headerMark(STAYS))
  })

  it("follows a Layout's paths as soon as the Layout is saved", async () => {
    // Beach house moves from Stays to a new, longer prefix.
    const beach = await h.api.createLayout({
      name: "Beach",
      ...markedRegions("Beach"),
    })
    let chrome = await chromeOf(h.visitor.page, "/e2e-stays/beach-house")
    expect(chrome.header).toContain(headerMark(STAYS))

    await h.api.updateLayout(beach.id, { paths: ["/e2e-stays/beach-house"] })
    chrome = await chromeOf(h.visitor.page, "/e2e-stays/beach-house")
    expect(chrome.header).toContain(headerMark("Beach"))
  })

  it("uses whichever Layout is the default now", async () => {
    await h.api.updateLayout(layouts[PINNED]!.id, { isDefault: true })
    const chrome = await chromeOf(h.visitor.page, "/e2e-about")
    expect(chrome.header).toContain(headerMark(PINNED))
  })
})
