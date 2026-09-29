/**
 * Run with `node --test apps/site/lib/utm.test.ts` (Node 22.18+ strips the
 * types); `pnpm test` in apps/site runs it too.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

// Node needs the extension; TypeScript (bundler resolution) doesn't allow it.
const specifier = new URL("./utm.ts", import.meta.url).href
const { clientLink, isClientUrl, withUtm } = (await import(
  specifier
)) as typeof import("./utm")

describe("withUtm", () => {
  it("adds pclodge-landing's parameters with the Site's slug", () => {
    const url = new URL(
      withUtm("https://www.forever.example/", "beach-bums", "owner_cta_button")
    )
    assert.equal(url.origin + url.pathname, "https://www.forever.example/")
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      utm_source: "website",
      utm_medium: "beach-bums_landing_page",
      utm_campaign: "beach-bums_landing_page",
      utm_content: "owner_cta_button",
    })
  })

  it("keeps the URL's own query and hash, replacing old UTM values", () => {
    const url = new URL(
      withUtm(
        "https://forever.example/rentals/?sort_by=random&utm_content=old#top",
        "pclodge",
        "guest_text_link"
      )
    )
    assert.equal(url.searchParams.get("sort_by"), "random")
    assert.equal(url.searchParams.get("utm_content"), "guest_text_link")
    assert.equal(url.hash, "#top")
  })
})

describe("clientLink", () => {
  const site = { slug: "beach-bums", clientUrl: "https://www.forever.example/" }

  it("tags links to the Client's website, with or without www", () => {
    assert.ok(isClientUrl("https://forever.example/owners", site.clientUrl))
    assert.match(
      clientLink("https://forever.example/owners", site, "owner_text_link"),
      /utm_content=owner_text_link/
    )
  })

  it("leaves other links alone", () => {
    for (const href of [
      "https://elsewhere.example/",
      "/about",
      "tel:+15550100",
      "mailto:a@b.c",
    ]) {
      assert.equal(clientLink(href, site, "logo"), href)
    }
    assert.equal(
      clientLink(
        "https://forever.example/",
        { ...site, clientUrl: null },
        "logo"
      ),
      "https://forever.example/"
    )
  })
})
