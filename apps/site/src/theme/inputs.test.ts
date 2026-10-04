import { describe, expect, it } from "vitest"

import {
  describeChanges,
  INPUT_HELP,
  normalizeInputs,
  type ThemeInputs,
} from "./inputs"
import {
  BUTTON_CORNERS,
  BUTTON_LETTERS,
  BUTTON_STYLES,
  BUTTON_WEIGHTS,
  CARD_CORNERS,
  HEADING_CASES,
  HEADING_WEIGHTS,
  MOTIONS,
  NEUTRAL_TINTS,
  SHADOWS,
  SPACINGS,
  valuesOf,
} from "./options"

const fallback: ThemeInputs = {
  primary: "#2d4447",
  accent: "#fcd900",
  third: null,
  text: "#1a2a2c",
  darkSurface: null,
  neutralTint: "cool",
  headingFont: "built-in:Bricolage Grotesque",
  bodyFont: "built-in:Instrument Sans",
  headingWeight: "bold",
  headingCase: "normal",
  buttonCorners: "square",
  cardCorners: "square",
  spacing: "spacious",
  shadows: "subtle",
  buttonStyle: "solid",
  buttonLetters: "uppercase",
  buttonWeight: "bold",
  buttonText: "auto",
  motion: "subtle",
}

describe("option lists (the Theme record's select options)", () => {
  it("list exactly the choices in the spec, in order", () => {
    expect(valuesOf(NEUTRAL_TINTS)).toEqual([
      "neutral",
      "warm",
      "cool",
      "brand",
    ])
    expect(valuesOf(HEADING_WEIGHTS)).toEqual([
      "regular",
      "medium",
      "bold",
      "black",
    ])
    expect(valuesOf(HEADING_CASES)).toEqual(["normal", "uppercase"])
    expect(valuesOf(BUTTON_CORNERS)).toEqual([
      "square",
      "soft",
      "rounded",
      "pill",
    ])
    expect(valuesOf(CARD_CORNERS)).toEqual(["square", "soft", "rounded"])
    expect(valuesOf(SPACINGS)).toEqual(["compact", "comfortable", "spacious"])
    expect(valuesOf(SHADOWS)).toEqual(["none", "subtle", "lifted"])
    expect(valuesOf(BUTTON_STYLES)).toEqual(["solid", "outline"])
    expect(valuesOf(BUTTON_LETTERS)).toEqual(["normal", "uppercase", "title"])
    expect(valuesOf(BUTTON_WEIGHTS)).toEqual(["regular", "medium", "bold"])
    expect(valuesOf(MOTIONS)).toEqual(["none", "subtle", "lively"])
  })

  it("labels are what Users read", () => {
    expect(BUTTON_LETTERS.map((o) => o.label)).toEqual([
      "Normal",
      "UPPERCASE",
      "Title Case",
    ])
  })
})

describe("normalizeInputs", () => {
  it("keeps valid values, normalising hex", () => {
    const out = normalizeInputs(
      { primary: "#ABC", third: "#F2E3C9", motion: "lively" },
      fallback
    )
    expect(out.primary).toBe("#aabbcc")
    expect(out.third).toBe("#f2e3c9")
    expect(out.motion).toBe("lively")
  })

  it("replaces invalid or missing values with the fallback", () => {
    const out = normalizeInputs(
      {
        primary: "blue",
        accent: 12,
        text: null,
        spacing: "huge",
        buttonCorners: undefined,
        headingFont: "",
      },
      fallback
    )
    expect(out).toEqual(fallback)
  })

  it("treats an empty optional colour as unset", () => {
    const out = normalizeInputs(
      { third: "", darkSurface: null },
      { ...fallback, third: "#123456", darkSurface: "#000000" }
    )
    expect(out.third).toBeNull()
    expect(out.darkSurface).toBeNull()
  })

  it("keeps an invalid optional colour out rather than throwing", () => {
    expect(normalizeInputs({ third: "nope" }, fallback).third).toBeNull()
  })

  it("accepts none of the input when given nothing", () => {
    expect(normalizeInputs(null, fallback)).toEqual(fallback)
    expect(normalizeInputs("x", fallback)).toEqual(fallback)
  })
})

describe("describeChanges", () => {
  it("names what differs, in the order of the controls", () => {
    expect(
      describeChanges(fallback, {
        ...fallback,
        shadows: "lifted",
        primary: "#000000",
        bodyFont: "font:3",
      })
    ).toEqual(["Primary colour", "Body font", "Shadows"])
  })
  it("is empty when nothing changed", () => {
    expect(describeChanges(fallback, { ...fallback })).toEqual([])
  })
})

describe("control help text", () => {
  it("says the button Style applies to primary buttons", () => {
    expect(INPUT_HELP.buttonStyle).toBe(
      "Style applies to primary buttons. The accent button stays filled."
    )
  })
})

describe("a Theme from before Button text existed", () => {
  it("reads as Automatic, and still imports", async () => {
    const { inputProblems, normalizeInputs } = await import("./inputs")
    const { CLASSIC } = await import("./presets")
    const { buttonText: _dropped, ...old } = CLASSIC.inputs
    void _dropped
    expect(normalizeInputs(old, CLASSIC.inputs).buttonText).toBe("auto")
    // Fonts in a file are family names; the rest is as stored.
    expect(inputProblems(old)).toEqual([])
    expect(inputProblems({ ...old, buttonText: "pink" })).toEqual([
      "Button text must be one of: auto, white, dark.",
    ])
  })
})
