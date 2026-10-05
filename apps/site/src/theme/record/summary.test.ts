import { describe, expect, it } from "vitest"

import { CLASSIC, HARBOUR } from "../presets"
import {
  formatSavedAt,
  restoreSummary,
  saveSummary,
  SAVED_AGAIN_SUMMARY,
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

  it("starts the history from Classic when the first save changes nothing", () => {
    expect(saveSummary(classic, classic, { first: true })).toBe(START_SUMMARY)
    expect(START_SUMMARY).toBe("Started from the Classic preset")
  })

  it("has a plain summary for a save that changes nothing and got past saveTheme", () => {
    // saveTheme skips a save with no changes, so only a write around it (the
    // raw Payload API) can get here. "No changes" is never a history entry.
    expect(saveSummary(classic, classic)).toBe(SAVED_AGAIN_SUMMARY)
    expect(SAVED_AGAIN_SUMMARY).not.toMatch(/no changes/i)
  })

  it("prefers a User's note, trimmed", () => {
    expect(saveSummary(classic, HARBOUR.inputs, { note: "  Spring  " })).toBe(
      "Spring"
    )
    expect(saveSummary(classic, classic, { note: "   " })).toBe(
      SAVED_AGAIN_SUMMARY
    )
  })
})

describe("restoreSummary", () => {
  const from = "2026-03-01T10:05:00.000Z"

  it("names the version that came back, and what the restore changed", () => {
    expect(
      restoreSummary(classic, { ...classic, third: "#12a4b6" }, { from })
    ).toBe("Restored the version from Mar 1, 2026, 10:05 AM UTC: Third colour")
  })

  it("names a font that was deleted since", () => {
    const summary = restoreSummary(classic, classic, {
      from,
      deletedFonts: ["Heading font", "Body font"],
    })
    expect(summary).toBe(
      "Restored the version from Mar 1, 2026, 10:05 AM UTC: no changes. Heading font and Body font were deleted, so the Classic fonts are used."
    )
    expect(
      restoreSummary(classic, classic, { from, deletedFonts: ["Heading font"] })
    ).toContain("Heading font was deleted, so the Classic font is used.")
  })
})

describe("formatSavedAt", () => {
  it("is a readable UTC date and time", () => {
    expect(formatSavedAt("2026-03-01T10:05:00.000Z")).toMatch(
      /^Mar 1, 2026, 10:05\sAM UTC$/
    )
  })
})
