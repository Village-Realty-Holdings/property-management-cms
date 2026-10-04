import { catalogue, fitsNarrow } from "../../blocks/catalogue"
import { CONTAINER_LEVELS, hasColumns, narrows } from "../../blocks/Container"
import { regionHolds } from "../../blocks/region"
import { withoutRowIds } from "../../fields/rowIds"
import type { ThemeInputs } from "../../theme/inputs"
import { isDirty } from "../kit/unsaved/dirty"
import type { BlockValues, PageValues } from "../pageForm"

/**
 * The Visual Editor's document state: the one document being edited (a Page,
 * a Layout or the Theme), its saved baseline, the undo/redo stacks and the
 * selected Block. Pure data and a pure reducer, so an edit shows on the canvas
 * the moment it is dispatched, with no network round trip, and every rule
 * here is testable without a browser.
 *
 * A Page's Blocks are a tree: a Container holds Blocks, three levels deep
 * (ADR-0007). Every Block at every depth has an id, and the edits find it by
 * that id wherever it is. An edit that would put a Block where it can't be
 * stored (a fourth-level Container, a full-width Block in a column, a
 * Container in a Layout) changes nothing.
 */

/** Where a Page or Layout keeps a list of Blocks. */
export type Region = "page" | "header" | "footer"

/**
 * A list of Blocks: the Region's own, or the Blocks of the Container
 * `parentId` in it.
 */
export type BlockList = { region: Region; parentId?: string | null }

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
  /** A Page Template: new Pages can start from a copy of it. Absent means no. */
  isTemplate?: boolean
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
  | ({ type: "insertBlock"; index: number; block: BlockValues } & BlockList)
  /** Reorders one list: the Block at `from` goes to `to`. */
  | ({ type: "moveBlock"; from: number; to: number } & BlockList)
  /**
   * Moves the Block `id` to another list, or to another place in its own:
   * `index` is its place there once it has left where it was.
   */
  | ({ type: "moveBlockTo"; id: string; index: number } & BlockList)
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
   * document the save request carried. Saving is async, so the User may
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

/** Where a Block is in the document. */
export type FoundBlock = {
  region: Region
  /** The Container holding it, or null for a Block of the Region itself. */
  parentId: string | null
  /** Its place in that list. */
  index: number
  block: BlockValues
  /** Its path from the document's root, for `setField`: ["blocks", 1, "children", 0]. */
  path: (string | number)[]
  /** The Containers it is in, outermost first. */
  ancestors: BlockValues[]
}

/** Where a Block is, at any depth, or null when no Block has that id. */
export function findBlock(doc: EditorDocument, id: string): FoundBlock | null {
  const search = (
    blocks: readonly BlockValues[],
    at: Omit<FoundBlock, "index" | "block">
  ): FoundBlock | null => {
    for (const [index, block] of blocks.entries()) {
      if (block.id === id) {
        return { ...at, index, block, path: [...at.path, index] }
      }
      const inner = search(childrenOf(block), {
        region: at.region,
        parentId: block.id ?? null,
        path: [...at.path, index, CHILDREN],
        ancestors: [...at.ancestors, block],
      })
      if (inner) return inner
    }
    return null
  }
  for (const region of regionsOf(doc)) {
    const found = search(blocksIn(doc, region), {
      region,
      parentId: null,
      path: [REGION_KEY[region]],
      ancestors: [],
    })
    if (found) return found
  }
  return null
}

/**
 * A Block's place, named from its Region down: "Block 2" on the Page, "Block
 * 2, Container, Column 1" in a Container with columns, "Block 2, Container,
 * Block 1" in a stack. `path` is the Block's path in the document (a
 * `FoundBlock`'s); a place no Block is at is still named by its numbers.
 */
export function placeName(
  doc: EditorDocument,
  { region, path }: Pick<FoundBlock, "region" | "path">
): string {
  const [first, ...rest] = path.filter(
    (segment): segment is number => typeof segment === "number"
  )
  let block: BlockValues | undefined = blocksIn(doc, region)[first ?? 0]
  const parts = [`Block ${(first ?? 0) + 1}`]
  for (const index of rest) {
    const cell = block && hasColumns(block) ? "Column" : "Block"
    parts.push(block ? labelOf(block) : "Container", `${cell} ${index + 1}`)
    block = block ? childrenOf(block)[index] : undefined
  }
  return parts.join(", ")
}

/** The Blocks of `list`, or null when the document has no such list. */
export function blocksOfList(
  doc: EditorDocument,
  { region, parentId }: BlockList
): BlockValues[] | null {
  if (!regionsOf(doc).includes(region)) return null
  if (parentId == null) return blocksIn(doc, region)
  const parent = findBlock(doc, parentId)
  if (!parent || parent.region !== region || !isContainer(parent.block)) {
    return null
  }
  return childrenOf(parent.block)
}

