import { describe, expect, it } from "vitest"

import { devOnly } from "./devOnly"

describe("devOnly", () => {
  it("answers 404 in production", () => {
    expect(() => devOnly({ NODE_ENV: "production" })).toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404/
    )
  })

  it("lets development and tests through", () => {
    expect(() => devOnly({ NODE_ENV: "development" })).not.toThrow()
    expect(() => devOnly({ NODE_ENV: "test" })).not.toThrow()
    expect(() => devOnly({})).not.toThrow()
  })
})
