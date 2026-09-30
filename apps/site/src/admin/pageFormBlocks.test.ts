import { describe, expect, it } from "vitest"

import type { Page } from "../payload-types"
import { pageToValues } from "./pageForm"

const page = (blocks: Page["blocks"]): Page => ({
  id: 1,
  title: "Home",
  path: "/",
  blocks,
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
})

describe("the Admin's Page form and the Blocks it does not model", () => {
  it("opens a Page that holds a Phase 4 Block with the Blocks it can edit", async () => {
    const values = await pageToValues(
      page([
        { blockType: "hero", heading: "Welcome" },
        {
          blockType: "steps",
          heading: "How it works",
          steps: [
            { title: "One", text: "First" },
            { title: "Two", text: "Second" },
            { title: "Three", text: "Third" },
          ],
        },
        {
          blockType: "stats",
          heading: "Numbers",
          stats: [
            { value: "1", label: "One" },
            { value: "2", label: "Two" },
            { value: "3", label: "Three" },
          ],
        },
      ]),
      async () => ""
    )
    expect(values.blocks.map((block) => block.blockType)).toEqual(["hero"])
  })
})
