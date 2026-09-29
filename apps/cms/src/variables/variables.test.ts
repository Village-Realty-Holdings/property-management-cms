import type { Payload } from "payload"
import { ValidationError } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { variableValuesFrom } from "@workspace/content/shared"

import { richText } from "../lexical"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { checkVariables } from "."

/** Save validation of Variables in Pages and Guides (ADR-0017). */

let t: TestPayload
let payload: Payload
let site: number

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  site = (
    await payload.create({
      collection: "sites",
      data: {
        name: "Beach Bums",
        slug: "beach-bums",
        client: { name: "Forever", website: "https://forever.example/" },
        branding: { phone: "(888) 575-2775" },
        customVariables: [{ key: "promo", value: "SUMMER" }],
      },
    })
  ).id
})

afterAll(() => t?.teardown())

const announcement = (headline: string) => ({
  blockType: "richText" as const,
  content: richText(headline),
})

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error("expected the save to fail")
}

describe("Variables on save", () => {
  it("publish with built-in and Custom Variables", async () => {
    const page = await payload.create({
      collection: "pages",
      data: {
        site,
        title: "{site} Joins {client}",
        path: "/joins",
        _status: "published",
        layout: [
          announcement("Call {phone}, quote {promo}"),
          {
            blockType: "callToAction",
            heading: "Visit {client}",
            style: "primary",
            button: { label: "Call {phone}", href: "tel:{phone}" },
          },
          {
            blockType: "callToAction",
            heading: "Explore",
            style: "primary",
            button: { label: "Explore", href: "{client-url}" },
          },
        ],
        seo: { title: "{site} | {client}" },
      },
    })
    // Stored as typed.
    expect(page.title).toBe("{site} Joins {client}")
  })

  it("an unknown Variable blocks publishing, naming the field and the Variable", async () => {
    const error = await errorOf(
      payload.create({
        collection: "pages",
        data: {
          site,
          title: "Contact",
          path: "/contact-us",
          _status: "published",
          layout: [announcement("Write to {emial}")],
        },
      })
    )
    expect(error).toBeInstanceOf(ValidationError)
    const errors = (error as ValidationError).data.errors
    expect(errors).toEqual([
      expect.objectContaining({
        path: "layout.0.content",
        message: expect.stringContaining("{emial}"),
      }),
    ])
  })

  it("an unknown Variable in SEO blocks publishing a Guide", async () => {
    const error = await errorOf(
      payload.create({
        collection: "guides",
        data: {
          site,
          title: "Beach guide",
          _status: "published",
          seo: { description: "Ask {nobody}" },
        },
      })
    )
    expect((error as ValidationError).data.errors).toEqual([
      expect.objectContaining({ path: "seo.description" }),
    ])
  })

  it("a Draft with an unknown Variable still saves", async () => {
    const draft = await payload.create({
      collection: "pages",
      draft: true,
      data: {
        site,
        title: "Draft {emial}",
        path: "/draft",
        _status: "draft",
      },
    })
    expect(draft.title).toBe("Draft {emial}")
  })

  it("an empty Variable is a warning, not an error", async () => {
    // {email} is a built-in with no value on this Site.
    await expect(
      payload.create({
        collection: "pages",
        data: {
          site,
          title: "Email {email}",
          path: "/email",
          _status: "published",
        },
      })
    ).resolves.toBeTruthy()

    const values = variableValuesFrom({
      name: "Beach Bums",
      branding: { phone: "555" },
    })
    const check = checkVariables(
      {
        title: "Email {email}",
        layout: [announcement("Call {ph"), announcement("{typo}")],
      },
      values
    )
    expect(check.errors).toEqual([
      expect.objectContaining({
        kind: "unknown",
        name: "typo",
        path: "layout.1.content",
      }),
    ])
    expect(check.warnings).toEqual([
      expect.objectContaining({ kind: "empty", name: "email", path: "title" }),
      expect.objectContaining({
        kind: "literalBraces",
        path: "layout.0.content",
      }),
    ])
  })

  it("keeps a Variable in a rich text link URL", async () => {
    const link = {
      type: "link",
      version: 3,
      fields: { linkType: "custom", url: "{client-url}", newTab: false },
      children: [{ type: "text", text: "{client}", version: 1 }],
    }
    const content = richText("See ")
    ;(content.root.children[0]!.children as unknown[]).push(link)
    const page = await payload.create({
      collection: "pages",
      data: {
        site,
        title: "Links",
        path: "/links",
        _status: "published",
        layout: [{ blockType: "richText", content }],
      },
    })
    const stored = page.layout?.[0] as { content: typeof content }
    const node = (
      stored.content.root.children[0]!.children as {
        fields?: { url?: string }
      }[]
    )[1]
    expect(node?.fields?.url).toBe("{client-url}")
  })

  it("rejects Custom Variable keys that clash or aren't kebab-case", async () => {
    for (const key of ["phone", "Promo Code"]) {
      await expect(
        payload.update({
          collection: "sites",
          id: site,
          data: { customVariables: [{ key, value: "x" }] },
        })
      ).rejects.toThrow()
    }
    await expect(
      payload.update({
        collection: "sites",
        id: site,
        data: {
          customVariables: [
            { key: "promo", value: "a" },
            { key: "promo", value: "b" },
          ],
        },
      })
    ).rejects.toThrow()
  })
})
