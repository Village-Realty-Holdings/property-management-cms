import { describe, expect, it } from "vitest"

import { BUILT_IN_FONTS } from "../../fonts/builtIn"
import {
  builtInRows,
  buildFontRows,
  sampleCss,
  SAMPLE_TEXT,
  type StoredFontRecord,
} from "./rows"

const slab: StoredFontRecord = {
  id: 7,
  family: "Roboto Slab",
  kind: "slab",
  source: "google",
  files: [
    { weight: 700, style: "normal", url: "/api/font-files/file/rs-700.woff2" },
    { weight: 400, style: "normal", url: "/api/font-files/file/rs-400.woff2" },
  ],
}

describe("buildFontRows", () => {
  it("describes a Font for the list, its faces in weight order", () => {
    const [row] = buildFontRows([slab], new Map())
    expect(row).toMatchObject({
      id: 7,
      family: "Roboto Slab",
      kindLabel: "Slab serif",
      sourceLabel: "Google Fonts",
      summary: "2 weights (400, 700)",
      locked: false,
      usages: [],
      deleteBlockedReason: null,
    })
    expect(row!.faces.map((f) => f.label)).toEqual(["400 Regular", "700 Bold"])
  })

  it("locks a Font in use and says what uses it", () => {
    const [row] = buildFontRows(
      [slab],
      new Map([
        [
          7,
          ["Used by the Theme (heading font)", "Used by the Theme (body font)"],
        ],
      ])
    )
    expect(row!.locked).toBe(true)
    expect(row!.usages).toEqual([
      "Used by the Theme (heading font)",
      "Used by the Theme (body font)",
    ])
    expect(row!.deleteBlockedReason).toBe(
      "Roboto Slab is in use, so it can't be deleted. Change what uses it first."
    )
  })

  it("lists the earlier Theme versions that used a Font, apart from what locks it", () => {
    const [row, other] = buildFontRows(
      [slab, { ...slab, id: 8, family: "Karla" }],
      new Map(),
      new Map([[7, ["2026-03-01T10:05:00.000Z", "2026-02-01T09:00:00.000Z"]]])
    )
    expect(row!.earlierThemeVersions).toEqual([
      "Mar 1, 2026, 10:05 AM UTC",
      "Feb 1, 2026, 9:00 AM UTC",
    ])
    // They do not lock it: only the live Theme does.
    expect(row!.locked).toBe(false)
    expect(row!.deleteBlockedReason).toBeNull()
    expect(other!.earlierThemeVersions).toEqual([])
  })

  it("gives each Font its own sample family, apart from any built-in name", () => {
    const rows = buildFontRows(
      [slab, { ...slab, id: 8, family: "Karla" }],
      new Map()
    )
    expect(rows.map((r) => r.sampleFamily)).toEqual([
      "admin-font-sample-7",
      "admin-font-sample-8",
    ])
  })

  it("keeps the order it is given", () => {
    const rows = buildFontRows(
      [
        { ...slab, id: 1, family: "A" },
        { ...slab, id: 2, family: "B" },
      ],
      new Map()
    )
    expect(rows.map((r) => r.family)).toEqual(["A", "B"])
  })
})

describe("sampleCss", () => {
  it("declares each Font's files under its sample family, from the Site itself", () => {
    const rows = buildFontRows([slab], new Map())
    const css = sampleCss(rows)
    expect(css.match(/@font-face/g)).toHaveLength(2)
    expect(css).toContain('font-family:"admin-font-sample-7"')
    expect(css).toContain('url("/api/font-files/file/rs-400.woff2")')
    expect(css).not.toContain("Roboto Slab")
    expect(css).not.toMatch(/https?:/)
    expect(css).not.toContain("<")
  })

  it("is empty with no Fonts", () => {
    expect(sampleCss([])).toBe("")
  })
})

describe("builtInRows", () => {
  it("lists the six built-in fonts with the CSS variable each defines", () => {
    const rows = builtInRows()
    expect(rows).toHaveLength(BUILT_IN_FONTS.length)
    expect(rows[0]).toMatchObject({
      family: "Newsreader",
      kindLabel: "Serif",
      sampleFontFamily: "var(--font-classic-display)",
    })
    expect(rows.map((r) => r.family)).toEqual(
      BUILT_IN_FONTS.map((f) => f.family)
    )
  })

  it("hides a built-in quick pick while a stored Font has that family", () => {
    const stored = [
      { family: "karla", faces: [{ weight: 400 }] },
      { family: "Lora", faces: [{ weight: 400 }] },
    ]
    const families = builtInRows(stored).map((r) => r.family)
    expect(families).not.toContain("Karla")
    expect(families).toContain("Zilla Slab")
    expect(families).toHaveLength(BUILT_IN_FONTS.length - 1)
  })

  it("keeps the quick pick when the stored Font has no files", () => {
    const rows = builtInRows([{ family: "Karla", faces: [] }])
    expect(rows.map((r) => r.family)).toContain("Karla")
  })

  it("names their weights", () => {
    const zilla = builtInRows().find((r) => r.family === "Zilla Slab")!
    expect(zilla.summary).toBe("3 weights (500, 600, 700)")
    expect(zilla.faces.map((f) => f.label)).toEqual([
      "500 Medium",
      "600 Semi Bold",
      "700 Bold",
    ])
  })
})

describe("SAMPLE_TEXT", () => {
  it("is one line of ordinary words", () => {
    expect(SAMPLE_TEXT).not.toContain("\n")
    expect(SAMPLE_TEXT.length).toBeGreaterThan(20)
  })
})
