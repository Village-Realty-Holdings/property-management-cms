import { describe, expect, it } from "vitest"

import { CLASSIC, HARBOUR } from "../presets"
import {
  NO_CHANGES_SUMMARY,
  restoreSummary,
  saveSummary,
  START_SUMMARY,
} from "./summary"

const classic = CLASSIC.inputs

describe("saveSummary", () => {
  it("lists the controls that changed, in editor order", () => {
    expect(
      saveSummary(classic, {
        ...classic,
        buttonCorners: "square",
        primary: "#000000",
      })
    ).toBe("Primary colour, Button corners")
  })

  it("says so when nothing changed", () => {
    expect(saveSummary(classic, classic)).toBe(NO_CHANGES_SUMMARY)
    expect(saveSummary(classic, classic, { first: true })).toBe(START_SUMMARY)
  })

  it("prefers a staff note, trimmed", () => {
    expect(saveSummary(classic, HARBOUR.inputs, { note: "  Spring  " })).toBe(
      "Spring"
    )
    expect(saveSummary(classic, classic, { note: "   " })).toBe(
      NO_CHANGES_SUMMARY
    )
  })
})

describe("restoreSummary", () => {
  it("says what the restore changed", () => {
    expect(restoreSummary(classic, { ...classic, third: "#12a4b6" }, [])).toBe(
      "Restored an earlier version: Third colour"
    )
  })

  it("names a font that was deleted since", () => {
    expect(
      restoreSummary(classic, classic, ["Heading font", "Body font"])
    ).toBe(
      "Restored an earlier version: no changes. Heading font and Body font were deleted, so the Classic fonts are used."
    )
    expect(restoreSummary(classic, classic, ["Heading font"])).toContain(
      "Heading font was deleted, so the Classic font is used."
    )
  })
})
