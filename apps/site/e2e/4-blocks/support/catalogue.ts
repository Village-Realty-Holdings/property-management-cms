import type { Browser, Locator, Page } from "playwright-core"

import { openSession, visit } from "../../theme/support/browser"

/**
 * The Block catalogue: how the Phase 4 acceptance tests reach every Block.
 *
 * The suite was written before the Blocks, so it pins down only what a
 * visitor's browser can see. The contract the Site must meet:
 *
 * - `GET /dev/blocks` (outside production only, like `/dev/theme-sample`;
 *   404 in production) is the Block catalogue. It lists every Page Block as
 *   a list item holding a link named exactly as the spec names the Block
 *   ("Hero", "Search Hero", "Image + text", …) and the Block's thumbnail for
 *   the Block picker, as an `<img>`.
 * - Each link opens that Block's catalogue page: the one Block, rendered by
 *   the same component a published Page uses, inside the Site's layout and
 *   Theme, from the Block's **sample data**. The sample data fills every
 *   field and option the Block has (the Hero's eyebrow, accent word and
 *   trust strip, the Image + text caption and icon list, …).
 * - Query parameters on a Block's page:
 *   - `background`: `default`, `muted`, `primary` or `dark` (Dark surface),
 *     for the Blocks that take a background.
 *   - `variant`: the Block's display option: Featured rentals and
 *     Testimonials `carousel` | `grid`; Amenities `mosaic` | `icons` (icon
 *     list); Image + text `left` | `right` (image side); Trust strip
 *     `items` | `logos` (partner logos).
 *   - `fixtures`: a Site's schema (`avada`, `warren_beach`) whose fixture
 *     module (`src/site/fixtures/<schema>.ts`) the Rental and Blog Blocks
 *     read instead of the running Site's own. Without it they read the
 *     running Site's, and the scratch schema the tests run on has none.
 *   - any other parameter overrides the sample field of that name; the tests
 *     use `count` (Featured rentals) and `minSleeps` (Large-group rentals).
 * - A Block renders as a `<section>` with an accessible name (it is a
 *   landmark region), labelled by its heading when it has one. A Rental card
 *   and a blog post card are each an `<article>` whose first heading is the
 *   Rental's name or the post's title.
 */

export const CATALOGUE_PATH = "/dev/blocks"

export type Background =
  | "default"
  | "muted"
  | "primary"
  | "accent"
  | "third"
  | "dark"

export const BACKGROUNDS: readonly Background[] = [
  "default",
  "muted",
  "primary",
  "accent",
  "third",
  "dark",
]

/** The token each background paints the Block with. */
export const BACKGROUND_TOKEN: Record<Background, string> = {
  default: "--background",
  muted: "--muted",
  primary: "--primary",
  accent: "--accent",
  // A Theme with no third colour paints Third with its secondary.
  third: "var(--third, var(--secondary))",
  dark: "--surface-dark",
}

export type BlockSpec = {
  /** As the spec names it, which is also the Admin's label. */
  name: string
  /** Takes a Default / Muted / Primary / Dark surface background. */
  backgrounds: boolean
  /** Where its sample data puts it when the background is not given. */
  defaultBackground?: Background
}

/**
 * Every Page Block of the Phase 4 catalogue. The two Heroes sit on their
 * photo (or the primary colour) and take no background; every other Block
 * can sit on any of the four, which is the most the spec allows.
 */
export const PAGE_BLOCKS: readonly BlockSpec[] = [
  { name: "Hero", backgrounds: false },
  { name: "Search Hero", backgrounds: false },
  { name: "Rich text", backgrounds: true },
  { name: "Call to action", backgrounds: true },
  { name: "Featured rentals", backgrounds: true },
  { name: "Large-group rentals", backgrounds: true },
  { name: "Rental grid", backgrounds: true },
  { name: "Steps", backgrounds: true },
  { name: "Features", backgrounds: true },
  { name: "Amenities", backgrounds: true },
  { name: "Stats", backgrounds: true },
  { name: "Image + text", backgrounds: true },
  { name: "Testimonials", backgrounds: true },
  { name: "Trust strip", backgrounds: true },
  // "Usually on the dark surface": its sample data puts it there.
  { name: "Owner band", backgrounds: true, defaultBackground: "dark" },
  { name: "Newsletter", backgrounds: true },
  { name: "Blog teaser", backgrounds: true },
  { name: "Location", backgrounds: true },
  { name: "FAQ", backgrounds: true },
  { name: "Form", backgrounds: true },
  { name: "Guest feedback survey", backgrounds: true },
]

/**
 * The small Blocks that came with the Container (Container Blocks, Phase 2).
 * They have no background of their own: they sit on the page's, or on their
 * Container's.
 */
export const SMALL_BLOCKS: readonly BlockSpec[] = [
  { name: "Button", backgrounds: false },
  { name: "Image", backgrounds: false },
]

/** A file-name-safe id for a Block: "Image + text" is "image-text". */
export function blockFileId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** The catalogue's link for each Block, read once from `/dev/blocks`. */
let hrefs: Map<string, string> | undefined

/**
 * The path of each Block's catalogue page, as the catalogue links to it.
 * A Block the catalogue does not list is missing from the map.
 */
