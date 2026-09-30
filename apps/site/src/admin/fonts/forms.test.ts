import { describe, expect, it } from "vitest"

import {
  fontBytesProblem,
  MAX_UPLOAD_BYTES,
  parseGoogleFontForm,
  parseUploadFontForm,
} from "./forms"

function form(entries: [string, string | File][]): FormData {
  const data = new FormData()
  for (const [name, value] of entries) data.append(name, value)
  return data
}

const font = (name: string, bytes = 10) =>
  new File([new Uint8Array(bytes)], name)

describe("parseGoogleFontForm", () => {
  it("reads the family, kind and weights", () => {
    const result = parseGoogleFontForm(
      form([
        ["family", "  Roboto Slab "],
        ["kind", "slab"],
        ["weight", "700"],
        ["weight", "400"],
      ])
    )
    expect(result).toEqual({
      ok: true,
      values: {
        family: "Roboto Slab",
        kind: "slab",
        weights: [400, 700],
        styles: ["normal"],
      },
    })
  })

  it("adds the italic style when asked", () => {
    const result = parseGoogleFontForm(
      form([
        ["family", "Lora"],
        ["kind", "serif"],
        ["weight", "400"],
        ["italic", "on"],
      ])
    )
    expect(result).toMatchObject({
      ok: true,
      values: { styles: ["normal", "italic"] },
    })
  })

  it("names each problem on its field", () => {
    const result = parseGoogleFontForm(form([["family", "  "]]))
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        family: expect.stringContaining("Google Fonts"),
        kind: "Choose serif, sans serif or slab serif.",
        weights: "Choose at least one weight.",
      },
    })
  })

  it("refuses a family name with URL syntax in it", () => {
    const result = parseGoogleFontForm(
      form([
        ["family", "Lora&family=Evil"],
        ["kind", "serif"],
        ["weight", "400"],
      ])
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && Object.keys(result.fieldErrors)).toEqual(["family"])
  })

  it("ignores weights that are not CSS weights", () => {
    const result = parseGoogleFontForm(
      form([
        ["family", "Lora"],
        ["kind", "serif"],
        ["weight", "450"],
      ])
    )
    expect(!result.ok && result.fieldErrors.weights).toBe(
      "Choose at least one weight."
    )
  })
})

describe("fontBytesProblem", () => {
  const bytes = (...values: number[]) => Buffer.from([...values, 0, 0, 0, 0])

  it("accepts the header each format starts with", () => {
    expect(
      fontBytesProblem("a.woff2", bytes(0x77, 0x4f, 0x46, 0x32))
    ).toBeNull()
    expect(fontBytesProblem("a.WOFF", bytes(0x77, 0x4f, 0x46, 0x46))).toBeNull()
    expect(fontBytesProblem("a.ttf", bytes(0, 1, 0, 0))).toBeNull()
    expect(fontBytesProblem("a.ttf", Buffer.from("true...."))).toBeNull()
    expect(fontBytesProblem("a.otf", Buffer.from("OTTO...."))).toBeNull()
  })

  it("refuses a file whose contents aren't the format its name says", () => {
    expect(fontBytesProblem("a.woff2", bytes(0, 1, 0, 0))).toBe(
      "This file's contents aren't a .woff2 font."
    )
    expect(fontBytesProblem("notes.otf", Buffer.from("plain text"))).toBe(
      "This file's contents aren't a .otf font."
    )
  })

  it("refuses a file too short to be a font", () => {
    expect(fontBytesProblem("a.woff2", Buffer.from("wO"))).toBe(
      "This file's contents aren't a .woff2 font."
    )
  })
})

describe("parseUploadFontForm", () => {
  const valid = (): [string, string | File][] => [
    ["family", "Acme Sans"],
    ["kind", "sans"],
    ["file", font("acme-regular.woff2")],
    ["weight", "400"],
    ["style", "normal"],
    ["file", font("acme-bold.otf")],
    ["weight", "700"],
    ["style", "normal"],
  ]

  it("pairs each file with its weight and style, in order", () => {
    const result = parseUploadFontForm(form(valid()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values.family).toBe("Acme Sans")
    expect(result.values.kind).toBe("sans")
    expect(
      result.values.files.map((f) => [f.file.name, f.weight, f.style])
    ).toEqual([
      ["acme-regular.woff2", 400, "normal"],
      ["acme-bold.otf", 700, "normal"],
    ])
  })

  it("asks for a file when none was chosen", () => {
    const result = parseUploadFontForm(
      form([
        ["family", "Acme"],
        ["kind", "sans"],
        ["file", new File([], "")],
        ["weight", "400"],
        ["style", "normal"],
      ])
    )
    expect(!result.ok && result.fieldErrors["files.0.file"]).toBe(
      "Choose a font file."
    )
  })

  it("asks for a file when there are no rows at all", () => {
    const result = parseUploadFontForm(
      form([
        ["family", "Acme"],
        ["kind", "sans"],
      ])
    )
    expect(!result.ok && result.message).toBe("Add at least one font file.")
  })

  it("accepts only .woff2, .woff, .ttf and .otf", () => {
    const result = parseUploadFontForm(
      form([
        ["family", "Acme"],
        ["kind", "sans"],
        ["file", font("acme.pdf")],
        ["weight", "400"],
        ["style", "normal"],
      ])
    )
    expect(!result.ok && result.fieldErrors["files.0.file"]).toBe(
      "Font files must be .woff2, .woff, .ttf or .otf."
    )
  })

  it("refuses two files of the same weight and style, naming the second", () => {
    const result = parseUploadFontForm(
      form([
        ...valid(),
        ["file", font("again.woff2")],
        ["weight", "400"],
        ["style", "normal"],
      ])
    )
    expect(!result.ok && result.fieldErrors["files.2.weight"]).toBe(
      "Another file is already 400 Regular. Change the weight or style."
    )
  })

  it("allows the italic of a weight beside its upright", () => {
    const result = parseUploadFontForm(
      form([
        ...valid(),
        ["file", font("italic.woff2")],
        ["weight", "400"],
        ["style", "italic"],
      ])
    )
    expect(result.ok).toBe(true)
  })

  it("checks the family name and kind", () => {
    const result = parseUploadFontForm(
      form([["family", "<script>"], ["kind", "display"], ...valid().slice(2)])
    )
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual([
      "family",
      "kind",
    ])
  })

  it("rejects a bad weight or style on a row", () => {
    const result = parseUploadFontForm(
      form([
        ["family", "Acme"],
        ["kind", "sans"],
        ["file", font("a.woff2")],
        ["weight", "1000"],
        ["style", "oblique"],
      ])
    )
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual([
      "files.0.style",
      "files.0.weight",
    ])
  })

  it("keeps the upload under what a Server Action accepts", () => {
    const result = parseUploadFontForm(
      form([
        ["family", "Acme"],
        ["kind", "sans"],
        ["file", font("a.woff2", MAX_UPLOAD_BYTES / 2 + 1)],
        ["weight", "400"],
        ["style", "normal"],
        ["file", font("b.woff2", MAX_UPLOAD_BYTES / 2 + 1)],
        ["weight", "700"],
        ["style", "normal"],
      ])
    )
    expect(!result.ok && result.message).toMatch(/too large/)
  })
})
