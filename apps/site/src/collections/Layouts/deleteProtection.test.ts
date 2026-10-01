import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { truncateTables } from "../../test/truncateTables"
import { layoutDependents } from "./deleteProtection"

let t: TestPayload
let payload: Payload
let staff: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  staff = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(payload, "layouts", "_layouts_v", "pages", "_pages_v")
})

const user = () => ({ ...staff, collection: "users" as const })
const asStaff = () => ({ overrideAccess: false, user: user() }) as const

const makeLayout = (name: string, extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: "layouts",
    data: { name, ...extra },
    ...asStaff(),
  })

const makePage = (
  title: string,
  path: string,
  layout: { mode: "route" | "none" | "specific"; layout?: number },
  status: "draft" | "published" = "published"
) =>
  payload.create({
    collection: "pages",
    data: { title, path, layout, _status: status },
    draft: status === "draft",
    ...asStaff(),
  })

const deleteLayout = (id: number) =>
  payload.delete({ collection: "layouts", id, ...asStaff() })

const exists = async (id: number) =>
  (
    await payload.find({
      collection: "layouts",
      where: { id: { equals: id } },
      ...asStaff(),
    })
  ).totalDocs === 1

/** The message of a rejected write, and its HTTP status. */
async function refusal(write: Promise<unknown>) {
  try {
    await write
  } catch (error) {
    const { message, status } = error as { message: string; status?: number }
    return { message, status }
  }
  throw new Error("Expected the delete to be refused")
}

describe("deleting the default Layout", () => {
  it("is refused, saying it is the default", async () => {
    const main = await makeLayout("Main")
    expect(main.isDefault).toBe(true)
    const { message, status } = await refusal(deleteLayout(main.id))
    expect(message).toMatch(/default/i)
    expect(status).toBeGreaterThanOrEqual(400)
    expect(status).toBeLessThan(500)
    expect(await exists(main.id)).toBe(true)
  })
})

describe("deleting a Layout that Pages pick", () => {
  it("is refused, and the error lists those Pages by title and path", async () => {
    await makeLayout("Main")
    const picked = await makeLayout("Picked")
    await makePage("Picks once", "/picks/one", {
      mode: "specific",
      layout: picked.id,
    })
    await makePage("Picks twice", "/picks/two", {
      mode: "specific",
      layout: picked.id,
    })
    await makePage("Not picking", "/plain", { mode: "route" })

    const { message, status } = await refusal(deleteLayout(picked.id))
    expect(status).toBeGreaterThanOrEqual(400)
    expect(status).toBeLessThan(500)
    expect(message).toContain("Picks once (/picks/one)")
    expect(message).toContain("Picks twice (/picks/two)")
    expect(message).not.toContain("Not picking")
    expect(await exists(picked.id)).toBe(true)
  })

  it("counts a Draft that picks it, even when the Published Page does not", async () => {
    await makeLayout("Main")
    const picked = await makeLayout("Picked")
    const page = await makePage("Home", "/", { mode: "route" })
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { layout: { mode: "specific", layout: picked.id } },
      draft: true,
      ...asStaff(),
    })
    const { message } = await refusal(deleteLayout(picked.id))
    expect(message).toContain("Home (/)")
  })

  it("counts a Published Page that picks it, even when the Draft moved on", async () => {
    await makeLayout("Main")
    const picked = await makeLayout("Picked")
    const page = await makePage("Home", "/", {
      mode: "specific",
      layout: picked.id,
    })
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { layout: { mode: "route" } },
      draft: true,
      ...asStaff(),
    })
    const { message } = await refusal(deleteLayout(picked.id))
    expect(message).toContain("Home (/)")
  })

  it("lists a Page once however many versions pick it", async () => {
    await makeLayout("Main")
    const picked = await makeLayout("Picked")
    const page = await makePage("Home", "/", {
      mode: "specific",
      layout: picked.id,
    })
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Home again" },
      draft: true,
      ...asStaff(),
    })
    const dependents = await layoutDependents(payload, {
      id: picked.id,
      user: user(),
    })
    expect(dependents.map((d) => d.name)).toEqual(["Home again"])
  })

  it("goes ahead once no Page picks it", async () => {
    await makeLayout("Main")
    const picked = await makeLayout("Picked")
    const page = await makePage("Picks once", "/picks/one", {
      mode: "specific",
      layout: picked.id,
    })
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { layout: { mode: "route" } },
      ...asStaff(),
    })
    await deleteLayout(picked.id)
    expect(await exists(picked.id)).toBe(false)
  })

  it("ignores a stored choice the Page no longer uses (mode is not specific)", async () => {
    await makeLayout("Main")
    const picked = await makeLayout("Picked")
    await makePage("Quiet", "/quiet", { mode: "none", layout: picked.id })
    await deleteLayout(picked.id)
    expect(await exists(picked.id)).toBe(false)
  })
})

describe("deleting a Layout that is only a path default", () => {
  it("goes ahead: its paths simply drop", async () => {
    await makeLayout("Main")
    const stays = await makeLayout("Stays", { paths: [{ path: "/stays" }] })
    await makePage("A stay", "/stays/beach", { mode: "route" })
    await deleteLayout(stays.id)
    expect(await exists(stays.id)).toBe(false)
  })
})

describe("layoutDependents", () => {
  it("returns the picking Pages for the confirm dialog, with a link to each", async () => {
    await makeLayout("Main")
    const picked = await makeLayout("Picked")
    const page = await makePage("Picks once", "/picks/one", {
      mode: "specific",
      layout: picked.id,
    })
    const dependents = await layoutDependents(payload, {
      id: picked.id,
      user: user(),
    })
    expect(dependents).toEqual([
      { kind: "Page", name: "Picks once", href: `/admin/pages/${page.id}` },
    ])
  })

  it("is empty for a Layout nothing picks", async () => {
    await makeLayout("Main")
    const other = await makeLayout("Other")
    expect(
      await layoutDependents(payload, { id: other.id, user: user() })
    ).toEqual([])
  })
})
