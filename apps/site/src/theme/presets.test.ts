import { describe, expect, it } from "vitest"

import { contrastWarnings, textPairFailures } from "./contrast"
import { deriveTheme } from "./derive"
import { normalizeInputs } from "./inputs"
import {
  BRAND_PRESETS,
  DEFAULT_INPUTS,
  GENERAL_PRESETS,
  PRESETS,
  findPreset,
  presetInputs,
} from "./presets"

const fonts = { heading: "serif", body: "sans-serif" }

describe("the preset list", () => {
  it("has the four general presets", () => {
    expect(GENERAL_PRESETS.map((p) => p.name)).toEqual([
      "Harbour",
      "Terracotta",
      "Classic",
      "Meadow",
    ])
  })

  it("has one preset per Site brand", () => {
    expect(BRAND_PRESETS.map((p) => p.name)).toEqual([
      "Warren Beach",
      "Avada",
      "Beachside",
    ])
    expect(BRAND_PRESETS.every((p) => p.brand)).toBe(true)
    expect(GENERAL_PRESETS.some((p) => p.brand)).toBe(false)
  })

  it("has unique ids, findable by id", () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findPreset("avada")?.name).toBe("Avada")
    expect(findPreset("nope")).toBeUndefined()
  })

  it("starts a new Theme from Harbour", () => {
    expect(DEFAULT_INPUTS).toBe(findPreset("harbour")!.inputs)
  })
})

describe.each(PRESETS.map((p) => [p.name, p] as const))(
  "preset %s",
  (_, preset) => {
    it("is a complete, valid set of inputs", () => {
      expect(normalizeInputs(preset.inputs, DEFAULT_INPUTS)).toEqual(
        preset.inputs
      )
      expect(preset.blurb.length).toBeGreaterThan(10)
    })

    it("derives without throwing", () => {
      expect(() => deriveTheme(preset.inputs, fonts)).not.toThrow()
    })

    it("passes AA for every text-bearing token", () => {
      expect(
        textPairFailures(deriveTheme(preset.inputs, fonts).schemes.light)
      ).toEqual([])
    })

    it("has no contrast warnings", () => {
      expect(contrastWarnings(preset.inputs)).toEqual([])
    })

    it("uses built-in fonts, so it works before any font is added", () => {
      expect(preset.inputs.headingFont).toMatch(/^built-in:/)
      expect(preset.inputs.bodyFont).toMatch(/^built-in:/)
    })
  }
)

describe("the brand presets keep the brand's palette", () => {
  it("Warren Beach: blue, cyan, navy ink and third", () => {
    expect(findPreset("warren-beach")!.inputs).toMatchObject({
      primary: "#0071ce",
      accent: "#009dd6",
      third: "#1f1646",
      text: "#1f1646",
      buttonCorners: "pill",
    })
  })
  it("Avada: the AA orange primary, teal ink, near-black bands, Title Case buttons", () => {
    expect(findPreset("avada")!.inputs).toMatchObject({
      primary: "#ce4b25",
      text: "#072629",
      darkSurface: "#181818",
      buttonLetters: "title",
    })
  })
  it("Beachside: the palette from the spec, pill buttons, rounded cards", () => {
    expect(findPreset("beachside")!.inputs).toMatchObject({
      primary: "#0e5e6f",
      accent: "#ff7f5c",
      third: "#f2e3c9",
      text: "#10323a",
      darkSurface: "#0b2a31",
      buttonCorners: "pill",
      cardCorners: "rounded",
      spacing: "spacious",
      shadows: "subtle",
      motion: "lively",
    })
  })
  it("Beachside puts ink text on the coral accent", () => {
    const light = deriveTheme(findPreset("beachside")!.inputs, fonts).schemes
      .light
    expect(light["--accent-foreground"]).toBe("#10323a")
  })
})

describe("presetInputs", () => {
  const avada = findPreset("avada")!

  it("uses the brand's fonts when the Site has them", () => {
    const inputs = presetInputs(avada, [
      { key: "font:7", family: "montserrat" },
      { key: "built-in:Karla", family: "Karla" },
    ])
    expect(inputs.headingFont).toBe("font:7")
    expect(inputs.bodyFont).toBe("font:7")
  })

  it("falls back to the built-in stand-ins when it does not", () => {
    expect(presetInputs(avada, [])).toEqual(avada.inputs)
  })

  it("picks heading and body fonts separately", () => {
    const beachside = findPreset("beachside")!
    const inputs = presetInputs(beachside, [
      { key: "font:2", family: "Nunito Sans" },
    ])
    expect(inputs.headingFont).toBe(beachside.inputs.headingFont)
    expect(inputs.bodyFont).toBe("font:2")
  })

  it("leaves a general preset's fonts alone", () => {
    const harbour = findPreset("harbour")!
    expect(
      presetInputs(harbour, [{ key: "font:1", family: "Bricolage" }])
    ).toEqual(harbour.inputs)
  })
})
