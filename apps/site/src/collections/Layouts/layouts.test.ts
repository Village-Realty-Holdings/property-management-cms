import type { Payload } from "payload"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { User } from "../../payload-types"
import { getTestPayload, type TestPayload } from "../../test/getTestPayload"
import { truncateTables } from "../../test/truncateTables"
import { checkLayoutPath } from "./paths"
import { layoutSummary } from "./summary"

let t: TestPayload
let payload: Payload
let testUser: User

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
  testUser = await payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
})

afterAll(() => t?.teardown())

beforeEach(async () => {
  await truncateTables(payload, "layouts", "_layouts_v")
})

const user = () => ({ ...testUser, collection: "users" as const })
const asUser = () => ({ overrideAccess: false, user: user() }) as const
const asVisitor = { overrideAccess: false, user: null } as const

const strip = (text: string) => ({ blockType: "utilityStrip" as const, text })

const make = (name: string, extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: "layouts",
    data: { name, ...extra },
    ...asUser(),
  })

const versionsOf = async (id: number) =>
  (
    await payload.findVersions({
      collection: "layouts",
      where: { parent: { equals: id } },
      sort: "createdAt",
      pagination: false,
      ...asUser(),
    })
  ).docs

/** The field messages of a rejected write. */
async function messagesOf(write: Promise<unknown>): Promise<string[]> {
  try {
    await write
  } catch (error) {
    const { data } = error as { data?: { errors?: { message: string }[] } }
    return (data?.errors ?? []).map((e) => e.message)
  }
  throw new Error("Expected the write to be refused")
}

const defaults = async () =>
  (
    await payload.find({
      collection: "layouts",
      where: { isDefault: { equals: true } },
      pagination: false,
    })
  ).docs

describe("checkLayoutPath", () => {
  it.each([
    ["/stays", true],
    ["/stays/beach-house", true],
    ["/", false],
    ["stays", false],
    ["/Stays", false],
    ["/stays/", false],
    ["/a//b", false],
    ["/admin", false],
    ["/api/x", false],
    ["", false],
  ])("%s is %s", (path, ok) => {
    expect(checkLayoutPath(path) === true).toBe(ok)
  })
})

describe("layoutSummary", () => {
  const base = {
    name: "Main",
    header: [],
    footer: [],
    paths: [],
    isDefault: false,
  }

  it("names a first save", () => {
    expect(layoutSummary(null, base)).toBe("Created the Layout")
  })

  it("lists what changed", () => {
    expect(
      layoutSummary(base, {
        ...base,
        name: "Seasonal",
        header: [strip("Sale")],
        isDefault: true,
      })
    ).toBe("Renamed, Header changed, Made the default")
  })

  it("names paths and footer changes and losing the default", () => {
    expect(
      layoutSummary(
        { ...base, isDefault: true },
        { ...base, paths: ["/stays"], footer: [strip("x")], isDefault: false }
      )
    ).toBe("Footer changed, Paths changed, No longer the default")
  })

  it("uses the note when there is one", () => {
    expect(layoutSummary(base, base, { note: "  Spring refresh " })).toBe(
      "Spring refresh"
    )
  })

  it("says so when nothing changed", () => {
    expect(layoutSummary(base, base)).toBe("Saved again")
  })
})

describe("Layouts access", () => {
  it("lets anyone read a Layout but only Users write and read versions", async () => {
    const layout = await make("Main")
    const read = await payload.findByID({
      collection: "layouts",
      id: layout.id,
      ...asVisitor,
    })
    expect(read.name).toBe("Main")

    await expect(
      payload.create({
        collection: "layouts",
        data: { name: "Nope" },
        ...asVisitor,
      })
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: "layouts",
        id: layout.id,
        data: { name: "Nope" },
        ...asVisitor,
      })
    ).rejects.toThrow()
    await expect(
      payload.findVersions({ collection: "layouts", ...asVisitor })
    ).rejects.toThrow()
  })

  it("hides the audit fields from visitors", async () => {
    const layout = await make("Main")
    const read = await payload.findByID({
      collection: "layouts",
      id: layout.id,
      ...asVisitor,
    })
    expect(read).not.toHaveProperty("changeSummary")
    expect(read).not.toHaveProperty("updatedBy")
  })
})

