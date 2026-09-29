import type { FilterOptionsProps } from "payload"
import { describe, expect, it } from "vitest"

import { sameSite as blocksSameSite } from "../blocks/sameSite"
import { sameSite as ruleSameSite } from "./rule"
import { sameSite, siteIdOf } from "./sameSite"

/** Calls `sameSite` the way Payload does for a document's `data`. */
function filterFor(
  data: unknown,
  extra: Partial<FilterOptionsProps> = {}
): unknown {
  if (typeof sameSite !== "function") throw new Error("expected a function")
  return sameSite({
    blockData: undefined,
    data,
    id: 1,
    relationTo: "media",
    req: {} as FilterOptionsProps["req"],
    siblingData: {},
    user: {},
    ...extra,
  } as FilterOptionsProps)
}

describe("sameSite", () => {
  it("limits to the document's Site, given as an id or populated", () => {
    expect(filterFor({ title: "A", site: 7 })).toEqual({
      site: { equals: 7 },
    })
    expect(filterFor({ title: "A", site: "7" })).toEqual({
      site: { equals: "7" },
    })
    expect(filterFor({ title: "A", site: { id: 7, name: "Site" } })).toEqual({
      site: { equals: 7 },
    })
  })

  it("matches nothing while the Site is unknown", () => {
    for (const site of [undefined, null, "", {}, { id: null }, true]) {
      expect(filterFor({ title: "A", site })).toBe(false)
    }
    expect(filterFor({ title: "A" })).toBe(false)
    expect(filterFor(undefined)).toBe(false)
    expect(filterFor(null)).toBe(false)
  })

  it("leaves the list view's filter builder (no document) unfiltered", () => {
    expect(filterFor({}, { id: undefined as never })).toBe(true)
  })

  it("is the one helper behind the blocks and rule re-exports", () => {
    expect(blocksSameSite).toBe(sameSite)
    expect(ruleSameSite).toBe(sameSite)
  })
})

describe("siteIdOf", () => {
  it("reads an id or a populated Site", () => {
    expect(siteIdOf({ site: 3 })).toBe(3)
    expect(siteIdOf({ site: { id: "3" } })).toBe("3")
    expect(siteIdOf({ site: "" })).toBeUndefined()
    expect(siteIdOf({})).toBeUndefined()
  })
})
