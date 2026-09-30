import { createRequire } from "node:module"

import type {
  APIRequestContext,
  Frame,
  FrameLocator,
  Locator,
  Page,
} from "playwright-core"
import { expect } from "vitest"

import { ORIGIN } from "../../theme/support/env"

/**
 * Helpers for the Phase 5 acceptance tests (the Visual Editor). They were
 * written before the Visual Editor, from the spec only
 * (docs/plans/site-builder-milestone.md, "Phase 5"), so they reach it the way
 * a Staff User does: by role, by label and by the names the spec uses. Data is
 * set up and checked over HTTP, through Payload's REST API with the Staff
 * User's session cookie, never through the Site's own modules.
 *
 * Where a selector below turns out not to match the real UI, fix the selector
 * here, in one place; never weaken what a test asserts.
 */

const require = createRequire(import.meta.url)

/** Makes this run's paths and names unique, so reruns never collide. */
export const RUN = Date.now().toString(36)

/** A Page path that belongs to this run: `/ve-<run>-<name>`. */
export const runPath = (name: string) => `/ve-${RUN}-${name}`

// ── The Blocks, by the names the spec gives them ────────────────────────────

/** Page Blocks (spec "Phase 4: Block catalogue"). */
export const PAGE_BLOCKS = [
  "Hero",
  "Search Hero",
  "Rich text",
  "Call to action",
  "Featured rentals",
  "Large-group rentals",
  "Rental grid",
  "Steps",
  "Features",
  "Amenities",
  "Stats",
  "Image + text",
  "Testimonials",
  "Trust strip",
  "Owner band",
  "Newsletter",
  "Blog teaser",
  "Location",
  "FAQ",
  "Form",
] as const

/** Header-only Blocks (spec "Phase 3"). */
export const HEADER_BLOCKS = [
  "Logo",
  "Navigation",
  "Header actions",
  "Utility strip",
] as const

/** Footer Blocks: the footer-only ones plus the shared ones allowed there. */
export const FOOTER_BLOCKS = [
  "Footer columns",
  "Legal bar",
  "Newsletter",
  "Call to action",
] as const

// ── HTTP: Payload's REST API as the signed-in Staff User ─────────────────────

export type Doc = { id: number | string } & Record<string, unknown>

type Found = { docs: Doc[]; totalDocs: number }

async function ok(
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
  what: string
) {
  if (!response.ok()) {
    throw new Error(
      `${what} failed: ${response.status()} ${(await response.text()).slice(0, 500)}`
    )
  }
  return response
}

/**
 * Creates a Page with a title and a path, as a Draft or Published. It has no
 * Blocks: the tests add those in the Visual Editor. Its Layout is the default
 * (route) mode.
 */
export async function createPage(
  request: APIRequestContext,
  { title, path, publish }: { title: string; path: string; publish: boolean }
): Promise<Doc> {
  const response = await request.post(
    `${ORIGIN}/api/pages${publish ? "" : "?draft=true"}`,
    { data: { title, path, _status: publish ? "published" : "draft" } }
  )
  await ok(response, `Creating the Page ${path}`)
  return ((await response.json()) as { doc: Doc }).doc
}

/** The documents of `collection` matching `where` (flat `where[...]` params). */
export async function findDocs(
  request: APIRequestContext,
  collection: string,
  where: Record<string, string>,
  { draft = true }: { draft?: boolean } = {}
): Promise<Found> {
  const params = new URLSearchParams({
    depth: "0",
    limit: "100",
    ...(draft ? { draft: "true" } : {}),
    ...where,
  })
  const response = await request.get(`${ORIGIN}/api/${collection}?${params}`)
  await ok(response, `Reading ${collection}`)
  return (await response.json()) as Found
}

/** One document, the newest Draft included. */
export async function getDoc(
  request: APIRequestContext,
  collection: string,
  id: Doc["id"]
): Promise<Doc> {
  const response = await request.get(
    `${ORIGIN}/api/${collection}/${id}?depth=0&draft=true`
  )
  await ok(response, `Reading ${collection}/${id}`)
  return (await response.json()) as Doc
}

