import { describe, expect, it } from "vitest"

import type { Page } from "../../payload-types"
import { hrefOf, linksOf } from "./links"

const page = (path: string) => ({ id: 7, path }) as Page

describe("linksOf", () => {
  it("resolves each item's href and trims its label", () => {
    expect(
      linksOf([
        { id: "a", label: " Stays ", link: { page: page("/stays") } },
        { label: "Owners", link: { type: "url", url: "https://x.example" } },
      ])
    ).toEqual([
      { key: "a", label: "Stays", href: "/stays" },
      { key: "1", label: "Owners", href: "https://x.example" },
    ])
  })

  it("leaves out items with no label or nowhere to go", () => {
    expect(
      linksOf([
        { label: "", link: { type: "url", url: "/a" } },
        { label: "Nowhere", link: { type: "url", url: "" } },
        { label: "Bad", link: { type: "url", url: "javascript:1" } },
        { label: "No link" },
      ])
    ).toEqual([])
    expect(linksOf(null)).toEqual([])
  })
})

describe("hrefOf", () => {
  it("follows a Page relationship to the Page's current path", () => {
    expect(hrefOf({ type: "page", page: page("/stays/beach") })).toBe(
      "/stays/beach"
    )
  })

  it("takes the Page's path over a stale URL", () => {
    expect(
      hrefOf({ type: "page", page: page("/new-path"), url: "/old-path" })
    ).toBe("/new-path")
  })

  it("treats a link with no type as a Page link", () => {
    expect(hrefOf({ page: page("/about") })).toBe("/about")
  })

  it("reads a URL link's url, ignoring any Page left behind", () => {
    expect(
      hrefOf({ type: "url", url: "https://example.com/x", page: page("/a") })
    ).toBe("https://example.com/x")
  })

  it("falls back to the url when the Page is not populated", () => {
    expect(hrefOf({ type: "page", page: 7, url: "/kept" })).toBe("/kept")
    expect(hrefOf({ type: "page", page: null, url: "/kept" })).toBe("/kept")
  })

  it("is null when there is nowhere to go", () => {
    expect(hrefOf(undefined)).toBeNull()
    expect(hrefOf(null)).toBeNull()
    expect(hrefOf({ type: "page", page: 7 })).toBeNull()
    expect(hrefOf({ type: "url", url: "  " })).toBeNull()
  })

  it("never returns an unsafe URL", () => {
    expect(hrefOf({ type: "url", url: "javascript:alert(1)" })).toBeNull()
    expect(hrefOf({ type: "url", url: "//evil.com" })).toBeNull()
  })

  it("keeps mailto and tel links", () => {
    expect(hrefOf({ type: "url", url: "mailto:a@b.co" })).toBe("mailto:a@b.co")
    expect(hrefOf({ type: "url", url: "tel:+442079460000" })).toBe(
      "tel:+442079460000"
    )
  })
})
