import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { blocks, type Doc } from "../3-layouts/support/api"
import {
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import {
  barButton,
  deleteCreatedSince,
  discard,
  editorUrl,
  openTab,
  toast,
} from "../5-visual-editor/support/editor"
import { openEditorNow } from "./support/open"

/**
 * Saving a Layout with a note for its History.
 *
 * - The top bar has an optional note box ("Note for History (optional)", at
 *   most 200 characters) beside Save.
 * - A saved note is what History shows for that version, and the box is empty
 *   again afterwards.
 * - A save without a note gets the automatic summary; the version saved with
 *   the note keeps its note.
 */

const RUN = Date.now().toString(36)
const STARTED = new Date().toISOString()
const NAME = `Notes ${RUN}`
const NOTE = `Summer offers ${RUN}`

let h: Harness
let layout: Doc

const summaries = async () =>
  (await h.api.layoutVersions(Number(layout.id))).map(
    (version) =>
      (version.version as { changeSummary?: string }).changeSummary ?? ""
  )

beforeAll(async () => {
  h = await openHarness()
  layout = await h.api.createLayout({
    name: NAME,
    header: [blocks.utilityStrip(`Strip ${RUN}`)],
    footer: [],
  })
})

afterAll(async () => {
  if (h) {
    await discard(h.user.page).catch(() => undefined)
    await deleteCreatedSince(h.user.context.request, STARTED)
  }
  await closeHarness(h)
})

describe("the Layout save note", () => {
  it("is a box in the top bar, limited to 200 characters", async () => {
    const { page } = h.user
    await openEditorNow(page, editorUrl.layout(layout.id))
    const note = page.getByRole("textbox", {
      name: "Note for History (optional)",
    })
    await note.waitFor()
    expect(await note.getAttribute("placeholder")).toBe("Note (optional)")
    expect(await note.getAttribute("maxlength")).toBe("200")
    await note.fill("x".repeat(250))
    expect((await note.inputValue()).length).toBe(200)
    await note.fill("")
  })

  it("keeps the note as the version's History entry, and empties the box", async () => {
    const { page } = h.user
    const tab = await openTab(page, "Layout")
    await tab.getByLabel("Name", { exact: true }).fill(`${NAME} renamed`)
    const note = page.getByRole("textbox", {
      name: "Note for History (optional)",
    })
    await note.fill(NOTE)
    await barButton(page, /^Save\b/).click()
    await toast(page, /saved/i).waitFor()
    await expect.poll(() => note.inputValue()).toBe("")

    await openTab(page, "History")
    const newest = page
      .getByRole("list", { name: "Layout versions" })
      .getByRole("listitem")
      .first()
    expect(await newest.textContent()).toContain(NOTE)
    expect(await newest.textContent()).toContain("Live on your Site")
    expect((await summaries())[0]).toBe(NOTE)
  })

  it("gives a save without a note its automatic summary, and the earlier note stays", async () => {
    const { page } = h.user
    const tab = await openTab(page, "Layout")
    await tab.getByLabel("Name", { exact: true }).fill(`${NAME} renamed twice`)
    await barButton(page, /^Save\b/).click()
    await toast(page, /saved/i).waitFor()

    await expect.poll(async () => (await summaries()).length).toBeGreaterThan(2)
    const [latest, previous] = await summaries()
    expect(latest).not.toBe("")
    expect(latest).not.toBe(NOTE)
    expect(previous).toBe(NOTE)

    await openTab(page, "History")
    const rows = page
      .getByRole("list", { name: "Layout versions" })
      .getByRole("listitem")
    expect(await rows.nth(0).textContent()).not.toContain(NOTE)
    expect(await rows.nth(1).textContent()).toContain(NOTE)
  })
})
