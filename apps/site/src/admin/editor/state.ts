import type { ThemeInputs } from "../../theme/inputs"
import { isDirty } from "../kit/unsaved/dirty"
import type { BlockValues, PageValues } from "../pageForm"

/**
 * The Visual Editor's document state: the one document being edited (a Page,
 * a Layout or the Theme), its saved baseline, the undo/redo stacks and the
 * selected Block. Pure data and a pure reducer, so an edit shows on the canvas
 * the moment it is dispatched, with no network round trip, and every rule
 * here is testable without a browser.
 */

/** Where a Page or Layout keeps a list of Blocks. */
export type Region = "page" | "header" | "footer"

/**
 * Which Layout a Page uses: the one that applies to its path, none at all, or
 * a specific one.
 */
export type LayoutChoice =
  | { mode: "default" }
  | { mode: "none" }
  | { mode: "layout"; layoutId: number }

export type PageDocument = {
  kind: "page"
  title: string
  path: string
  layout: LayoutChoice
  blocks: BlockValues[]
  seo: PageValues["seo"]
}

export type LayoutDocument = {
  kind: "layout"
  name: string
  /** The paths this Layout is the default for. */
  paths: string[]
  /** Whether it is the Site's default Layout. */
  isDefault: boolean
  header: BlockValues[]
  footer: BlockValues[]
}

export type ThemeDocument = { kind: "theme"; inputs: ThemeInputs }

export type EditorDocument = PageDocument | LayoutDocument | ThemeDocument

/** The Regions each kind of document has. The Theme has no Blocks. */
const REGIONS: Record<EditorDocument["kind"], readonly Region[]> = {
  page: ["page"],
  layout: ["header", "footer"],
  theme: [],
}

/** How many undo steps are kept. */
export const HISTORY_LIMIT = 100

export type EditorState = {
  /** The document as it is now. */
  doc: EditorDocument
  /** The document as last saved (or loaded): what Discard returns to. */
  baseline: EditorDocument
  /** Earlier documents, oldest first. */
  past: EditorDocument[]
  /** Documents undone, next redo last. */
  future: EditorDocument[]
  selectedId: string | null
  /**
   * The field the last edit typed into. The next edit to the same field, with
   * nothing else in between, joins that step instead of starting a new one.
   */
  coalesceKey: string | null
  /** Source of new Block ids. It never goes back, so an id is never reused. */
  nextId: number
}

export type EditorAction =
  /** `path` is dotted from the document root, e.g. "seo.title", "blocks.0.cta.label", "inputs.primary". */
  | { type: "setField"; path: string; value: unknown }
  | { type: "insertBlock"; region: Region; index: number; block: BlockValues }
  | { type: "moveBlock"; region: Region; from: number; to: number }
  | { type: "duplicateBlock"; id: string }
  | { type: "removeBlock"; id: string }
  | { type: "select"; id: string }
  | { type: "deselect" }
  | { type: "undo" }
  | { type: "redo" }
  /** Back to the saved baseline; the history is cleared. */
  | { type: "discard" }
  /**
   * A save came back. `doc` is what the server stored and `sent` is the
   * document the save request carried. Saving is async, so the Staff User may
   * have edited since `sent`.
   */
  | { type: "markSaved"; doc: EditorDocument; sent: EditorDocument }

// ── Selectors ────────────────────────────────────────────────────────────────

export const regionsOf = (doc: EditorDocument): readonly Region[] =>
  REGIONS[doc.kind]

/** The Blocks in `region`, or none when the document has no such Region. */
export function blocksIn(doc: EditorDocument, region: Region): BlockValues[] {
  switch (doc.kind) {
    case "page":
      return region === "page" ? doc.blocks : []
    case "layout":
      return region === "header"
        ? doc.header
        : region === "footer"
          ? doc.footer
          : []
    case "theme":
      return []
  }
}

/** Where a Block is, or null when no Block has that id. */
export function findBlock(
  doc: EditorDocument,
  id: string
): { region: Region; index: number; block: BlockValues } | null {
  for (const region of regionsOf(doc)) {
    const blocks = blocksIn(doc, region)
    const index = blocks.findIndex((block) => block.id === id)
    if (index >= 0) return { region, index, block: blocks[index]! }
  }
  return null
}

export const isEditorDirty = (state: EditorState) =>
  isDirty(state.baseline, state.doc)

export const canUndo = (state: EditorState) => state.past.length > 0
export const canRedo = (state: EditorState) => state.future.length > 0

// ── Creating ─────────────────────────────────────────────────────────────────

