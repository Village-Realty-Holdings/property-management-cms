import type { Block, Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { ContainerBlock, User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { CONTAINER_LEVELS, refusedBlock } from "./Container"
import { pageBlocks } from "."

const containerIn = (blocks: readonly Block[]) =>
  blocks.find((block) => block.slug === "container")

/** The Blocks a Container's `children` takes. */
function childrenOf(container: Block): Block[] {
  const field = container.fields.find(
    (f) => "name" in f && f.name === "children"
  )
  if (field?.type !== "blocks") throw new Error("no children field")
  return field.blocks
}

/** The Container at each level, from the Page's own down. */
function levels(): Block[] {
  const found: Block[] = []
  let container = containerIn(pageBlocks)
  while (container) {
    found.push(container)
    container = containerIn(childrenOf(container))
  }
  return found
}

const slugs = (blocks: readonly Block[]) => blocks.map((block) => block.slug)

describe("the Container in the config", () => {
  it("is written out three levels deep under one blockType, the last taking no Container", () => {
    expect(levels()).toHaveLength(CONTAINER_LEVELS)
    expect(CONTAINER_LEVELS).toBe(3)
    expect(new Set(levels().map((level) => level.slug))).toEqual(
      new Set(["container"])
    )
  })

  it("holds every other Page Block at every level", () => {
    const others = slugs(pageBlocks).filter((slug) => slug !== "container")
    for (const level of levels()) {
      expect(slugs(childrenOf(level)).filter((s) => s !== "container")).toEqual(
        others
      )
    }
  })

  it("names each level's generated type", () => {
    expect(levels().map((level) => level.interfaceName)).toEqual([
      "ContainerBlock",
      "ContainerBlockLevel2",
      "ContainerBlockLevel3",
    ])
  })

  it("has the same settings at every level: 1 to 4 columns, gap, alignment, width, background", () => {
    const settings = (level: Block) =>
      level.fields
        .filter((f) => f.type === "select")
        .map((f) => [
          f.name,
          f.defaultValue,
          f.options.map((o) => (typeof o === "string" ? o : o.value)),
        ])
    const [first, ...rest] = levels().map(settings)
    expect(first).toEqual([
      ["columns", "1", ["1", "2", "3", "4"]],
      ["gap", "medium", ["small", "medium", "large"]],
      ["align", "top", ["top", "centre", "stretch"]],
      ["width", "page", ["page", "reading"]],
      ["background", "default", ["default", "muted", "primary", "dark"]],
    ])
    for (const level of rest) expect(level).toEqual(first)
  })
})

const settings = {
  columns: "1",
  gap: "medium",
  align: "top",
  width: "page",
} as const

const cta = (heading: string) => ({
  blockType: "callToAction" as const,
  heading,
  button: { label: "Go", href: "/go" },
  style: "primary" as const,
})

const hero = (heading: string) => ({ blockType: "hero" as const, heading })

/** A Container holding `children`. */
const container = (children: unknown[], over: object = {}) =>
  ({
    blockType: "container",
    ...settings,
    ...over,
    children,
  }) as unknown as ContainerBlock

/** Hero, then Container → Container → Container → two Blocks, with others at each level. */
const tree = () => [
  hero("Top"),
  container(
    [
      cta("Level 1, first"),
      container([
        hero("Level 2, first"),
        container([cta("Level 3, first"), cta("Level 3, second")], {
          gap: "large",
        }),
        cta("Level 2, last"),
      ]),
      cta("Level 1, last"),
    ],
    { columns: "2", background: "dark" }
  ),
]

type Row = { blockType: string; heading?: string; children?: Row[] | null }

/** The tree as `blockType` and heading, in order: what must survive a save. */
const shapeOf = (rows: Row[] | null | undefined): unknown[] =>
  (rows ?? []).map((row) =>
    row.blockType === "container"
      ? ["container", shapeOf(row.children)]
      : [row.blockType, row.heading]
  )

describe("refusedBlock", () => {
  it("takes a three-level tree", () => {
    expect(refusedBlock(tree(), pageBlocks)).toBeNull()
    expect(refusedBlock(undefined, pageBlocks)).toBeNull()
  })

  it("refuses a fourth-level Container, naming its place from the top", () => {
    const blocks = [
      hero("Top"),
      container([container([cta("ok"), container([container([])])])]),
    ]
    const refused = refusedBlock(blocks, pageBlocks)
    expect(refused?.place).toBe("Block 2, Block 1, Block 2, Block 1")
    expect(refused?.message).toMatch(
      /^Block 2, Block 1, Block 2, Block 1 is a Container inside 3 Containers/
    )
  })

  it("refuses a Block the list doesn't take, by its type", () => {
    expect(refusedBlock([{ blockType: "logo" }], pageBlocks)?.message).toBe(
      "Block 1 is a “logo” Block, which a Page can't hold. Remove it."
    )
    expect(
      refusedBlock([container([hero("ok"), { blockType: "logo" }])], pageBlocks)
        ?.message
    ).toBe(
      "Block 1, Block 2 is a “logo” Block, which a Container can't hold. Remove it."
    )
  })
})

describe("a Page with Containers", () => {
  let t: TestPayload
  let payload: Payload
  let asStaff: { overrideAccess: false; user: User & { collection: "users" } }

  beforeAll(async () => {
    t = await getTestPayload()
    payload = t.payload
    const user = await payload.create({
      collection: "users",
      data: { email: "staff@awayday.test", entraOid: "staff" },
    })
    asStaff = { overrideAccess: false, user: { ...user, collection: "users" } }
  })

  afterAll(() => t?.teardown())

  it("saves a three-level tree and reads it back in order, with each Container's settings", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Tree", path: "/tree", blocks: tree() },
      ...asStaff,
    })
    const read = await payload.findByID({ collection: "pages", id: page.id })
    expect(shapeOf(read.blocks as Row[])).toEqual(shapeOf(tree() as Row[]))
    const first = read.blocks![1] as ContainerBlock
    expect(first).toMatchObject({ columns: "2", background: "dark" })
    const second = first.children![1] as ContainerBlock
    expect(second.children![1]).toMatchObject({ gap: "large" })
  })

  it("keeps the tree in a Draft saved over the Published version, and the Published one as it was", async () => {
    const page = await payload.create({
      collection: "pages",
      data: {
        title: "Drafted",
        path: "/drafted",
        blocks: tree(),
        _status: "published",
      },
      ...asStaff,
    })
    const changed = tree()
    const inner = (changed[1] as ContainerBlock).children!
    inner.push(cta("Added in the Draft"))
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { blocks: changed },
      draft: true,
      ...asStaff,
    })
    const draft = await payload.findByID({
      collection: "pages",
      id: page.id,
      draft: true,
      ...asStaff,
    })
    expect(shapeOf(draft.blocks as Row[])).toEqual(shapeOf(changed as Row[]))
    const published = await payload.findByID({
      collection: "pages",
      id: page.id,
      overrideAccess: false,
      user: null,
    })
    expect(shapeOf(published.blocks as Row[])).toEqual(shapeOf(tree() as Row[]))
  })

  it("refuses a fourth level with a message, and stores nothing", async () => {
    const blocks = [container([container([container([container([])])])])]
    await expect(
      payload.create({
        collection: "pages",
        data: { title: "Too deep", path: "/too-deep", blocks },
        ...asStaff,
      })
    ).rejects.toMatchObject({
      data: {
        errors: [
          {
            path: "blocks.0.children.0.children.0.children",
            message: expect.stringMatching(
              /^Block 1 is a Container inside 3 Containers/
            ),
          },
        ],
      },
    })
    const found = await payload.find({
      collection: "pages",
      where: { path: { equals: "/too-deep" } },
    })
    expect(found.totalDocs).toBe(0)
  })

  it("refuses a Block a list doesn't take, on the Page and in a Container, as a Draft too", async () => {
    const logo = { blockType: "logo" } as unknown as ContainerBlock
    await expect(
      payload.create({
        collection: "pages",
        data: { title: "Logo", path: "/logo", blocks: [hero("ok"), logo] },
        draft: true,
        ...asStaff,
      })
    ).rejects.toMatchObject({
      data: {
        errors: [
          {
            path: "blocks",
            message:
              "Block 2 is a “logo” Block, which a Page can't hold. Remove it.",
          },
        ],
      },
    })
    await expect(
      payload.create({
        collection: "pages",
        data: { title: "Logo", path: "/logo", blocks: [container([logo])] },
        draft: true,
        ...asStaff,
      })
    ).rejects.toMatchObject({
      data: {
        errors: [
          {
            path: "blocks.0.children",
            message:
              "Block 1 is a “logo” Block, which a Container can't hold. Remove it.",
          },
        ],
      },
    })
  })

  it("stores each level's Containers in its own table, named by its level", async () => {
    const { rows } = await payload.db.pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_name like '%blocks\\_container%' order by table_name`
    )
    expect(rows.map((row) => row.table_name)).toEqual([
      "_pages_v_blocks_container",
      "_pages_v_blocks_container_2",
      "_pages_v_blocks_container_3",
      "pages_blocks_container",
      "pages_blocks_container_2",
      "pages_blocks_container_3",
    ])
  })
})
