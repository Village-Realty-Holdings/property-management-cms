import { describe, expect, it } from "vitest"

import { DEFAULT_INPUTS, type ThemeInputs } from "../../theme"
import {
  EDIT_PARAM,
  THEME_PARAM,
  editingUrl,
  isEditingRequest,
  readThemeParam,
} from "./flag"

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

describe("the unsaved Theme in the canvas's URL", () => {
  const unsaved: ThemeInputs = {
    ...DEFAULT_INPUTS,
    primary: "#6b2d5c",
    spacing: "compact",
  }

  const paramsOf = (url: string) =>
    Object.fromEntries(new URL(url, "http://site").searchParams)

  it("is carried by the URL, so the canvas is drawn with it from its first paint", () => {
    const url = editingUrl("/about", unsaved)
    expect(url.startsWith(`/about?`)).toBe(true)
    expect(readThemeParam(paramsOf(url))).toEqual(unsaved)
  })

  it("is left out when there is no unsaved Theme", () => {
    expect(editingUrl("/about")).not.toContain(THEME_PARAM)
    expect(readThemeParam({})).toBeNull()
  })

  it("replaces one already in the path, never doubles it", () => {
    const once = editingUrl("/about", DEFAULT_INPUTS)
    const twice = editingUrl(once, unsaved)
    expect(readThemeParam(paramsOf(twice))).toEqual(unsaved)
    expect(twice.split(`${THEME_PARAM}=`)).toHaveLength(2)
  })

  it.each(["", "not json", "[1]", "null", "42"])(
    "ignores %j, which is no Theme",
    (value) => {
      expect(readThemeParam({ [THEME_PARAM]: value })).toBeNull()
    }
  )

  it("takes only values a Theme can have, the rest as the default's", () => {
    const param = JSON.stringify({ primary: "javascript:1", spacing: "huge" })
    expect(readThemeParam({ [THEME_PARAM]: param })).toEqual(DEFAULT_INPUTS)
  })
})
