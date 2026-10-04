import { readFile } from "node:fs/promises"

import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Doc } from "../3-layouts/support/api"
import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Pages export and import (apps/site ADR-0014), from the Pages list.
 *
 * - Each row has Export, which downloads the Page as a file: its title, path
 *   and Blocks, and nothing that belongs to this Site only.
 * - Import takes such a file and adds the Page as a new Draft. A path that is
 *   taken gets the next free one, and the dialog says so and links to the
 *   new Page. The Page it came from is left as it was.
 * - A file that isn't a Page is refused, with the reason.
 * - The list and the dialog pass WCAG 2.2 AA.
 */

const RUN = Date.now()
const TITLE = `E2E transfer ${RUN}`
const PATH = `/e2e-transfer-${RUN}`

let h: Harness
let doc: Doc

type Found = { docs: Doc[] }

const pagesAt = async (path: string): Promise<Doc[]> =>
  (
    (await (
      await h.staff.context.request.get(
        `${ORIGIN}/api/pages?where[path][equals]=${encodeURIComponent(path)}&draft=true&depth=0`
      )
    ).json()) as Found
  ).docs

beforeAll(async () => {
  h = await openHarness()
  const made = await h.staff.context.request.post(
    `${ORIGIN}/api/pages?draft=false`,
    {
      data: {
        title: TITLE,
        path: PATH,
        _status: "published",
        blocks: [
          { blockType: "hero", heading: `Welcome ${RUN}` },
          {
            blockType: "button",
            link: { label: "Book", href: "/book" },
            style: "primary",
            align: "start",
          },
        ],
      },
    }
  )
  expect(made.ok(), await made.text()).toBe(true)
  doc = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", doc.id)
})

afterAll(async () => {
  if (h) {
    for (const page of await pagesAt(`${PATH}-2`)) h.api.track("page", page.id)
  }
  await closeHarness(h)
})

const rowFor = (page: Page, title: string) =>
  page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: title, exact: true }) })

let exported = ""

describe("exporting a Page", () => {
  it("downloads it from its row, as a file with nothing of this Site's in it", async () => {
    const { page } = h.staff
    await visit(page, `/admin/pages?q=${encodeURIComponent(TITLE)}`)
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      rowFor(page, TITLE)
        .getByRole("button", { name: `Export ${TITLE}` })
        .click(),
    ])
    expect(download.suggestedFilename()).toBe(`e2e-transfer-${RUN}.page.json`)
    exported = await readFile(await download.path(), "utf8")
    expect(JSON.parse(exported)).toMatchObject({
      awaydayPage: 1,
      title: TITLE,
      path: PATH,
      blocks: [
        { blockType: "hero", heading: `Welcome ${RUN}` },
        { blockType: "button", link: { label: "Book", href: "/book" } },
      ],
    })
    expect(exported).not.toMatch(/"id":|"_status"/)
    expect(await accessibilityProblems(page)).toBe("")
  })
})

describe("importing a Page", () => {
  it("adds it as a new Draft at the next free path, and says so", async () => {
    const { page } = h.staff
    await visit(page, "/admin/pages")
    await page.getByLabel("Page file to import").setInputFiles({
      name: "page.json",
      mimeType: "application/json",
      buffer: Buffer.from(exported),
    })
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("heading", { name: "Page imported" }).waitFor()
    const words = (await dialog.textContent()) ?? ""
    expect(words).toContain(`Imported “${TITLE}” as a Draft at ${PATH}-2.`)
    expect(words).toContain(`“${PATH}” is taken`)
    expect(await accessibilityProblems(page)).toBe("")

    const [copy] = await pagesAt(`${PATH}-2`)
    expect(copy).toMatchObject({ title: TITLE, _status: "draft" })
    expect(
      (copy!.blocks as { blockType: string }[]).map((b) => b.blockType)
    ).toEqual(["hero", "button"])
    // The Page it came from is as it was.
    expect((await h.api.getPage(doc.id))?.path).toBe(PATH)

    await dialog.getByRole("link", { name: "Edit the Page" }).click()
    await page.waitForURL(`**/admin/pages/${copy!.id}`)
  })

  it("refuses a file that isn't a Page, with the reason", async () => {
    const { page } = h.staff
    await visit(page, "/admin/pages")
    await page.getByLabel("Page file to import").setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"hello":"world"}'),
    })
    const dialog = page.getByRole("dialog")
    await dialog
      .getByRole("heading", { name: "The Page was not imported" })
      .waitFor()
    expect(await dialog.getByRole("alert").textContent()).toContain(
      "isn't a Page exported from an Awayday Site"
    )
    await dialog.getByRole("button", { name: "Close" }).first().click()
    await dialog.waitFor({ state: "hidden" })
  })
})
