import { describe, expect, it } from "vitest"

import { formatMoment, momentTitle } from "./formatMoment"

// 23:30 UTC on 30 Sep 2026 is 6:30 PM the same day in Chicago (CDT, UTC-5)
// and already 5:00 AM on 1 Oct in Kolkata (UTC+5:30).
const SAVED = "2026-09-30T23:30:00.000Z"

describe("formatMoment", () => {
  it("is the same instant in each time zone, on that zone's calendar", () => {
    expect(formatMoment(SAVED, { timeZone: "UTC" })).toBe(
      "Sep 30, 2026, 11:30 PM"
    )
    expect(formatMoment(SAVED, { timeZone: "America/Chicago" })).toBe(
      "Sep 30, 2026, 6:30 PM"
    )
    expect(formatMoment(SAVED, { timeZone: "Asia/Kolkata" })).toBe(
      "Oct 1, 2026, 5:00 AM"
    )
  })

  it("puts an early-UTC moment on the previous day for a viewer west of UTC", () => {
    const late = "2026-10-01T01:33:00.000Z"
    expect(formatMoment(late, { timeZone: "UTC" })).toBe("Oct 1, 2026, 1:33 AM")
    expect(formatMoment(late, { timeZone: "America/Chicago" })).toBe(
      "Sep 30, 2026, 8:33 PM"
    )
  })

  it("can name the zone, as UTC when the zone is UTC", () => {
    expect(formatMoment(SAVED, { timeZone: "UTC", withZone: true })).toBe(
      "Sep 30, 2026, 11:30 PM UTC"
    )
    expect(
      formatMoment(SAVED, { timeZone: "America/Chicago", withZone: true })
    ).toBe("Sep 30, 2026, 6:30 PM CDT")
  })

  it("uses the machine's own zone when none is given", () => {
    expect(formatMoment(SAVED)).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 2026, /)
  })

  it("gives back the text it was given when it is not a moment", () => {
    expect(formatMoment("soon")).toBe("soon")
  })
})

describe("momentTitle", () => {
  it("spells out the zone the time is shown in", () => {
    expect(momentTitle(SAVED, { timeZone: "America/Chicago" })).toBe(
      "Sep 30, 2026, 6:30 PM Central Daylight Time"
    )
    expect(momentTitle(SAVED, { timeZone: "UTC" })).toBe(
      "Sep 30, 2026, 11:30 PM Coordinated Universal Time"
    )
  })
})
