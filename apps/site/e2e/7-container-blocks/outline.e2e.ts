import type { Browser, Locator, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { ORIGIN } from "../theme/support/env"
import {
  launchBrowser,
  openSession,
  signIn,
  type Session,
} from "../theme/support/browser"
import {
  RUN,
  barButton,
  deleteCreatedSince,
  editorUrl,
  expectVisible,
  getDoc,
  openEditor,
  openTab,
  outlineTree,
  runPath,
  toast,
  type Doc,
} from "../5-visual-editor/support/editor"

/**
 * Container Blocks, Phase 4: the Outline drags a Block anywhere on the Page.
 * Down onto another Container's Block puts it in that Container; dragged to
 * the left it comes out of its Container; and a drop the place forbids
 * moves nothing and says why. What the Outline shows is what is saved.
 *
 * The Page holds a Hero, a stacked Container A of two Buttons, a stacked
 * Container B of one, and a two-column Container C of one. Rows are told
 * apart by their Block's id.
 */

const STARTED = new Date().toISOString()
const button = (label: string) => ({
  blockType: "button",
  link: { label, href: "/contact" },
  style: "primary",
  align: "start",
})
const container = (children: object[], columns = "1") => ({
  blockType: "container",
  columns,
  children,
})

let browser: Browser
let admin: Session
let page: Page
let doc: Doc
/** The Blocks' ids by name: hero, a, one, two, b, three, c, four. */
let ids: Record<string, string>

beforeAll(async () => {
  browser = await launchBrowser()
  admin = await openSession(browser)
  page = admin.page
  await signIn(page)
  const response = await admin.context.request.post(
    `${ORIGIN}/api/pages?draft=true`,
    {
      data: {
        title: `Outline drags ${RUN}`,
        path: runPath("outline-drags"),
        _status: "draft",
        blocks: [
          { blockType: "hero", heading: `Outline drags ${RUN}` },
          container([button("One"), button("Two")]),
          container([button("Three")]),
          container([button("Four")], "2"),
        ],
      },
    }
  )
  expect(response.ok()).toBe(true)
  doc = ((await response.json()) as { doc: Doc }).doc
  type Stored = { id: string; children?: Stored[] }
  const [hero, a, b, c] = doc.blocks as Stored[]
  ids = {
    hero: hero!.id,
    a: a!.id,
    one: a!.children![0]!.id,
    two: a!.children![1]!.id,
    b: b!.id,
    three: b!.children![0]!.id,
    c: c!.id,
    four: c!.children![0]!.id,
  }
  await openEditor(page, editorUrl.page(doc.id))
  await openTab(page, "Outline")
})

afterAll(async () => {
  if (admin) await deleteCreatedSince(admin.context.request, STARTED)
  await browser?.close()
})

const row = (id: string): Locator =>
  outlineTree(page).locator(`[role="treeitem"][data-block-id="${id}"]`)

/** The Page's rows as "name:level", by the names in `ids`, in order. */
async function tree(): Promise<string[]> {
  const byId = Object.fromEntries(
    Object.entries(ids).map(([name, id]) => [id, name])
  )
  const rows = await outlineTree(page)
    .getByRole("tree", { name: "Page Blocks" })
    .getByRole("treeitem")
    .evaluateAll((items) =>
      items.map((item) => [
        (item as HTMLElement).dataset.blockId ?? "",
        item.getAttribute("aria-level") ?? "",
      ])
    )
  return rows.map(([id, level]) => `${byId[id!] ?? id}:${level}`)
}

/**
 * Drags the row `from` onto the row `to`, `levels` steps sideways (one step
 * is the Outline's indent, 16px), and drops it on the half of `to` that
 * faces where it came from, so it takes `to`'s place.
 */
async function drag(from: string, to: string, levels = 0) {
  const a = (await row(from).boundingBox())!
  const x = a.x + 24
  const y = a.y + a.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 6, { steps: 4 })
  // The target is measured once the drag has started: a dragged Container's
  // Blocks are hidden by then.
  const b = (await row(to).boundingBox())!
  const down = b.y > y
  await page.mouse.move(
    x + levels * 16 + Math.sign(levels) * 4,
    b.y + b.height * (down ? 0.75 : 0.25),
    { steps: 20 }
  )
  await page.mouse.up()
  // dnd-kit swallows the click that ends a drag, for 50ms after the drop.
  await page.waitForTimeout(100)
}

describe("dragging in the Outline", () => {
  it("moves a Block from one Container into another", async () => {
    await drag(ids.two!, ids.three!)
    await expect
      .poll(tree)
      .toEqual([
        "hero:1",
        "a:1",
        "one:2",
        "b:1",
        "three:2",
        "two:2",
        "c:1",
        "four:2",
      ])
  })

  it("moves a Block out of its Container when dragged to the left", async () => {
    await drag(ids.two!, ids.two!, -1)
    await expect
      .poll(tree)
      .toEqual([
        "hero:1",
        "a:1",
        "one:2",
        "b:1",
        "three:2",
        "two:1",
        "c:1",
        "four:2",
      ])
  })

  it("refuses a Hero in a column, and says why", async () => {
    const before = await tree()
    // Under the column's Button, one step in: into the Container C.
    await drag(ids.hero!, ids.four!, 1)
    await expect
      .poll(() =>
        outlineTree(page)
          .getByText(
            "A “Hero” Block needs the full width of the page and can't sit in a column.",
            { exact: true }
          )
          .isVisible()
      )
      .toBe(true)
    expect(await tree()).toEqual(before)
  })

  it("saves the Blocks where the Outline shows them", async () => {
    await barButton(page, "Save").click()
    await expectVisible(toast(page, /saved/i), "a toast confirms the save")
    type Stored = { id: string; children?: Stored[] }
    await expect
      .poll(async () => {
        const saved = await getDoc(admin.context.request, "pages", doc.id)
        return (saved.blocks as Stored[]).map((block) => [
          block.id,
          (block.children ?? []).map((child) => child.id),
        ])
      })
      .toEqual([
        [ids.hero, []],
        [ids.a, [ids.one]],
        [ids.b, [ids.three]],
        [ids.two, []],
        [ids.c, [ids.four]],
      ])
  })
})
