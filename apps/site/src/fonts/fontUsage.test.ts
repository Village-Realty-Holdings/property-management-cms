import { afterEach, describe, expect, it, vi } from "vitest"

import { getFontUsages, registerFontUsage } from "./fontUsage"

// The context finders receive; the registry only passes it through.
const context = { payload: {} as never }

const cleanups: (() => void)[] = []
const register: typeof registerFontUsage = (finder) => {
  const unregister = registerFontUsage(finder)
  cleanups.push(unregister)
  return unregister
}
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe("getFontUsages", () => {
  it("is empty when nothing is registered", async () => {
    expect(await getFontUsages(1, context)).toEqual([])
  })

  it("lists every user any finder reports, in registration order", async () => {
    register((id) => (id === 7 ? ["Used by the Theme (heading font)"] : []))
    register(async (id) =>
      id === 7 ? ["Used by the Footer Layout", "Used by the Header Layout"] : []
    )
    expect(await getFontUsages(7, context)).toEqual([
      "Used by the Theme (heading font)",
      "Used by the Footer Layout",
      "Used by the Header Layout",
    ])
    expect(await getFontUsages(8, context)).toEqual([])
  })

  it("hands each finder the font id and the context", async () => {
    const seen: unknown[] = []
    register((id, ctx) => {
      seen.push(id, ctx)
      return []
    })
    await getFontUsages(3, context)
    expect(seen).toEqual([3, context])
  })

  it("stops asking a finder that was unregistered", async () => {
    const unregister = register(() => ["Used by the Theme"])
    unregister()
    expect(await getFontUsages(1, context)).toEqual([])
  })

  it("shares the registry across module copies", async () => {
    register(() => ["Used by the Theme"])
    vi.resetModules()
    const again = await import("./fontUsage")
    expect(await again.getFontUsages(1, context)).toEqual(["Used by the Theme"])
  })
})