/** The Page at `path` (its newest Draft), or undefined. */
export async function pageAt(
  request: APIRequestContext,
  path: string
): Promise<Doc | undefined> {
  const found = await findDocs(request, "pages", {
    "where[path][equals]": path,
  })
  return found.docs[0]
}

/** The Layout called `name`, or undefined. */
export async function layoutNamed(
  request: APIRequestContext,
  name: string
): Promise<Doc | undefined> {
  const found = await findDocs(request, "layouts", {
    "where[name][equals]": name,
  })
  return found.docs[0]
}

/** The Site's default Layout (Phase 3 seeds it from the old SiteFrame). */
export async function defaultLayout(request: APIRequestContext): Promise<Doc> {
  const found = await findDocs(request, "layouts", {
    "where[isDefault][equals]": "true",
  })
  const layout = found.docs[0]
  if (!layout) throw new Error("The Site has no default Layout.")
  return layout
}

/**
 * Deletes the Pages and Layouts created since `since` (an ISO time), Pages
 * first because a Layout that Pages pick can't be deleted. The default Layout
 * is never touched. Leaves the scratch Site as the other specs expect it
 * (theme/admin-look photographs the empty Pages list).
 */
export async function deleteCreatedSince(
  request: APIRequestContext,
  since: string
): Promise<void> {
  const created = { "where[createdAt][greater_than_equal]": since }
  for (const collection of ["pages", "layouts"]) {
    let found: Found
    try {
      found = await findDocs(request, collection, created)
    } catch {
      continue // The collection may not exist yet (Phase 3).
    }
    for (const doc of found.docs) {
      if (doc.isDefault === true) continue
      await request.delete(`${ORIGIN}/api/${collection}/${doc.id}`)
    }
  }
}

// ── The Visual Editor ────────────────────────────────────────────────────────

export const editorUrl = {
  page: (id: Doc["id"]) => `${ORIGIN}/admin/pages/${id}`,
  layout: (id: Doc["id"]) => `${ORIGIN}/admin/layouts/${id}`,
  theme: () => `${ORIGIN}/admin/theme`,
}

/** The editor's URL patterns, to tell which document is open. */
export const EDITOR_ROUTE = {
  page: /\/admin\/pages\/[^/?#]+$/,
  layout: /\/admin\/layouts\/[^/?#]+$/,
  theme: /\/admin\/theme$/,
}

/** The pathname of the current URL, without query or hash. */
export const pathnameOf = (page: Page) => new URL(page.url()).pathname

/** The dark top bar. */
export const topBar = (page: Page) => page.getByRole("banner").first()

/** The canvas: the iframe that renders the real Site route. */
export const canvasElement = (page: Page) => page.locator("iframe").first()

/** Locators inside the canvas. */
export const canvas = (page: Page): FrameLocator =>
  canvasElement(page).contentFrame()

/** The canvas as a Frame, for evaluating script and running axe in it. */
export async function canvasFrame(page: Page): Promise<Frame> {
  const handle = await canvasElement(page)
    .elementHandle({ timeout: 30_000 })
    .catch(() => null)
  const frame = await handle?.contentFrame()
  if (!frame) throw new Error("The Visual Editor has no canvas iframe.")
  return frame
}

/**
 * Opens `url` in the Visual Editor and waits until the canvas has rendered
 * the Site. The Next.js dev indicator is hidden so it never covers controls.
 */
export async function openEditor(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  const frame = await canvasFrame(page)
  await frame.waitForLoadState("load")
  await frame.locator("body").waitFor()
}

/** A button or link in `scope` by its accessible name. */
export const control = (scope: Page | Locator, name: string | RegExp) =>
  scope
    .getByRole("button", { name, exact: typeof name === "string" })
    .or(scope.getByRole("link", { name, exact: typeof name === "string" }))
    .first()

/** A choice (radio, tab or toggle button) by its accessible name. */
export const choice = (scope: Page | Locator, name: string | RegExp) =>
  scope
    .getByRole("radio", { name, exact: typeof name === "string" })
    .or(scope.getByRole("button", { name, exact: typeof name === "string" }))
    .or(scope.getByRole("tab", { name, exact: typeof name === "string" }))
    .first()

/** The mode chip in the top bar: Page, Layout or Theme. */
export const modeChip = (page: Page, mode: "Page" | "Layout" | "Theme") =>
  topBar(page).getByText(mode, { exact: true }).first()

/** The panel's tab called `name`. */
export const panelTab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true })

