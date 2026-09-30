import { describe, expect, it } from "vitest"

import { EDIT_PARAM, editingUrl, isEditingRequest } from "./flag"

describe("isEditingRequest", () => {
  it("is true when the editing flag is 1", () => {
    expect(isEditingRequest({ [EDIT_PARAM]: "1" })).toBe(true)
  })

  it("is true when the flag is repeated and any value is 1", () => {
    expect(isEditingRequest({ [EDIT_PARAM]: ["0", "1"] })).toBe(true)
  })

  it.each([undefined, "", "0", "true", "yes"])("ignores %j", (value) => {
    expect(isEditingRequest({ [EDIT_PARAM]: value })).toBe(false)
  })

  it("ignores a request without search params", () => {
    expect(isEditingRequest(undefined)).toBe(false)
    expect(isEditingRequest({})).toBe(false)
  })
})

describe("editingUrl", () => {
  it("adds the flag to a path", () => {
    expect(editingUrl("/about")).toBe(`/about?${EDIT_PARAM}=1`)
    expect(editingUrl("/")).toBe(`/?${EDIT_PARAM}=1`)
  })

  it("keeps an existing query", () => {
    expect(editingUrl("/about?x=1")).toBe(`/about?x=1&${EDIT_PARAM}=1`)
  })

  it("does not add the flag twice", () => {
    expect(editingUrl(`/about?${EDIT_PARAM}=1`)).toBe(`/about?${EDIT_PARAM}=1`)
  })
})
