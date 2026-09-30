import { validateHref } from "../../fields/link"
import { normalizeInputs, type ThemeInputs } from "../../theme/inputs"
import { FALLBACK_INPUTS } from "../../theme/record/fallback"
import type { PageBlock } from "../../site/blocks/types"
import type { FooterBlock, HeaderBlock } from "../../site/regions/types"
import type { EditorDocument, Region } from "./state"

/**
 * The message protocol between the Visual Editor and its canvas.
 *
 * The canvas is an iframe on the real Site route in its editing mode (see
 * src/site/editing). The Admin owns the document being edited; on every
 * change it posts the whole document to the canvas, which renders it from
 * that message alone. So an edit shows the moment it is made, with no network
 * round trip (Phase 5: instant preview).
 *
 *   Admin  -> canvas   `document`        the document to show, and which
 *                                        Block is selected
 *   canvas -> Admin    `ready`           the canvas can receive documents
 *   canvas -> Admin    `select`          a Block was clicked
 *   canvas -> Admin    `move`            the selected Block's toolbar: up or down
 *   canvas -> Admin    `duplicate`       ... Duplicate
 *   canvas -> Admin    `delete`          ... Delete
 *   canvas -> Admin    `insert-request`  a "+" was pressed: a Block is wanted
 *                                        at that place in that region
 *   canvas -> Admin    `edit-text`       text edited in place: a Block's field
 *                                        and its whole new value (a string, or
 *                                        rich text's Lexical JSON), once per
 *                                        input
 *
 * Both windows are on the Site's own origin, and both ends check it: a
 * message is read only when it comes from the expected window on the expected
 * origin, and is posted only to that origin, never to "*". Anything else,
 * including a message of another shape, is ignored. The canvas only asks: the
 * Admin decides whether a request applies (a Block of a locked region is not
 * in its document, so a request for it does nothing). A later slice adds the
 * canvas's `key` message here.
 */

/** Tags our messages, so they are told apart from any other on the window. */
export const BRIDGE_CHANNEL = "site-builder/canvas"

/** Which kind of document the canvas is showing. */
export type CanvasMode = "page" | "layout" | "theme"

const MODES: readonly CanvasMode[] = ["page", "layout", "theme"]

/**
 * Everything the canvas draws: the Page's Blocks between the Layout's Header
 * and Footer, and the unsaved Theme's inputs while the Theme is being edited
 * (null otherwise: the saved Theme the route already emitted applies).
 */
export type CanvasDocument = {
  mode: CanvasMode
  page: PageBlock[]
  header: HeaderBlock[]
  footer: FooterBlock[]
  theme: ThemeInputs | null
  /**
   * The Block the Staff User has selected, by id. `useCanvasBridge` fills it
   * in from the editor's state; it reads as null when missing.
   */
  selectedId?: string | null
}

/**
 * The regions a Staff User can edit in the canvas, which the canvas reads
 * from the document's mode: a Page's Blocks in Page mode, the Header and
 * Footer in Layout mode, and none in Theme mode. The rest is locked.
 */
export function editableRegions(mode: CanvasMode): readonly Region[] {
  switch (mode) {
    case "page":
      return ["page"]
    case "layout":
      return ["header", "footer"]
    case "theme":
      return []
  }
}

type Envelope = { channel: typeof BRIDGE_CHANNEL }

/** Admin to canvas. */
export type ParentMessage = Envelope & {
  type: "document"
  document: CanvasDocument
}

/** What the canvas asks of the Admin. Each names a Block by its id. */
export type CanvasRequest =
  | { type: "select"; id: string }
  | { type: "move"; id: string; direction: "up" | "down" }
  | { type: "duplicate"; id: string }
  | { type: "delete"; id: string }
  /** `index` is where the new Block goes in `region` (0 is before the first). */
  | { type: "insert-request"; region: Region; index: number }
  /**
   * Text edited in place: the whole new value of the field `fieldPath` of the
   * Block at `index` in `region`. A plain text is a string; rich text is its
   * Lexical JSON.
   */
  | {
      type: "edit-text"
      region: Region
      index: number
      fieldPath: string
      value: string | Record<string, unknown>
    }

