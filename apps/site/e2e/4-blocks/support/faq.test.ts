import { describe, expect, it } from "vitest"

import { faqPageEntries, jsonLdNodes, plainText, sameText } from "./faq"

const script = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data)}</script>`

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are pets allowed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "<p>Yes, in homes marked <strong>pet friendly</strong>.</p>",
      },
    },
    {
      "@type": "Question",
      name: "When is check-in?",
      acceptedAnswer: { "@type": "Answer", text: "From 4pm." },
    },
  ],
}

describe("faqPageEntries", () => {
  it("reads each question and its answer as plain text", () => {
    const html = `<html><head>${script(faqPage)}</head><body></body></html>`
    expect(faqPageEntries(html)).toEqual([
      {
        question: "Are pets allowed?",
        answer: "Yes, in homes marked pet friendly .",
      },
      { question: "When is check-in?", answer: "From 4pm." },
    ])
  })

  it("finds a FAQPage inside a @graph, next to other structured data", () => {
    const html = script({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "Organization", name: "Avada" }, faqPage],
    })
    expect(faqPageEntries(html)).toHaveLength(2)
    expect(jsonLdNodes(html).map((node) => node["@type"])).toContain(
      "Organization"
    )
  })

  it("is empty when the page has no FAQPage", () => {
    expect(faqPageEntries(script({ "@type": "Organization" }))).toEqual([])
    expect(faqPageEntries("<p>No data</p>")).toEqual([])
  })

  it("rejects a Question without an accepted Answer", () => {
    const html = script({
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Why?" }],
    })
    expect(() => faqPageEntries(html)).toThrow(/accepted Answer/)
  })
})

describe("sameText", () => {
  it("ignores whitespace and markup between words", () => {
    expect(
      sameText(
        "Yes, in homes marked pet friendly.",
        "<p>Yes, in homes marked <strong>pet friendly</strong>.</p>"
      )
    ).toBe(true)
    expect(sameText("From 4pm.", "From 5pm.")).toBe(false)
  })
})

describe("plainText", () => {
  it("drops markup and entities and collapses whitespace", () => {
    expect(plainText("<p>Fish &amp; chips&nbsp;\n  daily</p>")).toBe(
      "Fish & chips daily"
    )
  })
})
