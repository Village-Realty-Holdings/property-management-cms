import { describe, expect, it } from "vitest"

import { displayFont } from "./display"

describe("displayFont", () => {
  it("reads the heading font, weight, case and tracking from the Theme's tokens", () => {
    expect(displayFont).toContain("--font-display")
    expect(displayFont).toContain("var(--display-weight)")
    expect(displayFont).toContain("var(--display-transform)")
    expect(displayFont).toContain("--display-tracking")
  })
})
