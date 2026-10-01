import path from "node:path"

import { describe, expect, it } from "vitest"

import { duplicateFile } from "./Fonts"
import { fontFilesStaticDir, fontFileProblem } from "./FontFiles"

describe("fontFilesStaticDir", () => {
  it("keeps each Site's local font files in media/<schema>/fonts", () => {
    expect(fontFilesStaticDir("avada")).toBe(
      path.resolve("media", "avada", "fonts")
    )
  })

  it("uses media/fonts when there is no schema", () => {
    expect(fontFilesStaticDir(undefined)).toBe(path.resolve("media", "fonts"))
  })
})

describe("fontFileProblem", () => {
  it.each([
    ["a.woff2", "font/woff2"],
    ["A.WOFF2", "font/woff2"],
    ["a.woff", "font/woff"],
    ["a.ttf", "font/ttf"],
    ["a.otf", "font/otf"],
    ["a.woff2", undefined],
  ])("accepts %s as %s", (name, type) => {
    expect(fontFileProblem(name, type)).toBeNull()
  })

  it.each([
    ["a.txt", "font/woff2"],
    ["a", "font/woff2"],
    ["a.woff2.exe", "font/woff2"],
    ["a.svg", "image/svg+xml"],
    [undefined, "font/woff2"],
  ])("refuses the extension of %s", (name, type) => {
    expect(fontFileProblem(name, type)).toMatch(
      /\.woff2, \.woff, \.ttf or \.otf/
    )
  })

  it("refuses contents that don't match the extension", () => {
    expect(fontFileProblem("a.woff2", "font/ttf")).toMatch(/aren't a \.woff2/)
    expect(fontFileProblem("a.ttf", "font/woff2")).toMatch(/aren't a \.ttf/)
  })
})

describe("duplicateFile", () => {
  it("allows the same weight in different styles", () => {
    expect(
      duplicateFile([
        { weight: 400, style: "normal" },
        { weight: 400, style: "italic" },
        { weight: 700, style: "normal" },
      ])
    ).toBeNull()
  })

  it("names a repeated weight and style", () => {
    expect(
      duplicateFile([
        { weight: 700, style: "italic" },
        { weight: 700, style: "italic" },
      ])
    ).toMatch(/italic 700/)
  })
})