/** Opens the panel's `name` tab and returns its panel. */
export async function openTab(page: Page, name: string): Promise<Locator> {
  await panelTab(page, name).click()
  const panel = page.getByRole("tabpanel", { name, exact: true })
  await panel.waitFor()
  return panel
}

/** The Outline's Block tree. */
export const outlineTree = (page: Page) =>
  page.getByRole("tabpanel", { name: "Outline", exact: true })

/** The Outline's items for `blockName` ("Hero", "Call to action"…), in order. */
export const outlineItems = (page: Page, blockName: string | RegExp) =>
  outlineTree(page).getByRole("treeitem", { name: blockName })

/** The search field of a picker dialog. */
export const searchField = (dialog: Locator) =>
  dialog
    .getByRole("combobox")
    .or(dialog.getByRole("searchbox"))
    .or(dialog.getByRole("textbox"))
    .first()

/** The top bar's button that opens the Ctrl-K Page picker. */
export const pagePickerButton = (page: Page) =>
  topBar(page).getByRole("button", {
    name: /Ctrl\s*\+?\s*K|⌘\s*K|Find a Page|Go to a Page|Search Pages/i,
  })

/** The Ctrl-K Page picker: a command dialog named for Pages, not Blocks. */
export const pagePicker = (page: Page) =>
  page.getByRole("dialog", { name: /^(?!.*\bBlock).*\bPages?\b/i })

/** Opens the Ctrl-K Page picker with the keyboard. */
export async function openPagePicker(page: Page): Promise<Locator> {
  await page.keyboard.press("Control+k")
  const dialog = pagePicker(page)
  await dialog.waitFor()
  return dialog
}

/** Picks the Page whose title or path matches `search` with Ctrl-K. */
export async function goToPage(
  page: Page,
  search: string,
  title: string
): Promise<void> {
  const dialog = await openPagePicker(page)
  await searchField(dialog).fill(search)
  await dialog
    .getByRole("option", { name: new RegExp(escapeRegExp(title)) })
    .click()
}

/** The Block picker (opened by "+"): a dialog named for Blocks. */
export const blockPicker = (page: Page) =>
  page.getByRole("dialog", { name: /\bBlocks?\b/i })

/** The picker's entry for the Block called `name`. */
export const pickerOption = (picker: Locator, name: string) =>
  picker
    .getByRole("option", { name: new RegExp(`^${escapeRegExp(name)}\\b`) })
    .or(
      picker.getByRole("button", {
        name: new RegExp(`^${escapeRegExp(name)}\\b`),
      })
    )
    .first()

/**
 * "+" buttons that open the Block picker. `where` narrows them to the
 * Outline's Header, Page or Footer group, by the button's name ("Add a Block
 * to the Header").
 */
export const addBlockButtons = (
  scope: Page | Locator | FrameLocator,
  where?: "Header" | "Page" | "Footer"
) =>
  scope.getByRole("button", {
    name: where
      ? new RegExp(`^Add (a )?Block.*\\b${where}\\b`, "i")
      : /^Add (a )?Block/i,
  })