/** What the canvas sends: `ready`, or a request. */
export type CanvasAction = { type: "ready" } | CanvasRequest

/** Canvas to Admin. */
export type CanvasMessage = Envelope & CanvasAction

/** The parts of a `MessageEvent` the checks read. */
export type MessageLike = {
  data: unknown
  origin: string
  source: MessageEventSource | null
}

// ── Building ─────────────────────────────────────────────────────────────────

/** The saved parts of the Site around the document being edited. */
export type Surroundings = {
  page: PageBlock[]
  header: HeaderBlock[]
  footer: FooterBlock[]
}

/**
 * What the canvas draws for `doc`: the document's own Blocks in their place,
 * and `around` (what is saved) for the rest. A Page sits in the Layout it
 * resolves to; a Layout shows around a sample Page; the Theme is shown on a
 * Page in its Layout, with its unsaved inputs.
 */
export function canvasDocument(
  doc: EditorDocument,
  around: Surroundings
): CanvasDocument {
  switch (doc.kind) {
    case "page":
      return {
        mode: "page",
        page: doc.blocks as unknown as PageBlock[],
        header: around.header,
        footer: around.footer,
        theme: null,
      }
    case "layout":
      return {
        mode: "layout",
        page: around.page,
        header: doc.header as unknown as HeaderBlock[],
        footer: doc.footer as unknown as FooterBlock[],
        theme: null,
      }
    case "theme":
      return { mode: "theme", ...around, theme: doc.inputs }
  }
}

// ── Reading ──────────────────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isBlockList = <T>(value: unknown): value is T[] =>
  Array.isArray(value) &&
  value.every((item) => isRecord(item) && typeof item.blockType === "string")

function readEnvelope(data: unknown): Record<string, unknown> | null {
  return isRecord(data) && data.channel === BRIDGE_CHANNEL ? data : null
}

/** A document off the wire, or null when it is not a well-formed one. */
function readDocument(value: unknown): CanvasDocument | null {
  if (!isRecord(value)) return null
  const { mode, page, header, footer, theme, selectedId } = value
  if (!MODES.includes(mode as CanvasMode)) return null
  if (!isBlockList<PageBlock>(page)) return null
  if (!isBlockList<HeaderBlock>(header)) return null
  if (!isBlockList<FooterBlock>(footer)) return null
  if (theme !== null && !isRecord(theme)) return null
  return {
    mode: mode as CanvasMode,
    page,
    header,
    footer,
    // Unsaved inputs are made safe to derive from: a bad value takes the
    // default's, as inputs read from storage do.
    theme: theme === null ? null : normalizeInputs(theme, FALLBACK_INPUTS),
    selectedId: typeof selectedId === "string" ? selectedId : null,
  }
}

/**
 * The canvas reads the Admin: a `document` message from `parent`, on
 * `origin`. Null for anything else.
 */
export function readParentMessage(
  event: MessageLike,
  expected: { origin: string; parent: Window }
): CanvasDocument | null {
  if (event.origin !== expected.origin) return null
  if (event.source !== expected.parent) return null
  const data = readEnvelope(event.data)
  if (data?.type !== "document") return null
  return readDocument(data.document)
}

const REGIONS: readonly Region[] = ["page", "header", "footer"]

const isId = (value: unknown): value is string =>
  typeof value === "string" && value !== ""

