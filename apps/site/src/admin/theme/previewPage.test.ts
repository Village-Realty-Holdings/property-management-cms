import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import {
  countPublishedPages,
  loadHomePreview,
  loadPagePreview,
} from "./previewPage"
import type { UserAccess } from "./themeScreen"

// What Theme mode's canvas reads, against a real Payload on a throwaway
// database, as a User.

let t: TestPayload
let payload: Payload
let as: UserAccess
let aboutId: number

const hero = (heading: string) => ({ blockType: "hero" as const, heading })
const headings = (blocks: readonly object[] | undefined) =>
  blocks?.map((b) => (b as { heading?: string }).heading)

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  const testUser = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", registryUserId: 368570 },
  })
  as = { overrideAccess: false, user: { ...testUser, collection: "users" } }

  await payload.create({
    collection: "layouts",
    data: {
      name: "Main",
      isDefault: true,
      footer: [{ blockType: "legalBar", text: "Legal" }],
    },
    ...as,
  })
  await payload.create({
    collection: "pages",
    data: {
      title: "Home",
      path: "/",
      blocks: [hero("Welcome")],
      _status: "published",
    },
    ...as,
  })
  const about = await payload.create({
    collection: "pages",
    data: {
      title: "About",
      path: "/about",
      blocks: [hero("About us")],
      _status: "published",
    },
    ...as,
  })
  aboutId = about.id
  await payload.create({
    collection: "pages",
    data: { title: "Soon", path: "/soon", _status: "draft" },
    draft: true,
    ...as,
  })
})

afterAll(() => t?.teardown())

describe("loadHomePreview", () => {
  it("is Home's Blocks in the Layout it resolves to", async () => {
    const home = await loadHomePreview(payload, as)
    expect(home.path).toBe("/")
    expect(headings(home.page)).toEqual(["Welcome"])
    expect(home.footer.map((b) => b.blockType)).toEqual(["legalBar"])
    expect(home.header).toEqual([])
  })
})

describe("loadPagePreview", () => {
  it("is another Page's Blocks, at its own path", async () => {
    const about = await loadPagePreview(payload, as, aboutId)
    expect(about?.path).toBe("/about")
    expect(headings(about?.page)).toEqual(["About us"])
    expect(about?.footer.map((b) => b.blockType)).toEqual(["legalBar"])
  })

  it("is null for a Page that does not exist or an id that is not one", async () => {
    expect(await loadPagePreview(payload, as, 999_999)).toBeNull()
    expect(await loadPagePreview(payload, as, Number.NaN)).toBeNull()
    expect(await loadPagePreview(payload, as, -1)).toBeNull()
  })
})

describe("countPublishedPages", () => {
  it("counts Published Pages only", async () => {
    expect(await countPublishedPages(payload, as)).toBe(2)
  })
})