/** Opens the Block picker with `plus`, searches for `name` and adds it. */
export async function addBlock(
  page: Page,
  plus: Locator,
  name: string
): Promise<void> {
  await plus.click()
  const picker = blockPicker(page)
  await picker.waitFor()
  await searchField(picker).fill(name)
  await pickerOption(picker, name).click()
  await picker.waitFor({ state: "hidden" })
}

/** The Block section in the canvas whose heading is `heading`. */
export const canvasBlock = (page: Page, heading: string) =>
  canvas(page)
    .locator("section")
    .filter({
      has: canvas(page).getByRole("heading", { name: heading, exact: true }),
    })
    .first()

/**
 * The first element matching `make` that is visible either in the Admin page
 * or inside the canvas (a selected Block's toolbar and the hover label may be
 * drawn in either).
 */
export async function visibleInEditor(
  page: Page,
  make: (root: Page | FrameLocator) => Locator,
  { timeout = 10_000 }: { timeout?: number } = {}
): Promise<Locator> {
  const roots: (Page | FrameLocator)[] = [page, canvas(page)]
  const deadline = Date.now() + timeout
  for (;;) {
    for (const root of roots) {
      const found = make(root).first()
      if (await found.isVisible().catch(() => false)) return found
    }
    if (Date.now() > deadline) {
      throw new Error("Not visible in the Admin page or the canvas.")
    }
    await page.waitForTimeout(100)
  }
}

/** Whether anything matching `make` is visible in the page or the canvas. */
export async function anyVisibleInEditor(
  page: Page,
  make: (root: Page | FrameLocator) => Locator
): Promise<boolean> {
  for (const root of [page, canvas(page)] as (Page | FrameLocator)[]) {
    for (const found of await make(root).all()) {
      if (await found.isVisible().catch(() => false)) return true
    }
  }
  return false
}

/**
 * Whether a label reading `text` is visible over the canvas: inside the
 * iframe, or in the Admin page within the iframe's box (not in the Outline).
 */
export async function labelOverCanvas(
  page: Page,
  text: string
): Promise<boolean> {
  // Callers check the label is absent before hovering, so any visible match
  // inside the iframe is the editor's label, not the Block's own copy.
  for (const label of await canvas(page)
    .getByText(text, { exact: true })
    .all()) {
    if (await label.isVisible()) return true
  }
  const frame = await canvasElement(page).boundingBox()
  if (!frame) return false
  for (const label of await page.getByText(text, { exact: true }).all()) {
    const box = await label.boundingBox()
    if (
      box &&
      box.x >= frame.x &&
      box.y >= frame.y &&
      box.x + box.width <= frame.x + frame.width &&
      box.y + box.height <= frame.y + frame.height
    )
      return true
  }
  return false
}

/** The toolbar button on the selected Block: "Move up", "Duplicate"… */
export const blockToolbarButton = (page: Page, name: string) =>
  visibleInEditor(page, (root) =>
    root.getByRole("button", { name, exact: true })
  )

/** The text of the canvas's main content (textContent: no CSS text-transform). */
export const canvasMainText = async (page: Page) =>
  (await canvas(page).locator("main").first().textContent()) ?? ""

/** Positions of each of `texts` in `text`, to check their order. */
export function positions(text: string, texts: readonly string[]): number[] {
  return texts.map((t) => text.indexOf(t))
}

/** Whether every text is present and they appear in the given order. */
export function inOrder(text: string, texts: readonly string[]): boolean {
  const at = positions(text, texts)
  return at.every((p, i) => p >= 0 && (i === 0 || p > at[i - 1]!))
}

/** A custom property at the canvas's document root, as computed. */
export async function canvasToken(page: Page, name: string): Promise<string> {
  const frame = await canvasFrame(page)
  return frame.evaluate(
    (prop) =>
      getComputedStyle(document.documentElement).getPropertyValue(prop).trim(),
    name
  )
}

