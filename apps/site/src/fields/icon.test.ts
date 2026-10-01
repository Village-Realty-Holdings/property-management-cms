import { describe, expect, it } from "vitest"

import { iconNames } from "../site/blocks/icons"
import { iconField, validateIcon } from "./icon"

describe("the icon field", () => {
  it("is a text field named icon, or as asked", () => {
    expect(iconField().name).toBe("icon")
    expect(iconField().type).toBe("text")
    expect(iconField({ name: "symbol" }).name).toBe("symbol")
  })

  it("accepts every name on the curated list, and an empty optional field", () => {
    for (const name of iconNames) expect(validateIcon(name)).toBe(true)
    expect(validateIcon("")).toBe(true)
    expect(validateIcon(undefined)).toBe(true)
    expect(validateIcon(null)).toBe(true)
  })

  it("refuses a name that is not on the list, naming it", () => {
    const result = validateIcon("not-a-real-icon")
    expect(result).not.toBe(true)
    expect(result).toMatch(/not-a-real-icon/)
  })

  it("is required when asked", () => {
    expect(iconField({ required: true }).required).toBe(true)
    expect(iconField().required).toBeFalsy()
  })

  it("starts from the default given", () => {
    expect(iconField({ defaultValue: "wifi" }).defaultValue).toBe("wifi")
  })

  it("names its icons in lowercase kebab-case, as Lucide does", () => {
    expect(iconNames.length).toBeGreaterThan(30)
    expect(new Set(iconNames).size).toBe(iconNames.length)
    for (const name of iconNames)
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})
