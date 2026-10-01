// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import { restoreTimeZone, setTimeZone } from "../../test/timeZone"
import { LocalTime } from "./LocalTime"

// 02:30 UTC on 1 Oct is still 30 Sep, 9:30 PM in Chicago.
const SAVED = "2026-10-01T02:30:00.000Z"

afterEach(() => {
  cleanup()
  restoreTimeZone()
})

describe("<LocalTime>", () => {
  it("shows the moment in the viewer's time zone", () => {
    setTimeZone("America/Chicago")
    render(<LocalTime iso={SAVED} />)
    const time = screen.getByText("Sep 30, 2026, 9:30 PM")
    expect(time.tagName).toBe("TIME")
    expect(time.getAttribute("datetime")).toBe(SAVED)
    expect(time.getAttribute("title")).toBe(
      "Sep 30, 2026, 9:30 PM Central Daylight Time"
    )
  })

  it("names the zone when asked", () => {
    setTimeZone("America/Chicago")
    render(<LocalTime iso={SAVED} withZone />)
    expect(screen.getByText("Sep 30, 2026, 9:30 PM CDT")).toBeTruthy()
  })

  it("renders on the server in UTC, named as UTC", () => {
    setTimeZone("America/Chicago")
    const html = renderToString(<LocalTime iso={SAVED} />)
    expect(html).toContain("Oct 1, 2026, 2:30 AM UTC")
  })
})
