import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { newPageStartAs, pagePathTakenAs } from "./newPage"

let t: TestPayload
let asUser: { overrideAccess: false; user: User & { collection: "users" } }

const makePage = (title: string, path: string) =>
  t.payload.create({
    collection: "pages",
    data: { title, path, _status: "draft" },
    draft: true,
    ...asUser,
  })

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "newpage@awayday.test", entraOid: "newpage" },
  })
  asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
  await makePage("Taken", "/np-taken")
  await makePage("Taken too", "/np-taken-2")
})

afterAll(async () => {
  await t?.teardown()
})

describe("pagePathTakenAs", () => {
  it("says whether a Page uses the path", async () => {
    expect(await pagePathTakenAs(t.payload, asUser, "/np-taken")).toBe(true)
    expect(await pagePathTakenAs(t.payload, asUser, "/np-free")).toBe(false)
  })

  it("does not look up a path that is not one", async () => {
    expect(await pagePathTakenAs(t.payload, asUser, "no slash")).toBe(false)
    expect(
      await pagePathTakenAs(t.payload, asUser, 7 as unknown as string)
    ).toBe(false)
  })
})

describe("newPageStartAs (the New Page route's params)", () => {
  const start = (params: Parameters<typeof newPageStartAs>[2]) =>
    newPageStartAs(t.payload, asUser, params)

  it("uses a valid Title and a free Path as given", async () => {
    expect(
      await start({ title: " Our story ", path: "/np-our-story" })
    ).toEqual({
      title: "Our story",
      path: "/np-our-story",
    })
  })

  it("falls back to today's Untitled Page defaults with no params", async () => {
    const result = await start({})
    expect(result.title).toBe("Untitled Page")
    expect(result.path).toMatch(/^\/untitled-page(-\d+)?$/)
  })

  it("falls back for a Title that is empty or too long", async () => {
    expect((await start({ title: "   " })).title).toBe("Untitled Page")
    expect((await start({ title: "x".repeat(201) })).title).toBe(
      "Untitled Page"
    )
  })

  it("takes the Path from the Title when the Path is badly formed", async () => {
    expect(await start({ title: "Np Fresh", path: "Not A Path" })).toEqual({
      title: "Np Fresh",
      path: "/np-fresh",
    })
    expect((await start({ title: "Admin", path: "/admin" })).path).toMatch(
      /^\/untitled-page(-\d+)?$/
    )
  })

  it("numbers a Path that another Page already uses", async () => {
    expect(await start({ title: "Np taken", path: "/np-taken" })).toEqual({
      title: "Np taken",
      path: "/np-taken-3",
    })
  })

  it("reads the first of a repeated param", async () => {
    expect(
      await start({ title: ["A", "B"], path: ["/np-first", "/np-second"] })
    ).toEqual({ title: "A", path: "/np-first" })
  })
})
