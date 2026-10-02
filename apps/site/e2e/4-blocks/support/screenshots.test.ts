import { describe, expect, it } from "vitest"

import { fixturesFor } from "../../../src/site/fixtures"
import { PAGE_BLOCKS } from "./catalogue"
import { FIXTURE_BLOCKS, keepsScreenshot } from "./screenshots"

describe("keepsScreenshot", () => {
  const none = fixturesFor(undefined)
  const avada = fixturesFor("avada")

  it("keeps every Block's screenshot when the Site has fixtures", () => {
    for (const { name } of PAGE_BLOCKS)
      expect(keepsScreenshot(name, avada)).toBe(true)
  })

  it("does not keep a Rental or Blog Block's empty state over its screenshot", () => {
    for (const name of FIXTURE_BLOCKS)
      expect(keepsScreenshot(name, none)).toBe(false)
    expect(keepsScreenshot("Call to action", none)).toBe(true)
    expect(keepsScreenshot("Testimonials", none)).toBe(true)
  })

  it("names only Blocks of the catalogue", () => {
    const names = PAGE_BLOCKS.map((block) => block.name)
    for (const name of FIXTURE_BLOCKS) expect(names).toContain(name)
  })
})
