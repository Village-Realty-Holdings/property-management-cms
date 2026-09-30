import { describe, expect, it } from "vitest"

import { fixturesFor } from "."
import { fixtures as avada } from "./avada"
import { fixtures as beachside } from "./beachside"
import { fixtures as warrenBeach } from "./warren_beach"

const empty = { rentals: [], posts: [] }

describe("fixturesFor", () => {
  it("is empty for a schema with no fixture module", () => {
    expect(fixturesFor("ms_1_nobody")).toEqual(empty)
  })

  it("is empty when there is no schema", () => {
    expect(fixturesFor(undefined)).toEqual(empty)
    expect(fixturesFor(null)).toEqual(empty)
    expect(fixturesFor("")).toEqual(empty)
  })

  it("is empty for names that only look like a module path", () => {
    for (const schema of [
      "../avada",
      "avada/../x",
      "constructor",
      "__proto__",
    ]) {
      expect(fixturesFor(schema)).toEqual(empty)
    }
  })

  it("returns each Site's own module", () => {
    expect(fixturesFor("warren_beach")).toBe(warrenBeach)
    expect(fixturesFor("avada")).toBe(avada)
    expect(fixturesFor("beachside")).toBe(beachside)
  })

  it("never hands out a shared empty object that a caller could change", () => {
    expect(fixturesFor("unknown")).not.toBe(fixturesFor("unknown"))
  })
})
