import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { ADMIN_PATH_HEADER } from "./admin/adminPath"
import { EDIT_PARAM } from "./site/editing/flag"
import { config, proxy } from "./proxy"

const request = (path: string) => new NextRequest(`http://localhost${path}`)

describe("proxy", () => {
  it("passes the requested Admin path to the render", () => {
    const response = proxy(request("/admin/pages/3?x=1"))
    expect(
      response.headers.get("x-middleware-request-" + ADMIN_PATH_HEADER)
    ).toBe("/admin/pages/3?x=1")
  })

  it("keeps the editing canvas out of search results", () => {
    const response = proxy(request(`/about?${EDIT_PARAM}=1`))
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
  })

  it("leaves an ordinary Site response alone", () => {
    const response = proxy(request("/about"))
    expect(response.headers.get("x-robots-tag")).toBeNull()
  })

  it("runs for the Admin and for any path carrying the editing flag", () => {
    expect(config.matcher).toContainEqual({
      source: "/:path*",
      has: [{ type: "query", key: EDIT_PARAM }],
    })
    expect(config.matcher).toContain("/admin/:path*")
  })
})
