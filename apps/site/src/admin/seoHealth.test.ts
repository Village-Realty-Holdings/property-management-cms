import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { findPagesNeedingSeoAttention, missingSeo } from "./seoHealth"

describe("missingSeo", () => {
  it("reports nothing for a Page with a title and a description", () => {
    expect(missingSeo({ title: "T", description: "D" })).toEqual([])
  })

  it("names which of the two is missing, title first", () => {
    expect(missingSeo({ title: null, description: "D" })).toEqual(["title"])
    expect(missingSeo({ description: null })).toEqual(["title", "description"])
    expect(missingSeo({ title: "T", description: "" })).toEqual(["description"])
  })

  it("counts blank text as missing", () => {
    expect(missingSeo({ title: "   ", description: "\n" })).toEqual([
      "title",
      "description",
    ])
  })

  it("treats a Page with no SEO at all as missing both", () => {
    expect(missingSeo(undefined)).toEqual(["title", "description"])
  })
})

describe("findPagesNeedingSeoAttention", () => {
  let t: TestPayload
  let asUser: { overrideAccess: false; user: User & { collection: "users" } }

  beforeAll(async () => {
    t = await getTestPayload()
    const user = await t.payload.create({
      collection: "users",
      data: { email: "staff@awayday.test", entraOid: "staff" },
    })
    asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
  })

  afterAll(() => t?.teardown())

  const create = (
    title: string,
    path: string,
    status: "draft" | "published",
    seo?: { title?: string; description?: string }
  ) =>
    t.payload.create({
      collection: "pages",
      data: { title, path, seo, _status: status },
      draft: status === "draft",
      ...asUser,
    })

  it("lists Published Pages missing SEO text, and only those", async () => {
    expect(await findPagesNeedingSeoAttention(t.payload, asUser)).toEqual([])

    await create("Complete", "/complete", "published", {
      title: "Complete",
      description: "All there.",
    })
    const noTitle = await create("No title", "/no-title", "published", {
      description: "Has a description.",
    })
    const noDescription = await create("No desc", "/no-desc", "published", {
      title: "Has a title",
    })
    const neither = await create("Neither", "/neither", "published")
    // Drafts are not on the Site, so they are not "needing attention".
    await create("Draft page", "/draft", "draft")

    const rows = await findPagesNeedingSeoAttention(t.payload, asUser)
    expect(rows).toEqual([
      {
        id: neither.id,
        title: "Neither",
        path: "/neither",
        missing: ["title", "description"],
      },
      {
        id: noDescription.id,
        title: "No desc",
        path: "/no-desc",
        missing: ["description"],
      },
      {
        id: noTitle.id,
        title: "No title",
        path: "/no-title",
        missing: ["title"],
      },
    ])
  })

  it("lists a Page once fixed no more, and ignores unpublished edits", async () => {
    const page = await create("Fixed later", "/fixed", "published")
    // A Draft edit adds the SEO text, but the Published version still lacks it.
    await t.payload.update({
      collection: "pages",
      id: page.id,
      data: { seo: { title: "T", description: "D" }, _status: "draft" },
      draft: true,
      ...asUser,
    })
    let rows = await findPagesNeedingSeoAttention(t.payload, asUser)
    expect(rows.map((r) => r.id)).toContain(page.id)

    await t.payload.update({
      collection: "pages",
      id: page.id,
      data: { seo: { title: "T", description: "D" }, _status: "published" },
      ...asUser,
    })
    rows = await findPagesNeedingSeoAttention(t.payload, asUser)
    expect(rows.map((r) => r.id)).not.toContain(page.id)
  })
})
