import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Page } from "@workspace/cms-types"

import { getTestPayload, type TestPayload } from "../test/getTestPayload"

let t: TestPayload
let payload: Payload
let site: number

/** A Page with `layout`, loosely typed as an API client might send it. */
const createPage = (path: string, layout: Record<string, unknown>[]) =>
  payload.create({
    collection: "pages",
    data: {
      site,
      title: `Page ${path}`,
      path,
      layout: layout as unknown as Page["layout"],
    },
  })

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const created = await payload.create({
    collection: "sites",
    data: { name: "Site A", slug: "site-a", revalidationSecret: "secret-a" },
  })
  site = created.id
})

afterAll(() => t?.teardown())

describe("form Block", () => {
  it("saves each kind with its labels", async () => {
    const page = await createPage("/contact", [
      {
        blockType: "form",
        heading: "Send us a message",
        intro: "We reply the same day.",
        kind: "inquiry",
        submitLabel: "Send inquiry",
        successMessage: "Thanks, we'll be in touch.",
      },
      { blockType: "form", kind: "ownerLead" },
      { blockType: "form" },
    ])

    const blocks = (page.layout ?? []) as unknown as Record<string, unknown>[]
    expect(blocks.map((b) => [b.blockType, b.kind])).toEqual([
      ["form", "inquiry"],
      ["form", "ownerLead"],
      // `kind` defaults to a general contact form.
      ["form", "contact"],
    ])
    expect(blocks[0]).toMatchObject({
      heading: "Send us a message",
      intro: "We reply the same day.",
      submitLabel: "Send inquiry",
      successMessage: "Thanks, we'll be in touch.",
    })
  })

  it("rejects an unknown kind", async () => {
    await expect(
      createPage("/bad-kind", [{ blockType: "form", kind: "newsletter" }])
    ).rejects.toThrow(/Kind|invalid/i)
  })
})
