import { describe, expect, it } from "vitest"

import { effectiveStayPolicy } from "./stayPolicy"

const siteDefaults = {
  checkIn: "16:00",
  checkOut: "10:00",
  houseRules: "No parties.",
  cancellationPolicy: "Full refund up to 30 days before arrival.",
  minimumAge: 25,
}

describe("effectiveStayPolicy", () => {
  it("prefers the Property Fact field by field", () => {
    const policy = effectiveStayPolicy(
      { stayPolicy: { checkIn: "15:00", minimumAge: 21 } },
      { stayPolicyDefaults: siteDefaults }
    )

    expect(policy).toEqual({
      checkIn: "15:00",
      checkOut: "10:00",
      houseRules: "No parties.",
      cancellationPolicy: "Full refund up to 30 days before arrival.",
      minimumAge: 21,
    })
  })

  it("fills blank text and nulls from the Site default", () => {
    const policy = effectiveStayPolicy(
      { stayPolicy: { checkIn: "  ", houseRules: null, checkOut: "" } },
      { stayPolicyDefaults: siteDefaults }
    )

    expect(policy.checkIn).toBe("16:00")
    expect(policy.checkOut).toBe("10:00")
    expect(policy.houseRules).toBe("No parties.")
  })

  it("keeps a minimum age of 0 from the Property", () => {
    const policy = effectiveStayPolicy(
      { stayPolicy: { minimumAge: 0 } },
      { stayPolicyDefaults: siteDefaults }
    )

    expect(policy.minimumAge).toBe(0)
  })

  it("returns nulls where neither has a value", () => {
    expect(effectiveStayPolicy({ stayPolicy: null }, null)).toEqual({
      checkIn: null,
      checkOut: null,
      houseRules: null,
      cancellationPolicy: null,
      minimumAge: null,
    })
    expect(effectiveStayPolicy(undefined, { stayPolicyDefaults: {} })).toEqual(
      effectiveStayPolicy(null, undefined)
    )
  })
})
