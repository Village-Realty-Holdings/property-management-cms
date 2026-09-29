/**
 * Run with `node --test apps/site/components/blocks/lib.test.ts` (Node 22.18+
 * strips the types). apps/site has no test runner; lib.ts is plain TS with
 * no imports, so Node loads it directly.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

// Node needs the extension; TypeScript (bundler resolution) doesn't allow it.
const specifier = new URL("./lib.ts", import.meta.url).href
const lib = (await import(specifier)) as typeof import("./lib")

const rich = (...paragraphs: string[]) => ({
  root: {
    type: "root",
    children: paragraphs.map((text) => ({
      type: "paragraph",
      children: [{ type: "text", text }],
    })),
  },
})

describe("safeHref", () => {
  it("normalizes a phone link typed with a Variable's value", () => {
    assert.equal(lib.safeHref("tel:(888) 575-2775"), "tel:8885752775")
    assert.equal(lib.safeHref("tel:"), null)
  })
})

describe("safeHref / linkOf", () => {
  it("allows Site paths, anchors and http(s)/mailto/tel", () => {
    for (const href of [
      "/rentals",
      "#faq",
      "https://example.com/a",
      "mailto:a@b.co",
      "tel:+1 555-0100",
    ]) {
      assert.equal(lib.safeHref(href), href)
    }
  })

  it("rejects script, protocol-relative and backslash URLs", () => {
    for (const href of [
      "javascript:alert(1)",
      "//evil.com",
      "/\\evil.com",
      "data:text/html,x",
      "",
      null,
      42,
    ]) {
      assert.equal(lib.safeHref(href), null)
    }
  })

  it("needs both label and href", () => {
    assert.deepEqual(lib.linkOf({ label: " Go ", href: "/x" }), {
      label: "Go",
      href: "/x",
    })
    assert.equal(lib.linkOf({ label: "Go" }), null)
    assert.equal(lib.linkOf({ href: "/x" }), null)
    assert.equal(lib.linkOf({ label: "Go", href: "javascript:x" }), null)
    assert.equal(lib.linkOf(null), null)
  })
})

describe("imageOf", () => {
  it("makes CMS-relative Media URLs absolute", () => {
    assert.deepEqual(
      lib.imageOf(
        { id: 1, url: "/api/media/file/a.jpg", alt: "A", width: 10, height: 5 },
        "http://cms:3000/"
      ),
      {
        url: "http://cms:3000/api/media/file/a.jpg",
        alt: "A",
        width: 10,
        height: 5,
      }
    )
  })

  it("keeps absolute URLs and drops unusable ones", () => {
    assert.deepEqual(lib.imageOf({ url: "https://x.test/a.jpg" }, null), {
      url: "https://x.test/a.jpg",
      alt: "",
    })
    assert.equal(lib.imageOf({ url: "/api/media/a.jpg" }, null), null)
    assert.equal(lib.imageOf(7, "http://cms"), null)
    assert.equal(lib.imageOf({ url: "javascript:x" }, "http://cms"), null)
  })
})

describe("relationships", () => {
  it("reads populated Locations and Curated Lists, not bare IDs", () => {
    assert.deepEqual(
      lib.locationOf({
        id: 3,
        slug: "park-city",
        name: "PC",
        displayName: "Park City",
      }),
      { id: "3", slug: "park-city", name: "Park City" }
    )
    assert.equal(lib.locationOf(3), null)
    assert.deepEqual(
      lib.curatedListOf({ id: 2, slug: "pets", title: "Pets" }),
      {
        id: "2",
        slug: "pets",
        title: "Pets",
      }
    )
    assert.deepEqual(
      lib.curatedListsOf([
        { id: 1, slug: "a", title: "A" },
        5,
        { id: 1, slug: "a", title: "A" },
        { id: 2, slug: "b" },
      ]),
      [
        { id: "1", slug: "a", title: "A" },
        { id: "2", slug: "b", title: "b" },
      ]
    )
  })

  it("clamps the grid limit", () => {
    assert.equal(lib.limitOf(undefined), 6)
    assert.equal(lib.limitOf(0), 1)
    assert.equal(lib.limitOf(100), 24)
    assert.equal(lib.limitOf(3.7), 3)
  })

  it("finds a Location's path in its members' paths", () => {
    assert.deepEqual(
      lib.locationPathFrom("deer-valley", [
        null,
        ["park-city", "deer-valley", "silver-lake"],
      ]),
      ["park-city", "deer-valley"]
    )
    assert.equal(lib.locationPathFrom("x", [["a", "b"]]), null)
    assert.equal(lib.locationHref(["a", "b c"]), "/areas/a/b%20c")
  })
})

describe("FAQ", () => {
  it("flattens Lexical to text", () => {
    assert.equal(lib.lexicalText(rich("One.", "Two.")), "One.\nTwo.")
    assert.equal(lib.lexicalText(null), "")
  })

  it("keeps answered questions and builds FAQPage JSON-LD", () => {
    const items = lib.faqItemsOf([
      { question: "Pets?", answer: rich("Some homes.") },
      { question: "Empty?", answer: rich() },
      { question: "", answer: rich("x") },
    ])
    assert.equal(items.length, 1)
    assert.deepEqual(lib.faqJsonLd(items), {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Pets?",
          acceptedAnswer: { "@type": "Answer", text: "Some homes." },
        },
      ],
    })
    assert.equal(lib.faqJsonLd([]), null)
  })

  it("escapes < in inline JSON", () => {
    assert.equal(
      lib.jsonForScript({ a: "</script>" }),
      '{"a":"\\u003c/script>"}'
    )
  })
})

describe("paths", () => {
  it("knows the reserved prefixes", () => {
    assert.equal(lib.isReservedPath(["rentals", "x"]), true)
    assert.equal(lib.isReservedPath(["API"]), true)
    assert.equal(lib.isReservedPath(["about"]), false)
    assert.equal(lib.isReservedPath([]), false)
  })

  it("splits Page paths into segments", () => {
    assert.deepEqual(lib.segmentsOf("/"), [])
    assert.deepEqual(lib.segmentsOf("/company/team?x=1"), ["company", "team"])
  })
})
