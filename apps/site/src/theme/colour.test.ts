import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  mix,
  normalizeHex,
  nudgeToContrast,
  readableOn,
} from "./colour"

describe("normalizeHex", () => {
  it("lower-cases and expands short hex", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc")
    expect(normalizeHex(" #0E5E6F ")).toBe("#0e5e6f")
  })
  it("rejects anything else", () => {
    for (const bad of [
      "red",
      "#12",
      "#gggggg",
      "",
      null,
      undefined,
      "#1234567",
    ])
      expect(normalizeHex(bad)).toBeNull()
  })
})

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5)
    // #767676 on white is the well-known AA boundary grey (4.54).
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2)
  })
  it("is symmetric", () => {
    expect(contrastRatio("#ce4b25", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#ce4b25"),
      10
    )
  })
})

describe("mix", () => {
  it("interpolates in sRGB", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080")
    expect(mix("#102030", "#ffffff", 0)).toBe("#102030")
    expect(mix("#102030", "#ffffff", 1)).toBe("#ffffff")
  })
})

describe("readableOn", () => {
  it("prefers white when it passes AA", () => {
    expect(readableOn("#0e5e6f", "#10323a")).toBe("#ffffff")
    // white on #ce4b25 is 4.51
    expect(readableOn("#ce4b25", "#072629")).toBe("#ffffff")
  })
  it("falls back to the ink, then black", () => {
    expect(readableOn("#ff7f5c", "#10323a")).toBe("#10323a")
    expect(readableOn("#ff7f5c", "#ffffff")).toBe("#000000")
    expect(readableOn("#fcd900", "#16181b")).toBe("#16181b")
  })
  it("always reaches AA, whatever the ink", () => {
    const hex = (n: number) => n.toString(16).padStart(2, "0")
    for (let r = 0; r < 256; r += 17)
      for (let g = 0; g < 256; g += 17)
        for (let b = 0; b < 256; b += 51) {
          const bg = `#${hex(r)}${hex(g)}${hex(b)}`
          expect(
            contrastRatio(bg, readableOn(bg, "#777777"))
          ).toBeGreaterThanOrEqual(4.5)
        }
  })
})

describe("nudgeToContrast", () => {
  it("returns the colour unchanged when it already passes", () => {
    expect(nudgeToContrast("#000000", "#ffffff", 4.5)).toBe("#000000")
  })
  it("darkens against a light surface until the ratio is met", () => {
    const out = nudgeToContrast("#ce4b25", "#ffffff", 7)
    expect(contrastRatio(out, "#ffffff")).toBeGreaterThanOrEqual(7)
    expect(contrastRatio(out, "#ffffff")).toBeLessThan(7.5)
  })
  it("lightens against a dark surface", () => {
    const out = nudgeToContrast("#204050", "#0b2a31", 4.5)
    expect(contrastRatio(out, "#0b2a31")).toBeGreaterThanOrEqual(4.5)
  })
})