/** `colour` as the browser computes it (rgb()), so notations compare equal. */
export function computedColour(
  target: Page | Frame,
  colour: string
): Promise<string> {
  const frame = "mainFrame" in target ? target.mainFrame() : target
  return frame.evaluate((value) => {
    const probe = document.createElement("div")
    probe.style.color = value
    document.body.appendChild(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()
    return computed
  }, colour)
}

/** A sonner toast (or any status message) reading `text`. */
export const toast = (page: Page, text: RegExp) =>
  page
    .locator("[data-sonner-toast]")
    .filter({ hasText: text })
    .or(page.getByRole("status").filter({ hasText: text }))
    .first()

/** Polls until `locator` is visible, failing with `message`. */
export async function expectVisible(
  locator: Locator,
  message: string,
  timeout = 15_000
): Promise<void> {
  await expect
    .poll(() => locator.isVisible(), { message, timeout, interval: 100 })
    .toBe(true)
}

/** Polls until `locator` is hidden or gone, failing with `message`. */
export async function expectHidden(
  locator: Locator,
  message: string,
  timeout = 15_000
): Promise<void> {
  await expect
    .poll(() => locator.isVisible(), { message, timeout, interval: 100 })
    .toBe(false)
}

/** The unsaved-changes guard's dialog (the Phase 1 Save / Discard / Stay). */
export const unsavedDialog = (page: Page) =>
  page.getByRole("alertdialog").filter({ hasText: "You have unsaved changes" })

// ── Network ──────────────────────────────────────────────────────────────────

/** Requests that would make a round trip to the server for a preview. */
const ROUND_TRIP = new Set(["document", "fetch", "xhr", "eventsource"])

/** The dev server's own traffic (hot reload, overlays), which is not the editor's. */
const DEV_TRAFFIC = /\/_next\/webpack-hmr|\/__nextjs|\/_next\/static\//

/**
 * Starts recording the round trips the Admin page and its canvas make (every
 * frame's requests are the page's). `stop` returns them as "METHOD url".
 */
export function recordRoundTrips(page: Page): { stop(): string[] } {
  const seen: string[] = []
  const listener = (request: {
    resourceType(): string
    url(): string
    method(): string
  }) => {
    if (!ROUND_TRIP.has(request.resourceType())) return
    if (DEV_TRAFFIC.test(request.url())) return
    seen.push(`${request.method()} ${request.url()}`)
  }
  page.on("request", listener)
  return {
    stop() {
      page.off("request", listener)
      return [...seen]
    },
  }
}

// ── Pointer ──────────────────────────────────────────────────────────────────

/**
 * Drags `from` onto `to` with a real pointer, in small steps, as drag-and-drop
 * libraries need to see movement before they start a drag.
 */
export async function drag(
  page: Page,
  from: Locator,
  to: Locator
): Promise<void> {
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  if (!a || !b) throw new Error("Nothing to drag, or nowhere to drop.")
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 8, {
    steps: 5,
  })
  // Drop on the upper part of the target, so it lands before it.
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.25, {
    steps: 20,
  })
  await page.mouse.up()
}

// ── Accessibility ────────────────────────────────────────────────────────────

export type AxeViolation = {
  id: string
  impact: string | null
  help: string
  nodes: { target: string; summary: string }[]
}

/**
 * WCAG 2.2 AA violations in one document (axe-core): the Admin page, or the
 * canvas. Frames are checked one at a time, each with its own copy of axe, so
 * the Admin's check never waits on the canvas.
 */
export async function axeIn(target: Page | Frame): Promise<AxeViolation[]> {
  const frame = "mainFrame" in target ? target.mainFrame() : target
  await frame.addScriptTag({ path: require.resolve("axe-core/axe.min.js") })
  return frame.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: unknown
          ) => Promise<{
            violations: {
              id: string
              impact: string | null
              help: string
              nodes: { target: unknown[]; failureSummary?: string }[]
            }[]
          }>
        }
      }
    ).axe
    const results = await axe.run(document, {
      iframes: false,
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    })
    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target.join(" "),
        summary: (node.failureSummary ?? "").split("\n").slice(0, 3).join(" "),
      })),
    }))
  })
}

