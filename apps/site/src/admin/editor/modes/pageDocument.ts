import type { Page } from "../../../payload-types"
import { emptyBlock, type BlockValues, type HeroValues } from "../../pageForm"
import type { LayoutChoice, PageDocument } from "../state"

/**
 * A Page as the Visual Editor holds it, and back to what Payload stores.
 *
 * The document keeps every Block exactly as stored at depth 0: Media as ids,
 * rich text as Lexical JSON, and any kind of Block (the catalogue is wider
 * than the old form's three). That is also what the canvas renders from, so
 * nothing is converted between editing and showing. Pure and isomorphic: the
 * server reads and writes with it, the editor holds it.
 */

/** What a New Page is called until its Staff User names it. */
export const NEW_PAGE_TITLE = "Untitled Page"

const NEW_PAGE_PATH = "/untitled-page"

/** The editor gives Blocks it adds an id like `new-3`; Payload makes the real one. */
const isEditorId = (id: unknown) =>
  typeof id === "string" && /^new-\d+$/.test(id)

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === "object" && value !== null ? value.id : (value ?? null)

function layoutChoice(layout: Page["layout"] | undefined): LayoutChoice {
  if (layout?.mode === "none") return { mode: "none" }
  const layoutId = idOf(layout?.layout)
  if (layout?.mode === "specific" && layoutId !== null) {
    return { mode: "layout", layoutId }
  }
  return { mode: "default" }
}

/** A stored Page (read at depth 0, its Draft) as the document to edit. */
export function pageDocumentFromPage(page: Page): PageDocument {
  return {
    kind: "page",
    title: page.title ?? "",
    path: page.path ?? "",
    layout: layoutChoice(page.layout),
    blocks: (page.blocks ?? []) as unknown as BlockValues[],
    seo: {
      title: page.seo?.title ?? "",
      description: page.seo?.description ?? "",
      image: idOf(page.seo?.image),
    },
  }
}

/** The data to store for `doc`. */
export function pageDataFromDocument(doc: PageDocument) {
  const blocks = doc.blocks.map((block) => {
    if (!isEditorId(block.id)) return block
    return Object.fromEntries(
      Object.entries(block).filter(([key]) => key !== "id")
    )
  })
  const layout =
    doc.layout.mode === "none"
      ? ({ mode: "none" } as const)
      : doc.layout.mode === "layout"
        ? ({ mode: "specific", layout: doc.layout.layoutId } as const)
        : ({ mode: "route" } as const)
  return {
    title: doc.title,
    path: doc.path,
    blocks: blocks as unknown as NonNullable<Page["blocks"]>,
    layout,
    seo: {
      title: doc.seo.title || null,
      description: doc.seo.description || null,
      image: doc.seo.image,
    },
  }
}

/** `base`, or `base-2`, `base-3`... the first that is not in `taken`. */
export function freePath(base: string, taken: readonly string[]): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let n = 2; ; n++) {
    if (!used.has(`${base}-${n}`)) return `${base}-${n}`
  }
}

/** The document a New Page starts as: unsaved until its first Save. */
export function newPageDocument(path: string = NEW_PAGE_PATH): PageDocument {
  return {
    kind: "page",
    title: NEW_PAGE_TITLE,
    path,
    layout: { mode: "default" },
    blocks: [{ ...(emptyBlock("hero") as HeroValues), heading: "Welcome" }],
    seo: { title: "", description: "", image: null },
  }
}

/** The path a New Page starts with, given the paths Pages already use. */
export const newPagePath = (taken: readonly string[]) =>
  freePath(NEW_PAGE_PATH, taken)
