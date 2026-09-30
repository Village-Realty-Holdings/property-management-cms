import { describe, expect, it } from "vitest"

import { combineFonts } from "../../src/fonts/available"
import { CLASSIC, HARBOUR, MEADOW, deriveTheme } from "../../src/theme"
import {
  buttonExpectation,
  cardExpectation,
  dialogExpectation,
  expectedReducedMotionTokens,
  expectedRootTokens,
  headingExpectation,
  inputExpectation,
  tokenMismatches,
} from "./expectations"

const theme = (inputs = HARBOUR.inputs) => ({
  inputs,
  fonts: combineFonts([]),
})

describe("expectedRootTokens", () => {
  it("is what the Theme derives for its inputs and resolved fonts", () => {
    const tokens = expectedRootTokens(theme())
    // Harbour: teal primary, bold uppercase buttons, square corners.
    expect(tokens["--primary"]).toBe("#2d4447")
    expect(tokens["--btn-radius"]).toBe("0px")
    expect(tokens["--btn-transform"]).toBe("uppercase")
    expect(tokens["--card-radius"]).toBe("0px")
  })

  it("names the built-in font variables in the font stacks", () => {
    const tokens = expectedRootTokens(theme(CLASSIC.inputs))
    expect(tokens["--font-display"]).toContain("var(--font-classic-display)")
    expect(tokens["--font-sans"]).toContain("var(--font-classic-body)")
  })

  it("matches the semantic tokens deriveTheme builds, unchanged", () => {
    const derived = deriveTheme(MEADOW.inputs, {
      heading: "var(--font-rustic-display), serif",
      body: "var(--font-rustic-body), system-ui, sans-serif",
    }).schemes.light
    expect(expectedRootTokens(theme(MEADOW.inputs))).toEqual(derived)
  })
})

describe("expectedReducedMotionTokens", () => {
  it("stops movement and animation", () => {
    expect(expectedReducedMotionTokens(theme())).toEqual({
      "--duration": "0ms",
      "--btn-lift": "0px",
    })
  })
})

describe("element expectations", () => {
  const tokens = expectedRootTokens(theme(HARBOUR.inputs))

  it("a button reads the button tokens, colours included", () => {
    expect(buttonExpectation(tokens)).toMatchObject({
      "background-color": tokens["--btn-bg"],
      color: tokens["--btn-fg"],
      "border-radius": tokens["--btn-radius"],
      height: tokens["--btn-height"],
      "padding-left": tokens["--btn-px"],
      "font-weight": tokens["--btn-weight"],
      "text-transform": tokens["--btn-transform"],
      "letter-spacing": tokens["--btn-tracking"],
      "border-top-width": tokens["--btn-border-width"],
      "border-top-color": tokens["--btn-border-color"],
    })
  })

  it("an outline button is transparent with the primary colour as its edge", () => {
    const outline = expectedRootTokens(
      theme({ ...MEADOW.inputs, buttonStyle: "outline" })
    )
    const expected = buttonExpectation(outline)
    expect(expected["background-color"]).toBe("transparent")
    expect(expected["border-top-width"]).toBe("2px")
  })

  it("a card reads the card tokens", () => {
    expect(cardExpectation(tokens)).toMatchObject({
      "background-color": tokens["--card"],
      color: tokens["--card-foreground"],
      "border-radius": tokens["--card-radius"],
    })
  })

  it("a heading reads the display tokens", () => {
    expect(headingExpectation(tokens)).toEqual({
      "font-weight": tokens["--display-weight"],
      "text-transform": tokens["--display-transform"],
      "letter-spacing": tokens["--display-tracking"],
    })
  })

  it("an input reads the input tokens", () => {
    expect(inputExpectation(tokens)).toEqual({
      height: tokens["--input-height"],
      "border-radius": tokens["--input-radius"],
      "padding-left": tokens["--input-px"],
    })
  })

  it("a dialog is a popover with the card corners", () => {
    expect(dialogExpectation(tokens)).toEqual({
      "background-color": tokens["--popover"],
      color: tokens["--popover-foreground"],
      "border-radius": tokens["--card-radius"],
    })
  })
})

describe("tokenMismatches", () => {
  it("is empty when every token matches", () => {
    expect(
      tokenMismatches({ "--a": "1", "--b": "2" }, { "--a": "1", "--b": "2" })
    ).toEqual([])
  })

  it("names each token that differs or is missing", () => {
    expect(
      tokenMismatches(
        { "--a": "1", "--b": "2", "--c": "3" },
        { "--a": "1", "--b": "x", "--c": "" }
      )
    ).toEqual([
      { token: "--b", expected: "2", actual: "x" },
      { token: "--c", expected: "3", actual: "" },
    ])
  })
})