describe("the default Layout", () => {
  it("makes the first Layout the default, and leaves exactly one", async () => {
    const first = await make("First")
    const second = await make("Second")
    expect(first.isDefault).toBe(true)
    expect(second.isDefault).toBe(false)
    expect((await defaults()).map((d) => d.id)).toEqual([first.id])
  })

  it("makes the first Layout the default even when it asks not to be", async () => {
    const first = await make("First", { isDefault: false })
    expect(first.isDefault).toBe(true)
  })

  it("clears the previous default when another is marked", async () => {
    const first = await make("First")
    const second = await make("Second")
    const updated = await payload.update({
      collection: "layouts",
      id: second.id,
      data: { isDefault: true },
      ...asUser(),
    })
    expect(updated.isDefault).toBe(true)
    expect((await defaults()).map((d) => d.id)).toEqual([second.id])
    const cleared = await payload.findByID({
      collection: "layouts",
      id: first.id,
    })
    expect(cleared.isDefault).toBe(false)
  })

  it("clears the previous default when a new Layout is created as default", async () => {
    await make("First")
    const second = await make("Second", { isDefault: true })
    expect((await defaults()).map((d) => d.id)).toEqual([second.id])
  })

  it("records the cleared Layout's change in its history", async () => {
    const first = await make("First")
    await make("Second", { isDefault: true })
    const versions = await versionsOf(first.id)
    expect(versions).toHaveLength(2)
    expect(versions[1]?.version.changeSummary).toBe("No longer the default")
  })

  it("refuses to un-set the only default", async () => {
    const first = await make("First")
    await expect(
      payload.update({
        collection: "layouts",
        id: first.id,
        data: { isDefault: false },
        ...asUser(),
      })
    ).rejects.toThrow(/default/i)
    expect((await defaults()).map((d) => d.id)).toEqual([first.id])
  })

  it("keeps the default when another field is saved", async () => {
    const first = await make("First")
    const updated = await payload.update({
      collection: "layouts",
      id: first.id,
      data: { name: "Renamed" },
      ...asUser(),
    })
    expect(updated.isDefault).toBe(true)
  })
})

describe("Layout versions", () => {
  it("adds a version per save, each with a changeSummary and updatedBy", async () => {
    const layout = await make("Main")
    await payload.update({
      collection: "layouts",
      id: layout.id,
      data: { header: [strip("Sale")] },
      ...asUser(),
    })
    await payload.update({
      collection: "layouts",
      id: layout.id,
      data: { name: "Seasonal", note: "Summer" },
      ...asUser(),
    })
    const versions = await versionsOf(layout.id)
    expect(versions).toHaveLength(3)
    expect(versions.map((v) => v.version.changeSummary)).toEqual([
      "Created the Layout",
      "Header changed",
      "Summer",
    ])
    for (const v of versions) {
      const by = v.version.updatedBy
      expect(typeof by === "object" ? by?.id : by).toBe(testUser.id)
    }
  })

  it("is live on save: there are no Drafts", async () => {
    const layout = await make("Main", { header: [strip("Live")] })
    const read = await payload.findByID({
      collection: "layouts",
      id: layout.id,
      ...asVisitor,
    })
    expect(read.header).toHaveLength(1)
    expect(read).not.toHaveProperty("_status")
  })

  it("keeps every version", async () => {
    const layout = await make("Main")
    for (let i = 0; i < 25; i++) {
      await payload.update({
        collection: "layouts",
        id: layout.id,
        data: { name: `Main ${i}` },
        ...asUser(),
      })
    }
    expect(await versionsOf(layout.id)).toHaveLength(26)
  }, 120_000)

  it("does not keep a client's own changeSummary or updatedBy, and spends the note", async () => {
    const layout = await make("Main", {
      changeSummary: "Forged",
      updatedBy: 999,
      note: "Launch",
    })
    expect(layout.changeSummary).toBe("Launch")
    const other = await payload.findByID({
      collection: "layouts",
      id: layout.id,
      depth: 0,
      ...asUser(),
    })
    expect(other.updatedBy).toBe(testUser.id)
    expect(other.note).toBeNull()
  })
})

