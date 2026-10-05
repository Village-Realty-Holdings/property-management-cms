import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { applyReplace, previewReplace } from "./run"
import { textReplacement } from "./text"

let t: TestPayload
let asUser: { overrideAccess: false; user: User & { collection: "users" } }
const asVisitor = { overrideAccess: false, user: null } as const

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", registryUserId: 368570 },
  })
  asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
})

afterAll(async () => {
  await t?.teardown()
})

const swap = (find: string, replaceWith: string, templates = false) =>
  textReplacement(
    { find, replaceWith, caseSensitive: true, wholeWord: false },
    { templates }
  )

const hero = (heading: string) => ({ blockType: "hero" as const, heading })

/** A Page saved as a Draft, or published. */
async function makePage(
  title: string,
  heading: string,
  status: "draft" | "published"
) {
  return t.payload.create({
    collection: "pages",
    data: {
      title,
      path: `/${title.toLowerCase().replace(/\W+/g, "-")}`,
      blocks: [hero(heading)],
      _status: status,
    },
    draft: status === "draft",
    ...asUser,
  })
}

/** What visitors see of the Page: null when it isn't published. */
async function onSite(id: number) {
  const found = await t.payload.find({
    collection: "pages",
    where: { id: { equals: id } },
    depth: 0,
    ...asVisitor,
  })
  return found.docs[0] ?? null
}

const draftOf = (id: number) =>
  t.payload.findByID({
    collection: "pages",
    id,
    draft: true,
    depth: 0,
    ...asUser,
  })

const heading = (page: { blocks?: unknown } | null) =>
  (page?.blocks as { heading?: string }[] | undefined)?.[0]?.heading

describe("a Page that was never published", () => {
  it("keeps its replacement in the Draft, even when publishing now", async () => {
    const page = await makePage("Unseen", "Alpha stays", "draft")
    const result = await applyReplace(
      t.payload,
      asUser,
      swap("Alpha", "Beta"),
      "publish"
    )
    expect(result).toMatchObject({
      ok: true,
      message: "Replaced in 1 Page.",
      outcomes: [{ kind: "Page", title: "Unseen", message: "Draft saved" }],
    })
    expect(heading(await draftOf(page.id))).toBe("Beta stays")
    expect(await onSite(page.id)).toBeNull()
  })
})

describe("a Published Page with nothing waiting", () => {
  it("saved as a Draft, leaves the Site as it is", async () => {
    const page = await makePage("Live one", "Gamma stays", "published")
    const result = await applyReplace(
      t.payload,
      asUser,
      swap("Gamma", "Delta"),
      "draft"
    )
    expect(result.outcomes).toMatchObject([{ message: "Draft saved" }])
    expect(heading(await onSite(page.id))).toBe("Gamma stays")
    const draft = await draftOf(page.id)
    expect(heading(draft)).toBe("Delta stays")
    expect(draft._status).toBe("draft")
  })

  it("published now, changes the Site", async () => {
    const page = await makePage("Live two", "Epsilon stays", "published")
    const result = await applyReplace(
      t.payload,
      asUser,
      swap("Epsilon", "Zeta"),
      "publish"
    )
    expect(result.outcomes).toMatchObject([{ message: "Published" }])
    expect(heading(await onSite(page.id))).toBe("Zeta stays")
    expect((await draftOf(page.id))._status).toBe("published")
  })
})

describe("a Published Page with changes not yet published", () => {
  async function pending(title: string, word: string) {
    const page = await makePage(title, `${word} stays`, "published")
    await t.payload.update({
      collection: "pages",
      id: page.id,
      data: {
        title: `${title} (new)`,
        blocks: [hero(`${word} stays, rewritten`)],
        _status: "draft",
      },
      draft: true,
      ...asUser,
    })
    return page
  }

  it("previews both copies", async () => {
    await pending("Both", "Eta")
    const preview = await previewReplace(
      t.payload,
      asUser,
      swap("Eta", "Theta")
    )
    expect(preview).toEqual({
      total: 1,
      rows: [
        {
          kind: "Page",
          title: "Both (new)",
          href: expect.stringMatching(/^\/admin\/pages\/\d+$/),
          matches: 1,
          places: ["Block 1, Hero: Heading"],
          publishedMatches: 1,
          live: false,
        },
      ],
    })
  })

  it("counts a Page whose Draft dropped the text, for its Published copy", async () => {
    const page = await makePage("Dropped", "Omega stays", "published")
    await t.payload.update({
      collection: "pages",
      id: page.id,
      data: { blocks: [hero("Rewritten")], _status: "draft" },
      draft: true,
      ...asUser,
    })
    const preview = await previewReplace(
      t.payload,
      asUser,
      swap("Omega", "Alef")
    )
    expect(preview).toMatchObject({
      total: 1,
      rows: [{ title: "Dropped", matches: 0, publishedMatches: 1 }],
    })
    // Saved as Drafts there is nothing to change; published now there is.
    expect(
      await applyReplace(t.payload, asUser, swap("Omega", "Alef"), "draft")
    ).toMatchObject({ message: "Nothing to replace.", outcomes: [] })
    await applyReplace(t.payload, asUser, swap("Omega", "Alef"), "publish")
    expect(heading(await onSite(page.id))).toBe("Alef stays")
    expect(heading(await draftOf(page.id))).toBe("Rewritten")
  })

  it("saved as a Draft, changes the Draft only", async () => {
    const page = await pending("Waiting", "Iota")
    await applyReplace(t.payload, asUser, swap("Iota", "Kappa"), "draft")
    expect(heading(await onSite(page.id))).toBe("Iota stays")
    expect(heading(await draftOf(page.id))).toBe("Kappa stays, rewritten")
  })

  it("published now, changes both and keeps the Draft's changes unpublished", async () => {
    const page = await pending("Split", "Lambda")
    const result = await applyReplace(
      t.payload,
      asUser,
      swap("Lambda", "Mu"),
      "publish"
    )
    expect(result.outcomes).toMatchObject([
      { title: "Split (new)", message: "Published, and Draft saved" },
    ])
    const live = await onSite(page.id)
    expect(live?.title).toBe("Split")
    expect(heading(live)).toBe("Mu stays")
    const draft = await draftOf(page.id)
    expect(draft.title).toBe("Split (new)")
    expect(heading(draft)).toBe("Mu stays, rewritten")
    expect(draft._status).toBe("draft")
  })
})

