// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { MediaSearch, mediaHref } from "./MediaSearch"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("<MediaSearch>", () => {
  it("is a labelled GET search form on the q param", () => {
    render(<MediaSearch query="lake" />)
    const form = screen.getByRole("search")
    expect(form.getAttribute("method")).toBe("get")
    expect(form.getAttribute("action")?.endsWith("/admin/media")).toBe(true)
    const input = screen.getByLabelText("Search Media by alt text or file name")
    expect(input.getAttribute("name")).toBe("q")
    expect((input as HTMLInputElement).value).toBe("lake")
    expect(
      screen.getByRole("link", { name: "Clear" }).getAttribute("href")
    ).toBe("/admin/media")
  })

  it("has no Clear link without a query", () => {
    render(<MediaSearch query="" />)
    expect(screen.queryByRole("link", { name: "Clear" })).toBeNull()
  })
})

describe("mediaHref", () => {
  it("leaves out a blank search and page 1", () => {
    expect(mediaHref({})).toBe("/admin/media")
    expect(mediaHref({ q: " ", page: 1 })).toBe("/admin/media")
    expect(mediaHref({ q: "lake dawn", page: 3 })).toBe(
      "/admin/media?q=lake+dawn&page=3"
    )
    expect(mediaHref({ page: 2 })).toBe("/admin/media?page=2")
  })
})
