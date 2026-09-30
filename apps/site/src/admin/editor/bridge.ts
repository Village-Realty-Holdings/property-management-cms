import { normalizeInputs, type ThemeInputs } from "../../theme/inputs"
import { FALLBACK_INPUTS } from "../../theme/record/fallback"
import type { PageBlock } from "../../site/blocks/types"
import type { FooterBlock, HeaderBlock } from "../../site/regions/types"
import type { EditorDocument } from "./state"

/**
 * The message protocol between the Visual Editor and its canvas.
 *
 * The canvas is an iframe on the real Site route in its editing mode (see
 * src/site/editing). The Admin owns the document being edited; on every
 * change it posts the whole document to the canvas, which renders it from
 * that message alone. So an edit shows the moment it is made, with no network
 * round trip (Phase 5: instant preview).
 *
 *   Admin  -> canvas   `document`  the document to show
 *   canvas -> Admin    `ready`     the canvas can receive documents
 *
 * Both windows are on the Site's own origin, and both ends check it: a
 * message is read only when it comes from the expected window on the expected
 * origin, and is posted only to that origin, never to "*". Anything else,
 * including a message of another shape, is ignored. Later slices add the
 * canvas's `select`, `insert-request`, `edit-text` and `key` messages here.
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
}

type Envelope = { channel: typeof BRIDGE_CHANNEL }

/** Admin to canvas. */
export type ParentMessage = Envelope & {
  type: "document"
  document: CanvasDocument
}

/** Canvas to Admin. */
export type CanvasMessage = Envelope & { type: "ready" }

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
  const { mode, page, header, footer, theme } = value
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

/**
 * The Admin reads the canvas: a known message from the canvas's own `frame`
 * window, on `origin`. Null for anything else, and while the iframe has no
 * window yet.
 */
export function readCanvasMessage(
  event: MessageLike,
  expected: { origin: string; frame: Window | null }
): { type: "ready" } | null {
  if (!expected.frame) return null
  if (event.origin !== expected.origin) return null
  if (event.source !== expected.frame) return null
  const data = readEnvelope(event.data)
  return data?.type === "ready" ? { type: "ready" } : null
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

/** The canvas tells the Admin it can receive documents. */
export function postReadyToParent(parent: Window, origin: string): void {
  assertOrigin(origin)
  const message: CanvasMessage = { channel: BRIDGE_CHANNEL, type: "ready" }
  parent.postMessage(message, origin)
}