describe("a Page Template", () => {
  const makeTemplate = (word: string) =>
    t.payload.create({
      collection: "pages",
      data: {
        title: `${word} starter`,
        path: `/${word.toLowerCase()}-starter`,
        blocks: [hero(`${word} stays`)],
        isTemplate: true,
        _status: "draft",
      },
      draft: true,
      ...asUser,
    })

  it("is left as it is, and isn't in the preview, unless asked", async () => {
    const template = await makeTemplate("Upsilon")
    const replacement = swap("Upsilon", "Phi")
    expect(await previewReplace(t.payload, asUser, replacement)).toEqual({
      rows: [],
      total: 0,
    })
    expect(
      await applyReplace(t.payload, asUser, replacement, "publish")
    ).toMatchObject({ message: "Nothing to replace.", outcomes: [] })
    const after = await draftOf(template.id)
    expect(after.title).toBe("Upsilon starter")
    expect(heading(after)).toBe("Upsilon stays")
  })

  it("is replaced when it is included, and stays unpublished", async () => {
    const template = await makeTemplate("Chi")
    const replacement = swap("Chi", "Psi", true)
    const preview = await previewReplace(t.payload, asUser, replacement)
    expect(preview.rows).toMatchObject([
      { kind: "Page Template", title: "Chi starter", matches: 2 },
    ])
    const result = await applyReplace(t.payload, asUser, replacement, "publish")
    expect(result).toMatchObject({
      message: "Replaced in 1 Page Template.",
      outcomes: [{ kind: "Page Template", message: "Draft saved" }],
    })
    const after = await draftOf(template.id)
    expect(after.title).toBe("Psi starter")
    expect(heading(after)).toBe("Psi stays")
    expect(after.isTemplate).toBe(true)
    expect(await onSite(template.id)).toBeNull()
  })
})

describe("a Layout", () => {
  it("goes live in either mode, and its history says why", async () => {
    const layout = await t.payload.create({
      collection: "layouts",
      data: {
        name: "Main",
        footer: [{ blockType: "legalBar", text: "© Nu Rentals" }],
      },
      ...asUser,
    })
    const preview = await previewReplace(t.payload, asUser, swap("Nu", "Xi"))
    expect(preview.rows).toEqual([
      {
        kind: "Layout",
        title: "Main",
        href: `/admin/layouts/${layout.id}`,
        matches: 1,
        places: ["Footer Block 1, Legal bar: Copyright text"],
        live: true,
      },
    ])
    const result = await applyReplace(
      t.payload,
      asUser,
      swap("Nu", "Xi"),
      "draft"
    )
    expect(result).toMatchObject({
      message: "Replaced in 1 Layout.",
      outcomes: [{ kind: "Layout", message: "Live" }],
    })
    const saved = await t.payload.findByID({
      collection: "layouts",
      id: layout.id,
      depth: 0,
      ...asUser,
    })
    expect(saved.footer?.[0]).toMatchObject({ text: "© Xi Rentals" })
    expect(saved.name).toBe("Main")
    expect(saved.changeSummary).toBe("Replace Text: “Nu” with “Xi”")
  })
})

describe("when a document can't be saved", () => {
  it("reports it and still replaces in the rest", async () => {
    const empty = await makePage("Omicron", "Hello", "draft")
    const fine = await makePage("Fine", "Omicron stays", "draft")
    const result = await applyReplace(
      t.payload,
      asUser,
      swap("Omicron", ""),
      "draft"
    )
    expect(result.ok).toBe(false)
    expect(result.message).toBe("Replaced in 1 Page. 1 could not be saved.")
    expect(result.outcomes.find((o) => !o.ok)).toMatchObject({
      title: "Omicron",
      message: expect.stringContaining("title"),
    })
    expect((await draftOf(empty.id)).title).toBe("Omicron")
    expect(heading(await draftOf(fine.id))).toBe(" stays")
  })
})

describe("someone who isn't signed in", () => {
  it("changes nothing", async () => {
    const page = await makePage("Open", "Pi stays", "published")
    const result = await applyReplace(
      t.payload,
      asVisitor,
      swap("Pi", "Rho"),
      "publish"
    )
    expect(result.ok).toBe(false)
    expect(heading(await onSite(page.id))).toBe("Pi stays")
  })
})

describe("when nothing matches", () => {
  it("says so", async () => {
    expect(
      await applyReplace(t.payload, asUser, swap("Sigma", "Tau"), "publish")
    ).toEqual({ ok: true, message: "Nothing to replace.", outcomes: [] })
  })
})