/** Fails with every WCAG 2.2 AA violation in the Admin page and the canvas. */
export async function expectNoAxeViolations(
  page: Page,
  screen: string,
  { includeCanvas = true }: { includeCanvas?: boolean } = {}
): Promise<void> {
  const admin = await axeIn(page)
  expect(admin, `${screen}: WCAG 2.2 AA violations in the Admin`).toEqual([])
  if (!includeCanvas) return
  const inCanvas = await axeIn(await canvasFrame(page))
  expect(inCanvas, `${screen}: WCAG 2.2 AA violations in the canvas`).toEqual(
    []
  )
}

// ── Keyboard focus ───────────────────────────────────────────────────────────

/**
 * Tabs through the page up to `max` times and returns, for every stop inside
 * `within`, its accessible name and whether focus is drawn (an outline or a
 * box-shadow that the element does not have at rest).
 */
export async function tabStops(
  page: Page,
  within: Locator,
  max = 60
): Promise<{ name: string; visible: boolean }[]> {
  const stops: { name: string; visible: boolean }[] = []
  const container = await within.elementHandle()
  if (!container) return stops
  // Start from the top of the document.
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur()
  )
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab")
    const stop = await page.evaluate((root) => {
      const el = document.activeElement as HTMLElement | null
      if (!el || !root.contains(el)) return null
      const style = getComputedStyle(el)
      const outline =
        style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0
      const shadow = style.boxShadow !== "none"
      const name =
        el.getAttribute("aria-label") ||
        el.textContent?.trim() ||
        el.getAttribute("title") ||
        el.tagName
      return { name, visible: outline || shadow }
    }, container)
    if (stop) stops.push(stop)
  }
  return stops
}

/** `text` escaped for use inside a RegExp. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ── Top bar actions and panel fields ─────────────────────────────────────────

/** A top bar button by its name: "Save", "Publish", "Undo"… */
export const barButton = (page: Page, name: string | RegExp) =>
  topBar(page).getByRole("button", { name, exact: typeof name === "string" })

/**
 * Presses Discard, and confirms it if the editor asks first (discarding loses
 * work, so it may). Does nothing when Discard is disabled: nothing is unsaved,
 * so there is nothing left to discard (an edit that ends on the saved value
 * leaves the editor clean).
 */
export async function discard(page: Page): Promise<void> {
  const button = barButton(page, "Discard")
  if (await button.isDisabled()) return
  await button.click()
  const confirm = page.getByRole("alertdialog")
  try {
    await confirm.waitFor({ timeout: 2_000 })
  } catch {
    return
  }
  await confirm.getByRole("button", { name: /^Discard/ }).click()
  await confirm.waitFor({ state: "hidden" })
}

/**
 * Picks the Layout called `name` for the Page, in the Page tab: the
 * "specific" mode, then that Layout (a native select, or a combobox with
 * options).
 */
export async function pickLayout(
  page: Page,
  pageTab: Locator,
  name: string
): Promise<void> {
  const specific = pageTab.getByRole("radio", {
    name: /specific|choose|pick|another Layout/i,
  })
  if (await specific.count()) await specific.first().check()
  const select = pageTab.getByRole("combobox", { name: /Layout/ }).first()
  const tag = await select.evaluate((el) => el.tagName)
  if (tag === "SELECT") {
    await select.selectOption({ label: name })
  } else {
    await select.click()
    await page.getByRole("option", { name, exact: true }).click()
  }
}

/** The Block tab's first text field: the main text of the selected Block. */
export const firstTextField = (blockTab: Locator) =>
  blockTab.getByRole("textbox").first()

/** The Staff User's document-level focus is in editable text. */
export async function editingInPlace(page: Page): Promise<boolean> {
  const frame = await canvasFrame(page)
  return frame.evaluate(
    () =>
      (document.activeElement as HTMLElement | null)?.isContentEditable ?? false
  )
}