describe("Layout paths", () => {
  it("stores path prefixes, normalising the slashes", async () => {
    const layout = await make("Stays", {
      paths: [{ path: "stays/" }, { path: "/rentals" }],
    })
    expect(layout.paths?.map((p) => p.path)).toEqual(["/stays", "/rentals"])
  })

  it.each(["/", "/Stays", "/admin", "/api/x"])("refuses %s", async (path) => {
    await expect(make("Bad", { paths: [{ path }] })).rejects.toThrow()
  })

  it("refuses a prefix another Layout uses", async () => {
    await make("Stays", { paths: [{ path: "/stays" }] })
    expect(
      await messagesOf(make("Also", { paths: [{ path: "/stays" }] }))
    ).toContain("Another Layout uses this path.")
  })

  it("refuses the same prefix twice in one Layout", async () => {
    expect(
      await messagesOf(
        make("Twice", { paths: [{ path: "/stays" }, { path: "/stays" }] })
      )
    ).toContain("This path is listed twice.")
  })

  it("lets a Layout keep its own prefixes when it is saved again", async () => {
    const layout = await make("Stays", { paths: [{ path: "/stays" }] })
    const updated = await payload.update({
      collection: "layouts",
      id: layout.id,
      data: { name: "Stays 2" },
      ...asUser(),
    })
    expect(updated.paths?.map((p) => p.path)).toEqual(["/stays"])
  })

  it("lets a prefix move to another Layout once freed", async () => {
    const a = await make("A", { paths: [{ path: "/stays" }] })
    await payload.update({
      collection: "layouts",
      id: a.id,
      data: { paths: [] },
      ...asUser(),
    })
    const b = await make("B", { paths: [{ path: "/stays" }] })
    expect(b.paths).toHaveLength(1)
  })
})

describe("region Blocks", () => {
  it("takes header and footer Blocks", async () => {
    const layout = await make("Main", {
      header: [{ blockType: "logo" }, strip("Hi")],
      footer: [{ blockType: "legalBar", text: "© {year}" }],
    })
    expect(layout.header?.map((b) => b.blockType)).toEqual([
      "logo",
      "utilityStrip",
    ])
    expect(layout.footer?.map((b) => b.blockType)).toEqual(["legalBar"])
  })

  it("refuses a footer Block in the header, and says which", async () => {
    await expect(
      make("Main", { header: [{ blockType: "legalBar", text: "x" }] })
    ).rejects.toMatchObject({
      data: {
        errors: [
          {
            path: "header",
            message: "A “legalBar” Block can't be in a Header. Remove it.",
          },
        ],
      },
    })
  })

  it("takes a Container in the header and the footer, with the region's Blocks", async () => {
    const box = (children: object[]) => ({
      blockType: "container" as const,
      columns: "1" as const,
      gap: "medium" as const,
      align: "centre" as const,
      justify: "centre" as const,
      width: "page" as const,
      background: "primary" as const,
      children,
    })
    const layout = await make("Boxed", {
      header: [box([{ blockType: "logo", size: "xlarge" }])],
      footer: [
        box([
          { blockType: "logo", size: "large" },
          { blockType: "legalBar", text: "© {year}" },
        ]),
      ],
    } as never)
    expect(layout.header).toMatchObject([
      {
        blockType: "container",
        justify: "centre",
        children: [{ blockType: "logo", size: "xlarge" }],
      },
    ])
    expect(
      (
        layout.footer?.[0] as { children: { blockType: string }[] }
      ).children.map((child) => child.blockType)
    ).toEqual(["logo", "legalBar"])

    await expect(
      make("Wrong", {
        header: [box([{ blockType: "legalBar", text: "x" }])],
      } as never)
    ).rejects.toMatchObject({
      data: {
        errors: [
          {
            message:
              "A “legalBar” Block can't be in a Container in a Header. Remove it.",
          },
        ],
      },
    })
  })
})