/**
 * Starts editing `doc`, which is also the saved baseline. Blocks that come
 * without an id are given one, so each can be selected.
 */
export function createEditorState(doc: EditorDocument): EditorState {
  const withIds = ensureIds(doc, { nextId: 1 })
  return {
    doc: withIds.doc,
    baseline: withIds.doc,
    past: [],
    future: [],
    selectedId: null,
    coalesceKey: null,
    nextId: withIds.nextId,
  }
}

// ── Reducer ──────────────────────────────────────────────────────────────────

export function editorReducer(
  state: EditorState,
  action: EditorAction
): EditorState {
  switch (action.type) {
    case "setField":
      return setField(state, action.path, action.value)

    case "insertBlock": {
      if (!regionsOf(state.doc).includes(action.region)) return state
      const blocks = blocksIn(state.doc, action.region)
      const index = Math.min(Math.max(action.index, 0), blocks.length)
      const { block, nextId } = withFreshId(state, action.block)
      return commit(
        { ...state, nextId },
        withBlocks(state.doc, action.region, spliced(blocks, index, 0, block)),
        { selectedId: block.id ?? null }
      )
    }

    case "moveBlock": {
      if (!regionsOf(state.doc).includes(action.region)) return state
      const blocks = blocksIn(state.doc, action.region)
      const { from, to } = action
      const inRange = (i: number) =>
        Number.isInteger(i) && i >= 0 && i < blocks.length
      if (!inRange(from) || !inRange(to) || from === to) return state
      const moved = spliced(spliced(blocks, from, 1), to, 0, blocks[from]!)
      return commit(state, withBlocks(state.doc, action.region, moved))
    }

    case "duplicateBlock": {
      const found = findBlock(state.doc, action.id)
      if (!found) return state
      const { block, nextId } = withFreshId(state, {
        ...structuredClone(found.block),
        id: undefined,
      })
      return commit(
        { ...state, nextId },
        withBlocks(
          state.doc,
          found.region,
          spliced(blocksIn(state.doc, found.region), found.index + 1, 0, block)
        ),
        { selectedId: block.id ?? null }
      )
    }

    case "removeBlock": {
      const found = findBlock(state.doc, action.id)
      if (!found) return state
      return commit(
        state,
        withBlocks(
          state.doc,
          found.region,
          spliced(blocksIn(state.doc, found.region), found.index, 1)
        )
      )
    }

    case "select": {
      // Block editing is off in Theme mode, and an id that is not there is stale.
      if (!findBlock(state.doc, action.id)) return state
      return setSelection(state, action.id)
    }

    case "deselect":
      return setSelection(state, null)

    case "undo": {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [...state.future, state.doc],
        selectedId: survivingSelection(previous, state.selectedId),
        coalesceKey: null,
      }
    }

    case "redo": {
      const next = state.future.at(-1)
      if (!next) return state
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc],
        future: state.future.slice(0, -1),
        selectedId: survivingSelection(next, state.selectedId),
        coalesceKey: null,
      }
    }

    case "discard":
      return {
        ...state,
        doc: state.baseline,
        past: [],
        future: [],
        selectedId: null,
        coalesceKey: null,
      }

    case "markSaved": {
      // What the server stored is always the new baseline. It replaces the
      // document only when nothing changed since the save was sent; otherwise
      // the Staff User's later edits stay, with their history, and the
      // document stays dirty against the new baseline. Either way it is not an
      // edit, so the history keeps its steps (undoing past a save makes the
      // document dirty again).
      const stored = ensureIds(action.doc, state)
      const unchanged = !isDirty(action.sent, state.doc)
      return {
        ...state,
        doc: unchanged ? stored.doc : state.doc,
        baseline: stored.doc,
        nextId: stored.nextId,
        selectedId: unchanged
          ? survivingSelection(stored.doc, state.selectedId)
          : state.selectedId,
        coalesceKey: unchanged ? null : state.coalesceKey,
      }
    }
  }
}

// ── Edits ────────────────────────────────────────────────────────────────────

/**
 * Records `doc` as the next document. It is one undo step, it ends the redo
 * stack, and it ends any typing run. Returns `state` untouched when nothing
 * changed.
 */
function commit(
  state: EditorState,
  doc: EditorDocument,
  extra: { selectedId?: string | null; coalesceKey?: string | null } = {}
): EditorState {
  if (!isDirty(state.doc, doc)) return state
  return {
    ...state,
    doc,
    past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
    future: [],
    selectedId: extra.selectedId ?? survivingSelection(doc, state.selectedId),
    coalesceKey: extra.coalesceKey ?? null,
  }
}

