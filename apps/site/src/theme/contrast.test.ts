import { describe, expect, it } from "vitest"

import { contrastRatio } from "./colour"
import {
  applyFix,
  contrastWarnings,
  TEXT_PAIRS,
  textPairFailures,
  type ContrastWarning,
} from "./contrast"
import { deriveTheme } from "./derive"
import type { ThemeInputs } from "./inputs"
import { HARBOUR, PRESETS } from "./presets"

const fonts = { heading: "serif", body: "sans-serif" }
const inputs = (over: Partial<ThemeInputs> = {}): ThemeInputs => ({
  ...HARBOUR.inputs,
  ...over,
})
const ids = (w: ContrastWarning[]) => w.map((x) => x.id)

describe("contrastWarnings", () => {
  it("is empty for a healthy Theme", () => {
    expect(contrastWarnings(inputs())).toEqual([])
  })

  it("warns when the text colour is too pale for the page", () => {
    const [warning, ...rest] = contrastWarnings(inputs({ text: "#9a9a9a" }))
    expect(rest).toEqual([])
    expect(warning).toMatchObject({
      id: "text-on-page",
      field: "text",
      needed: 4.5,
    })
    expect(warning!.ratio).toBeLessThan(4.5)
    expect(warning!.message).toMatch(/text/i)
    expect(warning!.fix.field).toBe("text")
  })

  it("warns about a pale primary only when it is the edge of outline buttons", () => {
    const pale = { primary: "#f0c800" }
    expect(
      ids(contrastWarnings(inputs({ ...pale, buttonStyle: "solid" })))
    ).toEqual([])
    const [warning] = contrastWarnings(
      inputs({ ...pale, buttonStyle: "outline" })
    )
    expect(warning).toMatchObject({
      id: "primary-outline-edge",
      field: "primary",
      needed: 3,
    })
    expect(warning!.ratio).toBeLessThan(3)
  })

  it("does not warn about a pale accent: it is a fill with derived text", () => {
    expect(
      contrastWarnings(inputs({ accent: "#fcd900", buttonStyle: "outline" }))
    ).toEqual([])
  })

  it("can report several at once", () => {
    const w = contrastWarnings(
      inputs({
        text: "#aaaaaa",
        primary: "#ffee00",
        buttonStyle: "outline",
      })
    )
    expect(ids(w).sort()).toEqual(["primary-outline-edge", "text-on-page"])
  })

  it("never throws on bad input", () => {
    expect(() =>
      contrastWarnings({
        ...HARBOUR.inputs,
        primary: "x",
        text: "",
      } as ThemeInputs)
    ).not.toThrow()
  })
})

describe("suggested fixes", () => {
  const bad: Partial<ThemeInputs>[] = [
    { text: "#9a9a9a" },
    { text: "#e0e0e0" },
    { text: "#777777", neutralTint: "warm" },
    { primary: "#f0c800", buttonStyle: "outline" },
    { primary: "#ffffff", buttonStyle: "outline", neutralTint: "brand" },
    { primary: "#e8e8e8", buttonStyle: "outline", neutralTint: "brand" },
    { primary: "#dddddd", text: "#bbbbbb", buttonStyle: "outline" },
  ]

  it.each(bad)("applying each fix clears its warning: %j", (over) => {
    const start = inputs(over)
    const warnings = contrastWarnings(start)
    expect(warnings.length).toBeGreaterThan(0)
    for (const warning of warnings) {
      const fixed = applyFix(start, warning.fix)
      expect(ids(contrastWarnings(fixed))).not.toContain(warning.id)
    }
  })

  it("applying every fix in turn clears them all", () => {
    let current = inputs({
      text: "#aaaaaa",
      primary: "#ffee00",
      buttonStyle: "outline",
    })
    for (const warning of contrastWarnings(current))
      current = applyFix(current, warning.fix)
    expect(contrastWarnings(current)).toEqual([])
  })

  it("is a concrete, valid replacement that changes only one input", () => {
    const start = inputs({ text: "#9a9a9a" })
    const [warning] = contrastWarnings(start)
    expect(warning!.fix.value).toMatch(/^#[0-9a-f]{6}$/)
    expect(warning!.fix.value).not.toBe(start.text)
    expect(applyFix(start, warning!.fix)).toEqual({
      ...start,
      text: warning!.fix.value,
    })
  })

  it("keeps the fixed colour close to the original (the least change)", () => {
    const start = inputs({ text: "#7a7a7a" })
    const [warning] = contrastWarnings(start)
    // #767676 is the AA boundary grey on white; the page is near-white.
    expect(contrastRatio(warning!.fix.value, "#ffffff")).toBeLessThan(6)
  })
})

describe("textPairFailures", () => {
  it("is empty for derived tokens", () => {
    expect(
      textPairFailures(deriveTheme(HARBOUR.inputs, fonts).schemes.light)
    ).toEqual([])
  })

  it("names a pair that falls below AA", () => {
    const tokens = {
      ...deriveTheme(HARBOUR.inputs, fonts).schemes.light,
      "--primary-foreground": "#3a5a5e",
    }
    const failures = textPairFailures(tokens)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatchObject({
      foreground: "--primary-foreground",
      background: "--primary",
    })
    expect(failures[0]!.ratio).toBeLessThan(4.5)
  })
})

describe("buttons on every surface a Block puts them on", () => {
  const pairs = (names: string[]) =>
    names.every((name) =>
      TEXT_PAIRS.some(([fg, bg]) => fg === name || bg === name)
    )

  it("checks the accent button's hover and the button on the accent panel", () => {
    expect(
      pairs([
        "--accent-hover-foreground",
        "--btn-on-accent-fg",
        "--btn-on-accent-fg-hover",
      ])
    ).toBe(true)
  })

  it.each(
    PRESETS.flatMap(
      (p) =>
        [
          [p.name, p, "solid"],
          [p.name, p, "outline"],
        ] as const
    )
  )("%s passes AA with %s", (_, preset, buttonStyle) => {
    const tokens = deriveTheme({ ...preset.inputs, buttonStyle }, fonts).schemes
      .light
    expect(textPairFailures(tokens)).toEqual([])
  })

  it("an outline label left in the link colour fails on the accent panel", () => {
    const tokens = {
      ...deriveTheme({ ...HARBOUR.inputs, buttonStyle: "outline" }, fonts)
        .schemes.light,
    }
    tokens["--btn-on-accent-fg"] = tokens["--accent"]!
    const failures = textPairFailures(tokens)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatchObject({ foreground: "--btn-on-accent-fg" })
    expect(failures[0]!.ratio).toBeLessThan(4.5)
  })

  it("a transparent button sits on the panel it is drawn on, not the page", () => {
    const tokens = {
      ...deriveTheme({ ...HARBOUR.inputs, buttonStyle: "outline" }, fonts)
        .schemes.light,
      "--accent": "#ffffff",
      "--btn-on-accent-fg": "#ffffff",
    }
    expect(textPairFailures(tokens).map((f) => f.foreground)).toContain(
      "--btn-on-accent-fg"
    )
  })
})