/** An action off the wire, or null when it is not a well-formed one. */
function readAction(data: Record<string, unknown>): CanvasAction | null {
  switch (data.type) {
    case "ready":
      return { type: "ready" }
    case "select":
    case "duplicate":
    case "delete":
      return isId(data.id) ? { type: data.type, id: data.id } : null
    case "move":
      return isId(data.id) &&
        (data.direction === "up" || data.direction === "down")
        ? { type: "move", id: data.id, direction: data.direction }
        : null
    case "insert-request":
      return REGIONS.includes(data.region as Region) &&
        Number.isInteger(data.index) &&
        (data.index as number) >= 0
        ? {
            type: "insert-request",
            region: data.region as Region,
            index: data.index as number,
          }
        : null
    case "edit-text":
      return REGIONS.includes(data.region as Region) &&
        Number.isInteger(data.index) &&
        (data.index as number) >= 0 &&
        typeof data.fieldPath === "string" &&
        isFieldPath(data.fieldPath) &&
        (typeof data.value === "string" || isRecord(data.value))
        ? {
            type: "edit-text",
            region: data.region as Region,
            index: data.index as number,
            fieldPath: data.fieldPath,
            value: data.value as string | Record<string, unknown>,
          }
        : null
    default:
      return null
  }
}

/** What makes a Block what it is: text edited in place never sets these. */
const IDENTITY = new Set(["id", "blockType", "blockName"])

/**
 * A dotted path of field names and list positions ("heading", "cta.label",
 * "items.2.title"), that does not go through what makes a Block what it is.
 */
function isFieldPath(path: string): boolean {
  return (
    /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/.test(path) &&
    !path.split(".").some((segment) => IDENTITY.has(segment))
  )
}

/** A Lexical node: a record with a type, whose children (if any) are nodes. */
function isLexicalNode(value: unknown, depth = 0): boolean {
  if (depth > 64 || !isRecord(value) || typeof value.type !== "string") {
    return false
  }
  if (value.type === "link" || value.type === "autolink") {
    const url = isRecord(value.fields) ? value.fields.url : undefined
    // A link is a URL or a Site path, as Links are everywhere (see link.ts).
    if (typeof url !== "string" || url === "" || validateHref(url) !== true) {
      return false
    }
  }
  if (value.children === undefined) return true
  return (
    Array.isArray(value.children) &&
    value.children.every((child) => isLexicalNode(child, depth + 1))
  )
}

/**
 * Whether an `edit-text` may replace the field's `current` value with
 * `value`. It must be the same kind of thing: a text for a text, and for rich
 * text a Lexical document whose links are safe. A field the Block does not
 * have is not one the canvas can set.
 */
export function acceptsTextEdit(current: unknown, value: unknown): boolean {
  if (typeof current === "string") return typeof value === "string"
  if (!isRecord(current)) return false
  if (!isRecord(value) || !isRecord(value.root)) return false
  return (
    value.root.type === "root" &&
    Array.isArray(value.root.children) &&
    isLexicalNode(value.root)
  )
}

/**
 * The Admin reads the canvas: a known message from the canvas's own `frame`
 * window, on `origin`. Null for anything else, and while the iframe has no
 * window yet.
 */
export function readCanvasMessage(
  event: MessageLike,
  expected: { origin: string; frame: Window | null }
): CanvasAction | null {
  if (!expected.frame) return null
  if (event.origin !== expected.origin) return null
  if (event.source !== expected.frame) return null
  const data = readEnvelope(event.data)
  return data ? readAction(data) : null
}

// ── Posting ──────────────────────────────────────────────────────────────────

/** A message is only ever addressed to one real origin. */
function assertOrigin(origin: string) {
  if (origin === "*" || origin === "null" || origin === "") {
    throw new Error(`The bridge posts only to a real origin, not "${origin}".`)
  }
}

/** The Admin posts `document` to the canvas window. */
export function postDocumentToCanvas(
  frame: Window,
  origin: string,
  document: CanvasDocument
): void {
  assertOrigin(origin)
  const message: ParentMessage = {
    channel: BRIDGE_CHANNEL,
    type: "document",
    document,
  }
  frame.postMessage(message, origin)
}

/** The canvas tells the Admin something: that it is ready, or what it asks for. */
export function postToParent(
  parent: Window,
  origin: string,
  action: CanvasAction
): void {
  assertOrigin(origin)
  const message: CanvasMessage = { channel: BRIDGE_CHANNEL, ...action }
  parent.postMessage(message, origin)
}

/** The canvas tells the Admin it can receive documents. */
export function postReadyToParent(parent: Window, origin: string): void {
  postToParent(parent, origin, { type: "ready" })
}