function setField(
  state: EditorState,
  path: string,
  value: unknown
): EditorState {
  const doc = setAtPath(state.doc, path, value)
  if (doc === null || !isDirty(state.doc, doc)) return state

  const key = `field:${path}`
  if (state.coalesceKey === key && state.past.length > 0) {
    // Still typing in the same field: the step already on the stack covers it.
    return {
      ...state,
      doc,
      selectedId: survivingSelection(doc, state.selectedId),
    }
  }
  return commit(state, doc, { coalesceKey: key })
}

function setSelection(state: EditorState, id: string | null): EditorState {
  if (state.selectedId === id) return state
  return { ...state, selectedId: id, coalesceKey: null }
}

const survivingSelection = (doc: EditorDocument, id: string | null) =>
  id !== null && findBlock(doc, id) ? id : null

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A copy of `items` with `deleteCount` items removed at `start` and `added` put there. */
function spliced<T>(
  items: readonly T[],
  start: number,
  deleteCount: number,
  ...added: T[]
): T[] {
  const copy = [...items]
  copy.splice(start, deleteCount, ...added)
  return copy
}

function withBlocks(
  doc: EditorDocument,
  region: Region,
  blocks: BlockValues[]
): EditorDocument {
  switch (doc.kind) {
    case "page":
      return { ...doc, blocks }
    case "layout":
      return region === "header"
        ? { ...doc, header: blocks }
        : { ...doc, footer: blocks }
    case "theme":
      return doc
  }
}

const idsIn = (doc: EditorDocument) =>
  new Set(
    regionsOf(doc).flatMap((region) =>
      blocksIn(doc, region).flatMap((block) => (block.id ? [block.id] : []))
    )
  )

/** Ids the editor makes look like this; the counter keeps them apart from stored ones. */
const makeId = (n: number) => `new-${n}`

/** `block` with an id nothing else in the document, or in its history, uses. */
function withFreshId(
  state: EditorState,
  block: BlockValues
): { block: BlockValues; nextId: number } {
  const taken = new Set<string>()
  for (const doc of [
    state.doc,
    state.baseline,
    ...state.past,
    ...state.future,
  ]) {
    idsIn(doc).forEach((id) => taken.add(id))
  }
  if (block.id && !taken.has(block.id)) return { block, nextId: state.nextId }
  let n = state.nextId
  while (taken.has(makeId(n))) n++
  return { block: { ...block, id: makeId(n) }, nextId: n + 1 }
}

/** `doc` with an id on every Block that has none, and one id per Block. */
function ensureIds(
  doc: EditorDocument,
  { nextId }: { nextId: number }
): { doc: EditorDocument; nextId: number } {
  let next = nextId
  let result = doc
  const seen = new Set<string>()
  for (const region of regionsOf(doc)) {
    const blocks = blocksIn(result, region).map((block) => {
      if (block.id && !seen.has(block.id)) {
        seen.add(block.id)
        return block
      }
      let id = makeId(next++)
      while (seen.has(id)) id = makeId(next++)
      seen.add(id)
      return { ...block, id }
    })
    result = withBlocks(result, region, blocks)
  }
  return { doc: result, nextId: next }
}

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"])

/**
 * A copy of `doc` with `value` at the dotted `path`, sharing everything else.
 * Null when the path does not lead to an existing field of the document (the
 * document's `kind` is not a field).
 */
function setAtPath(
  doc: EditorDocument,
  path: string,
  value: unknown
): EditorDocument | null {
  const segments = path.split(".")
  if (
    segments.some((s) => s === "" || FORBIDDEN_SEGMENTS.has(s)) ||
    segments[0] === "kind"
  ) {
    return null
  }
  const updated = setIn(doc, segments, value)
  return updated === MISSING ? null : (updated as EditorDocument)
}

/** What `setIn` returns when the path leads nowhere (`undefined` can be a value). */
const MISSING = Symbol("missing")

function setIn(node: unknown, segments: string[], value: unknown): unknown {
  const [head, ...rest] = segments
  if (head === undefined) return value
  if (Array.isArray(node)) {
    const index = Number(head)
    if (!Number.isInteger(index) || index < 0 || index >= node.length) {
      return MISSING
    }
    const child = setIn(node[index], rest, value)
    return child === MISSING
      ? MISSING
      : node.map((item, i) => (i === index ? child : item))
  }
  if (typeof node === "object" && node !== null) {
    if (!Object.hasOwn(node, head)) return MISSING
    const child = setIn((node as Record<string, unknown>)[head], rest, value)
    return child === MISSING ? MISSING : { ...node, [head]: child }
  }
  return MISSING
}
