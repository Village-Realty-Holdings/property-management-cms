import type { Payload } from "payload"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { emptyBlock } from "../pageForm"
import { savePageAs } from "../pageSave"

// The delete Server Action, end to end: it runs for real, as a Staff User,
// against a real Payload; only the session lookup and Next's cache are
// stood in for.

const session = vi.hoisted(() => ({
  current: undefined as
    | undefined
    | {
        payload: Payload
        as: { overrideAccess: false; user: unknown }
      },
}))
const revalidatePath = vi.hoisted(() => vi.fn())

vi.mock("../session", () => ({ requireStaff: async () => session.current }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { deleteMedia, uploadMedia } from "./media"

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

let t: TestPayload
let payload: Payload
let access: Parameters<typeof savePageAs>[1]
let uploads = 0

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const user = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  access = { overrideAccess: false, user: { ...user, collection: "users" } }
  session.current = { payload, as: access }
})

afterEach(async () => {
  revalidatePath.mockClear()
  await payload.updateGlobal({
    slug: "brand",
    data: { name: "Test", logo: null },
    ...access,
  })
  await payload.delete({ collection: "pages", where: { id: { exists: true } } })
  await payload.delete({ collection: "media", where: { id: { exists: true } } })
})

afterAll(async () => {
  await t?.teardown()
})

async function upload(): Promise<number> {
  const media = await payload.create({
    collection: "media",
    data: { alt: "A picture" },
    file: {
      data: PNG,
      mimetype: "image/png",
      name: `delete-${++uploads}-${Date.now()}.png`,
      size: PNG.length,
    },
    ...access,
  })
  return media.id
}

const exists = (id: number) =>
  payload
    .findByID({ collection: "media", id, depth: 0, ...access })
    .then(() => true)
    .catch(() => false)

describe("uploadMedia", () => {
  it("uploads the image and returns it as a picker option", async () => {
    const formData = new FormData()
    formData.set("file", new File([PNG], "sunset.png", { type: "image/png" }))
    formData.set("alt", "Sunset")

    const result = await uploadMedia({}, formData)

    expect(result).toMatchObject({ ok: true })
    expect(result.media?.label).toMatch(/^Sunset \(sunset.*\.png\)$/)
    expect(result.media?.url).toBeTruthy()
    expect(await exists(result.media!.id)).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/media")
  })

  it("refuses an image without alt text", async () => {
    const formData = new FormData()
    formData.set("file", new File([PNG], "sunset.png", { type: "image/png" }))

    const result = await uploadMedia({}, formData)

    expect(result.ok).toBe(false)
    expect(result.fieldErrors?.alt).toBeTruthy()
    expect(result.media).toBeUndefined()
  })
})

describe("deleteMedia", () => {
  it("deletes an image nothing uses and refreshes the screens that showed it", async () => {
    const id = await upload()
    const result = await deleteMedia(id)
    expect(result).toMatchObject({ ok: true })
    expect(await exists(id)).toBe(false)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/media")
  })

  it("refuses an image a Page Block shows, and names the Block", async () => {
    const id = await upload()
    const tile = {
      blockType: "amenities",
      heading: "Everything you need",
      variant: "mosaic",
      items: [
        { label: "Wi-Fi" },
        { label: "Pool", image: id },
        { label: "Spa" },
      ],
    }
    const saved = await savePageAs(payload, access, {
      id: null,
      intent: "publish",
      document: {
        kind: "page",
        title: "Home",
        path: "/",
        layout: { mode: "default" },
        blocks: [tile as never],
        seo: { title: "", description: "", image: null },
      },
    })

    expect(saved).toMatchObject({ ok: true })

    const result = await deleteMedia(id)

    expect(result.ok).toBe(false)
    expect(result.message).toContain("can't be deleted")
    expect(result.message).toContain(
      "Page: Home, Block 1, Amenities (Amenity 2: Image)"
    )
    expect(await exists(id)).toBe(true)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses an image only a Draft uses", async () => {
    const id = await upload()
    const hero = { ...emptyBlock("hero"), heading: "Hi", image: id }
    await savePageAs(payload, access, {
      id: null,
      intent: "draft",
      document: {
        kind: "page",
        title: "Draft only",
        path: "/draft-only",
        layout: { mode: "default" },
        blocks: [hero as never],
        seo: { title: "", description: "", image: null },
      },
    })
    const result = await deleteMedia(id)
    expect(result.ok).toBe(false)
    expect(result.message).toContain("Page: Draft only, Block 1, Hero (Image)")
    expect(await exists(id)).toBe(true)
  })

  it("refuses the Brand's logo", async () => {
    const id = await upload()
    await payload.updateGlobal({
      slug: "brand",
      data: { name: "Test", logo: id },
      ...access,
    })
    const result = await deleteMedia(id)
    expect(result.ok).toBe(false)
    expect(result.message).toContain("Brand setting: Logo")
    expect(await exists(id)).toBe(true)
  })

  it("deletes it once nothing uses it any more", async () => {
    const id = await upload()
    await payload.updateGlobal({
      slug: "brand",
      data: { name: "Test", logo: id },
      ...access,
    })
    expect((await deleteMedia(id)).ok).toBe(false)
    await payload.updateGlobal({
      slug: "brand",
      data: { name: "Test", logo: null },
      ...access,
    })
    expect((await deleteMedia(id)).ok).toBe(true)
    expect(await exists(id)).toBe(false)
  })

  it("says so when the image is already gone, or the id is not one", async () => {
    expect(await deleteMedia(999999)).toEqual({
      ok: false,
      message: "That image no longer exists.",
    })
    expect(await deleteMedia(-1)).toEqual({
      ok: false,
      message: "That image no longer exists.",
    })
  })
})
