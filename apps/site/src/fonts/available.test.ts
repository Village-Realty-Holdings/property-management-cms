import { describe, expect, it } from "vitest"

import { combineFonts, pickerFonts, type StoredFont } from "./available"

const stored = (
  over: Partial<StoredFont> & Pick<StoredFont, "id" | "family">
) =>
  ({
    kind: "sans",
    files: [{ weight: 400, style: "normal", url: "/f.woff2" }],
    ...over,
  }) satisfies StoredFont

describe("pickerFonts", () => {
  it("lists every built-in quick pick and stored Font when the names differ", () => {
    const all = combineFonts([stored({ id: 1, family: "Lora" })])
    expect(pickerFonts(all)).toEqual(all)
  })

  it("hides a built-in quick pick while a stored Font has the same family", () => {
    const all = combineFonts([stored({ id: 1, family: "Karla" })])
    const keys = pickerFonts(all).map((font) => font.key)
    expect(keys).not.toContain("built-in:Karla")
    expect(keys).toContain("font:1")
    expect(keys).toContain("built-in:Newsreader")
  })

  it("matches the family without regard to case or surrounding space", () => {
    const all = combineFonts([stored({ id: 1, family: " public sans " })])
    expect(pickerFonts(all).map((font) => font.key)).not.toContain(
      "built-in:Public Sans"
    )
  })

  it("shows the built-in again when the stored Font has no files to serve", () => {
    const all = combineFonts([stored({ id: 1, family: "Karla", files: [] })])
    expect(pickerFonts(all).map((font) => font.key)).toContain("built-in:Karla")
  })
})
