import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { Pages } from "../../collections/Pages"
import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { loadMediaReplacement, replaceMedia } from "./image"
import { applyReplace, previewReplace, type Replacement } from "./run"

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

describe("replaceMedia", () => {
  const swap = (page: object) =>
    replaceMedia(Pages.fields, page, { from: 7, to: 9 })

  it("swaps the image wherever it is, and leaves the others", () => {
    const page = {
      title: "Home",
      blocks: [
        { blockType: "hero", heading: "7", image: 7 },
        {
          blockType: "container",
          columns: "2",
          children: [
            { blockType: "image", image: 8 },
            { blockType: "image", image: 7 },
          ],
        },
      ],
      seo: { image: 7 },
    }
    const { data, hits } = swap(page)
    expect(data).toMatchObject({
      blocks: [
        { heading: "7", image: 9 },
        { children: [{ image: 8 }, { image: 9 }] },
      ],
      seo: { image: 9 },
    })
    expect(hits).toEqual([
      { block: "Block 1, Hero", where: "Image", count: 1 },
      {
        block: "Block 2, Container, Column 2, Image",
        where: "Image",
        count: 1,
      },
      { block: undefined, where: "SEO: SEO image", count: 1 },
    ])
  })

  it("returns the document itself when it doesn't show the image", () => {
    const page = { title: "Home", blocks: [{ blockType: "hero", image: 8 }] }
    expect(swap(page).data).toBe(page)
  })
})

describe("Replace Image across the Site", () => {
  let t: TestPayload
  let asUser: { overrideAccess: false; user: User & { collection: "users" } }
  let from: number
  let to: number
  let replacement: Replacement

  const upload = async (name: string) =>
    (
      await t.payload.create({
        collection: "media",
        data: { alt: name },
        file: {
          data: PNG,
          mimetype: "image/png",
          name: `${name}-${Date.now()}.png`,
          size: PNG.length,
        },
        ...asUser,
      })
    ).id

  beforeAll(async () => {
    t = await getTestPayload()
    const user = await t.payload.create({
      collection: "users",
      data: { email: "staff@awayday.test", entraOid: "staff" },
    })
    asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
    from = await upload("old")
    to = await upload("new")
    const loaded = await loadMediaReplacement(t.payload, asUser, { from, to })
    if (!loaded.ok) throw new Error(loaded.message)
    replacement = loaded.replacement
  })

  afterAll(async () => {
    // Removes the uploaded files from local disk too.
    await t?.payload.delete({
      collection: "media",
      where: { id: { exists: true } },
    })
    await t?.teardown()
  })

  it("needs two different images that are in Media", async () => {
    const load = (input: unknown) =>
      loadMediaReplacement(t.payload, asUser, input)
    expect(await load({ from: null, to })).toEqual({
      ok: false,
      message: "Choose the image to replace.",
    })
    expect(await load({ from, to: null })).toEqual({
      ok: false,
      message: "Choose the image to use instead.",
    })
    expect(await load({ from, to: from })).toEqual({
      ok: false,
      message: "Choose two different images.",
    })
    expect(await load({ from, to: 999_999 })).toEqual({
      ok: false,
      message: "One of those images is no longer in Media.",
    })
  })

  it("swaps it in a Page, the Brand and SEO", async () => {
    const page = await t.payload.create({
      collection: "pages",
      data: {
        title: "Home",
        path: "/",
        blocks: [{ blockType: "hero", heading: "Hello", image: from }],
        _status: "published",
      },
      ...asUser,
    })
    await t.payload.updateGlobal({
      slug: "brand",
      data: { name: "Awayday", logo: from },
      ...asUser,
    })
    await t.payload.updateGlobal({
      slug: "seo",
      data: { image: from, favicon: to },
      ...asUser,
    })

    const preview = await previewReplace(t.payload, asUser, replacement)
    expect(preview.rows.map((row) => [row.kind, row.places, row.live])).toEqual(
      [
        ["Page", ["Block 1, Hero: Image"], false],
        ["Brand", ["Logo"], true],
        ["SEO", [expect.stringContaining("image")], true],
      ]
    )

    const result = await applyReplace(t.payload, asUser, replacement, "draft")
    expect(result).toMatchObject({
      ok: true,
      message: "Replaced in 1 Page, the Brand and SEO.",
    })

    // The Published Page still shows the old image; its Draft the new one.
    const live = await t.payload.findByID({
      collection: "pages",
      id: page.id,
      depth: 0,
      ...asUser,
    })
    const draft = await t.payload.findByID({
      collection: "pages",
      id: page.id,
      depth: 0,
      draft: true,
      ...asUser,
    })
    expect(live.blocks?.[0]).toMatchObject({ image: from })
    expect(draft.blocks?.[0]).toMatchObject({ image: to })

    const brand = await t.payload.findGlobal({ slug: "brand", depth: 0 })
    expect(brand.logo).toBe(to)
    expect(brand.name).toBe("Awayday")
    const seo = await t.payload.findGlobal({ slug: "seo", depth: 0 })
    expect(seo.image).toBe(to)
    expect(seo.favicon).toBe(to)
  })
})