/**
 * Where `list` sits: the Containers around it (`holders`, outermost first),
 * how many that is (0 for a Region's own Blocks), and whether it is narrower
 * than the page (one of them has columns, or is at Reading width). Null when
 * the document has no such list.
 */
export function listPlace(
  doc: EditorDocument,
  list: BlockList
): { level: number; narrow: boolean; holders: BlockValues[] } | null {
  if (!blocksOfList(doc, list)) return null
  if (list.parentId == null) return { level: 0, narrow: false, holders: [] }
  const parent = findBlock(doc, list.parentId)!
  const holders = [...parent.ancestors, parent.block]
  return {
    level: holders.length,
    narrow: holders.some((holder) => narrows(holder)),
    holders,
  }
}

/**
 * Why `block` (with the Blocks it holds) can't go in `list`, or null when it
 * can. The same rules a save checks (`refusedBlock`), said before the edit.
 */
export function placementProblem(
  doc: EditorDocument,
  block: BlockValues,
  list: BlockList
): string | null {
  const place = listPlace(doc, list)
  if (!place) return "There is no such place for a Block."
  if (list.region !== "page") {
    // A Container in a Header holds the Header's Blocks, and one in a
    // Footer the Footer's. (The picker offers a region only its own Blocks,
    // and a save refuses any other.)
    const region = list.region
    const stray =
      place.level > 0
        ? firstNotOf(region, block, true)
        : (childrenOf(block)
            .map((child) => firstNotOf(region, child, true))
            .find(Boolean) ?? null)
    if (stray) {
      return `A “${labelOf(stray)}” Block can't go in a Container in the ${
        region === "header" ? "Header" : "Footer"
      }.`
    }
  }
  if (block.id && place.holders.some((holder) => holder.id === block.id)) {
    return "A Container can't go inside itself."
  }
  if (
    list.region === "page" &&
    place.level > 0 &&
    !Object.hasOwn(catalogue, block.blockType)
  ) {
    return `A Container can't hold a “${String(block.blockType)}” Block.`
  }
  if (place.level + containerDepth(block) > CONTAINER_LEVELS) {
    return `Containers go ${CONTAINER_LEVELS} levels deep, and this would put one inside ${CONTAINER_LEVELS} Containers.`
  }
  const tooWide = firstTooWide(block, place.narrow)
  return tooWide
    ? `A “${labelOf(tooWide)}” Block needs the full width of the page and can't sit in a column.`
    : null
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
      const blocks = blocksOfList(state.doc, action)
      if (!blocks) return state
      const index = clamp(action.index, blocks.length)
      const { block, nextId } = withFreshIds(state, action.block)
      if (placementProblem(state.doc, block, action)) return state
      return commit(
        { ...state, nextId },
        withList(state.doc, action, spliced(blocks, index, 0, block)),
        { selectedId: block.id ?? null }
      )
    }

    case "moveBlock": {
      const blocks = blocksOfList(state.doc, action)
      if (!blocks) return state
      const { from, to } = action
      const inRange = (i: number) =>
        Number.isInteger(i) && i >= 0 && i < blocks.length
      if (!inRange(from) || !inRange(to) || from === to) return state
      const moved = spliced(spliced(blocks, from, 1), to, 0, blocks[from]!)
      return commit(state, withList(state.doc, action, moved))
    }

    case "moveBlockTo": {
      const found = findBlock(state.doc, action.id)
      if (!found || placementProblem(state.doc, found.block, action)) {
        return state
      }
      const without = withList(
        state.doc,
        found,
        spliced(blocksOfList(state.doc, found)!, found.index, 1)
      )
      // The Block was not inside the list it goes to, so the list is still there.
      const blocks = blocksOfList(without, action)!
      return commit(
        state,
        withList(
          without,
          action,
          spliced(blocks, clamp(action.index, blocks.length), 0, found.block)
        )
      )
    }

    case "duplicateBlock": {
      const found = findBlock(state.doc, action.id)
      if (!found) return state
      const { block, nextId } = withFreshIds(
        state,
        // No id of the original's goes with the copy: not its Blocks' ids,
        // nor its rows' (a Features item), which a save would find twice.
        withoutRowIds(found.block)
      )
      return commit(
        { ...state, nextId },
        withList(
          state.doc,
          found,
          spliced(blocksOfList(state.doc, found)!, found.index + 1, 0, block)
        ),
        { selectedId: block.id ?? null }
      )
    }

    case "removeBlock": {
      const found = findBlock(state.doc, action.id)
      if (!found) return state
      return commit(
        state,
        withList(
          state.doc,
          found,
          spliced(blocksOfList(state.doc, found)!, found.index, 1)
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
      // the User's later edits stay, with their history, and the
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

const clamp = (index: number, length: number) =>
  Math.min(Math.max(index, 0), length)

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

/** `doc` with `blocks` as the Blocks of `list`, which must be in it. */
function withList(
  doc: EditorDocument,
  list: BlockList,
  blocks: BlockValues[]
): EditorDocument {
  if (list.parentId == null) return withBlocks(doc, list.region, blocks)
  const parent = findBlock(doc, list.parentId)!
  const updated = setIn(doc, parent.path.map(String), {
    ...parent.block,
    [CHILDREN]: blocks,
  })
  return updated as EditorDocument
}

// ── The tree ─────────────────────────────────────────────────────────────────

/** Where a Region keeps its Blocks in the document. */
const REGION_KEY: Record<Region, string> = {
  page: "blocks",
  header: "header",
  footer: "footer",
}

/** The field a Container keeps its Blocks in. */
const CHILDREN = "children"

const isContainer = (block: BlockValues) =>
  (block.blockType as string) === "container"

/** The Blocks `block` holds: a Container's, none for any other Block. */
export function childrenOf(block: BlockValues): BlockValues[] {
  if (!isContainer(block)) return []
  const children = (block as Record<string, unknown>)[CHILDREN]
  return Array.isArray(children) ? (children as BlockValues[]) : []
}

/** `block` with `children` as its Blocks, when it is a Container. */
const withChildren = (block: BlockValues, children: BlockValues[]) =>
  isContainer(block) ? { ...block, [CHILDREN]: children } : block

/** How many Containers deep `block` goes: 0 for a Block, 1 for a Container of Blocks. */
function containerDepth(block: BlockValues): number {
  if (!isContainer(block)) return 0
  return 1 + Math.max(0, ...childrenOf(block).map(containerDepth))
}

/** The first Block in `block`'s tree that `region` doesn't take where it would be. */
function firstNotOf(
  region: "header" | "footer",
  block: BlockValues,
  inContainer: boolean
): BlockValues | null {
  if (!regionHolds(region, block.blockType, inContainer)) return block
  for (const child of childrenOf(block)) {
    const found = firstNotOf(region, child, true)
    if (found) return found
  }
  return null
}

/** The first Block in `block`'s tree that is narrower than the page and needs its width. */
function firstTooWide(block: BlockValues, narrow: boolean): BlockValues | null {
  if (narrow && !fitsNarrow(block.blockType)) return block
  const inner = narrow || narrows(block)
  for (const child of childrenOf(block)) {
    const found = firstTooWide(child, inner)
    if (found) return found
  }
  return null
}

const labelOf = (block: BlockValues) =>
  Object.hasOwn(catalogue, block.blockType)
    ? catalogue[block.blockType as keyof typeof catalogue].label
    : String(block.blockType)

/** Every Block in `blocks`, at every depth. */
function* everyBlock(blocks: readonly BlockValues[]): Generator<BlockValues> {
  for (const block of blocks) {
    yield block
    yield* everyBlock(childrenOf(block))
  }
}

/** `block` and the Blocks it holds, each passed through `change`, top down. */
function mapTree(
  block: BlockValues,
  change: (block: BlockValues) => BlockValues
): BlockValues {
  const changed = change(block)
  return isContainer(changed)
    ? withChildren(
        changed,
        childrenOf(changed).map((child) => mapTree(child, change))
      )
    : changed
}

const idsIn = (doc: EditorDocument) =>
  new Set(
    regionsOf(doc).flatMap((region) =>
      [...everyBlock(blocksIn(doc, region))].flatMap((block) =>
        block.id ? [block.id] : []
      )
    )
  )

/** Ids the editor makes look like this; the counter keeps them apart from stored ones. */
const makeId = (n: number) => `new-${n}`

/**
 * `block`, and every Block it holds, with an id nothing else in the document,
 * or in its history, uses.
 */
function withFreshIds(
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
  let n = state.nextId
  const fresh = mapTree(block, (b) => {
    if (b.id && !taken.has(b.id)) {
      taken.add(b.id)
      return b
    }
    while (taken.has(makeId(n))) n++
    taken.add(makeId(n))
    return { ...b, id: makeId(n++) }
  })
  return { block: fresh, nextId: n }
}

/** `doc` with an id on every Block that has none, at every depth, and one id per Block. */
function ensureIds(
  doc: EditorDocument,
  { nextId }: { nextId: number }
): { doc: EditorDocument; nextId: number } {
  let next = nextId
  let result = doc
  const seen = new Set<string>()
  const withId = (block: BlockValues) => {
    if (block.id && !seen.has(block.id)) {
      seen.add(block.id)
      return block
    }
    let id = makeId(next++)
    while (seen.has(id)) id = makeId(next++)
    seen.add(id)
    return { ...block, id }
  }
  for (const region of regionsOf(doc)) {
    const blocks = blocksIn(result, region).map((block) =>
      mapTree(block, withId)
    )
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
