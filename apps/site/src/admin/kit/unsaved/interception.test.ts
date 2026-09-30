import { describe, expect, it } from "vitest"

import {
  interceptedHref,
  shouldWarnOnUnload,
  traversalDelta,
  type ClickInfo,
} from "./interception"

const here = "https://site.test/admin/pages/1?tab=seo"

function click(overrides: Partial<ClickInfo> & { href?: string } = {}) {
  const { href = "https://site.test/admin/media", ...rest } = overrides
  const info: ClickInfo = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    anchor: { href, target: null, download: false },
    ...rest,
  }
  return info
}

describe("interceptedHref", () => {
  it("intercepts a plain click on an in-app link and returns its route", () => {
    expect(interceptedHref(click(), here)).toBe("/admin/media")
    expect(
      interceptedHref(
        click({ href: "https://site.test/admin/pages?q=a#top" }),
        here
      )
    ).toBe("/admin/pages?q=a#top")
  })

  it("leaves clicks that are not on a link", () => {
    expect(interceptedHref(click({ anchor: null }), here)).toBeNull()
  })

  it("leaves clicks that open elsewhere or download", () => {
    for (const patch of [
      { button: 1 },
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { defaultPrevented: true },
    ]) {
      expect(interceptedHref(click(patch), here)).toBeNull()
    }
    expect(
      interceptedHref(
        click({
          anchor: {
            href: "https://site.test/admin/media",
            target: "_blank",
            download: false,
          },
        }),
        here
      )
    ).toBeNull()
    expect(
      interceptedHref(
        click({
          anchor: {
            href: "https://site.test/media/a.pdf",
            target: null,
            download: true,
          },
        }),
        here
      )
    ).toBeNull()
  })

  it("intercepts target=_self", () => {
    expect(
      interceptedHref(
        click({
          anchor: {
            href: "https://site.test/admin/media",
            target: "_self",
            download: false,
          },
        }),
        here
      )
    ).toBe("/admin/media")
  })

  it("leaves other origins, other protocols and same-page links", () => {
    expect(
      interceptedHref(click({ href: "https://elsewhere.test/admin" }), here)
    ).toBeNull()
    expect(interceptedHref(click({ href: "mailto:a@b.test" }), here)).toBeNull()
    expect(
      interceptedHref(
        click({ href: "https://site.test/admin/pages/1?tab=seo#x" }),
        here
      )
    ).toBeNull()
    expect(
      interceptedHref(
        click({ href: "https://site.test/admin/pages/1?tab=seo" }),
        here
      )
    ).toBeNull()
  })

  it("intercepts the same path with a different query", () => {
    expect(
      interceptedHref(
        click({ href: "https://site.test/admin/pages/1?tab=page" }),
        here
      )
    ).toBe("/admin/pages/1?tab=page")
  })
})

describe("shouldWarnOnUnload", () => {
  it("warns only for a dirty editor", () => {
    expect(shouldWarnOnUnload(true)).toBe(true)
    expect(shouldWarnOnUnload(false)).toBe(false)
  })
})

describe("traversalDelta", () => {
  it("is the distance between history entries", () => {
    expect(traversalDelta(3, 2)).toBe(-1)
    expect(traversalDelta(3, 0)).toBe(-3)
    expect(traversalDelta(1, 4)).toBe(3)
  })

  it("assumes one step back when an entry has no index", () => {
    expect(traversalDelta(3, undefined)).toBe(-1)
    expect(traversalDelta(undefined, 2)).toBe(-1)
  })

  it("never returns zero", () => {
    expect(traversalDelta(2, 2)).toBe(-1)
  })
})