export async function catalogueLinks(
  browser: Browser
): Promise<Map<string, string>> {
  if (hrefs) return hrefs
  const { context, page } = await openSession(browser)
  try {
    await visit(page, CATALOGUE_PATH)
    const found = new Map<string, string>()
    for (const { name } of [...PAGE_BLOCKS, ...SMALL_BLOCKS]) {
      const link = page.getByRole("link", { name, exact: true })
      if ((await link.count()) !== 1) continue
      const href = await link.getAttribute("href")
      if (href) found.set(name, new URL(href, page.url()).pathname)
    }
    hrefs = found
    return found
  } finally {
    await context.close()
  }
}

export type BlockQuery = {
  background?: Background
  variant?: string
  fixtures?: string
  [field: string]: string | number | undefined
}

/** A Block's catalogue page with `query`. Throws when the Block is not listed. */
export async function blockPath(
  browser: Browser,
  name: string,
  query: BlockQuery = {}
): Promise<string> {
  const path = (await catalogueLinks(browser)).get(name)
  if (!path) {
    throw new Error(
      `The Block catalogue (${CATALOGUE_PATH}) has no link named "${name}".`
    )
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

/** The Block on a catalogue page: the first named region in `main`. */
export function blockRegion(page: Page): Locator {
  return page.locator("main").getByRole("region").first()
}

/**
 * The colour a Block is painted with: its own background, else that of a
 * child that covers (nearly) all of it, else the first painted ancestor's.
 */
export function effectiveBackground(region: Locator): Promise<string> {
  return region.evaluate((element) => {
    const transparent = (colour: string) =>
      colour === "transparent" || /rgba\(.*,\s*0\)$/.test(colour)
    const own = getComputedStyle(element).backgroundColor
    if (!transparent(own)) return own
    const box = element.getBoundingClientRect()
    const area = box.width * box.height
    const queue = [...element.children]
    while (queue.length) {
      const child = queue.shift()!
      const rect = child.getBoundingClientRect()
      if (rect.width * rect.height < area * 0.9) continue
      const colour = getComputedStyle(child).backgroundColor
      if (!transparent(colour)) return colour
      queue.push(...child.children)
    }
    for (let node = element.parentElement; node; node = node.parentElement) {
      const colour = getComputedStyle(node).backgroundColor
      if (!transparent(colour)) return colour
    }
    return "rgba(0, 0, 0, 0)"
  })
}

/** A colour token as the browser computes it when painted as a background. */
export function tokenColour(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement("div")
    probe.style.backgroundColor = name.startsWith("var(")
      ? name
      : `var(${name})`
    document.body.appendChild(probe)
    const colour = getComputedStyle(probe).backgroundColor
    probe.remove()
    return colour
  }, token)
}

/** How far the page scrolls sideways (0 when it reflows to the viewport). */
export function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  )
}

/** Images in `scope` that did not load (no pixels), by their `src`. */
export function brokenImages(scope: Locator): Promise<string[]> {
  return scope.evaluate((element) =>
    [...element.querySelectorAll("img")]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src)
  )
}

/**
 * Everything the page does from now on that is more than reading: requests
 * other than GET (a form post, a server action) and navigations of the
 * page itself. A visual-only form must leave both empty.
 */
export function watchWrites(page: Page) {
  const writes: string[] = []
  const navigations: string[] = []
  page.on("request", (request) => {
    if (request.method() !== "GET")
      writes.push(`${request.method()} ${request.url()}`)
  })
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url())
  })
  return { writes, navigations }
}

/**
 * Fills every field of `form` with a plausible value, by input type, so a
 * visual-only form can be submitted whatever it requires.
 */
export async function fillEveryField(form: Locator): Promise<void> {
  const fields = form.locator(
    "input:not([type=hidden]):not([type=submit]):not([type=button]):not([disabled]), textarea, select"
  )
  const count = await fields.count()
  for (let i = 0; i < count; i++) {
    const field = fields.nth(i)
    if (!(await field.isVisible())) continue
    const tag = await field.evaluate((el) => el.tagName.toLowerCase())
    if (tag === "select") {
      const values = await field.evaluate((el) =>
        [...(el as HTMLSelectElement).options]
          .map((option) => option.value)
          .filter(Boolean)
      )
      if (values[0]) await field.selectOption(values[0])
      continue
    }
    const type = (await field.getAttribute("type")) ?? "text"
    if (type === "checkbox" || type === "radio") {
      await field.check()
      continue
    }
    const value =
      tag === "textarea"
        ? "Hello, a question about a stay."
        : ({
            email: "guest@example.com",
            tel: "+1 555 0100",
            date: "2026-10-10",
            number: "4",
            url: "https://example.com",
          }[type] ?? "Sample")
    await field.fill(value)
  }
}

/** A toast, whether shown by sonner or as an ARIA status. */
export function toast(page: Page): Locator {
  return page.locator("[data-sonner-toast]").or(page.getByRole("status"))
}

/**
 * The left edges of `items`, to tell whether a carousel moved: the Next
 * control scrolls or translates its track, which moves every item.
 */
export async function leftEdges(items: Locator): Promise<number[]> {
  const count = await items.count()
  const edges: number[] = []
  for (let i = 0; i < count; i++) {
    const box = await items.nth(i).boundingBox()
    edges.push(Math.round(box?.x ?? Number.NaN))
  }
  return edges
}

/** A carousel's Next and Previous controls inside `scope`. */
export function carouselControls(scope: Locator) {
  return {
    next: scope.getByRole("button", { name: /next/i }).first(),
    previous: scope.getByRole("button", { name: /prev/i }).first(),
  }
}

/** Resolves once the page has had time to finish a scroll or transition. */
export function settle(page: Page, ms = 700): Promise<void> {
  return page.waitForTimeout(ms)
}
