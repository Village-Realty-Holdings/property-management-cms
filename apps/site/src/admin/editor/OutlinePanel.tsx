"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Lock,
  Plus,
  Trash2,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { catalogue } from "../../blocks/catalogue"
import { regionCatalogueByType } from "../../site/regions/catalogue"
import type { RegionBlockType } from "../../site/regions/types"
import { BLOCK_TYPES, type BlockValues } from "../pageForm"
import { useEditor } from "./EditorProvider"
import {
  blocksIn,
  blocksOfList,
  childrenOf,
  findBlock,
  placementProblem,
  type BlockList,
  type EditorDocument,
  type Region,
} from "./state"

/**
 * The Outline: the Header, Page and Footer Block tree of the document being
 * edited. A row names the Block (its catalogue label) with a text hint, and
 * selecting it selects the Block. Blocks reorder by drag or, from the
 * keyboard, with each row's Move up and Move down buttons (within their list).
 *
 * Each region the document owns has a "+" that opens the Block picker to add
 * a Block at the end of it.
 *
 * A Container's Blocks are listed under it, a level further in, and are
 * selected and moved within their Container the same way. A Container's row
 * has a "+" that adds a Block at the end of it, and each Block in a Container
 * a Remove button. A Container with Blocks collapses and expands, with its
 * button or with the Left and Right arrow keys, as a tree does; selecting a
 * Block elsewhere opens the Containers around it.
 *
 * Dragging a row moves its Block anywhere in its region: up and down, and
 * into or out of a Container by dragging it right or left, as in an outliner.
 * A drop the Container's depth or width forbids (ADR-0007) moves nothing and
 * says why, in the panel and to a screen reader.
 *
 * Regions the open document does not own are shown but locked: the Header and
 * Footer in Page mode (they come from the Page's Layout) and the Page in
 * Layout mode (each Page has its own Blocks).
 */

const REGION_LABEL: Record<Region, string> = {
  header: "Header",
  page: "Page",
  footer: "Footer",
}

const HINT_LENGTH = 60

// ── Pure helpers ─────────────────────────────────────────────────────────────

/** The Block's name in the catalogue ("Hero"); an unknown type shows its type, spaced out. */
function blockLabel(block: BlockValues): string {
  const type = String(block.blockType)
  if (Object.hasOwn(catalogue, type))
    return catalogue[type as keyof typeof catalogue].label
  if (Object.hasOwn(regionCatalogueByType, type))
    return regionCatalogueByType[type as RegionBlockType].label
  const known = BLOCK_TYPES.find((entry) => entry.blockType === type)
  if (known) return known.label
  const spaced = String(block.blockType)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Markdown reduced to its first line of plain words. */
function firstLine(markdown: string): string {
  const line = markdown.split("\n").find((l) => l.trim() !== "") ?? ""
  return line
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+[.)])\s+/, "")
    .replace(/[*_`~]/g, "")
    .trim()
}

/** A few words of the Block's own text, to tell two Blocks of a kind apart. */
export function blockHint(block: BlockValues): string {
  const source =
    "heading" in block &&
    typeof block.heading === "string" &&
    block.heading.trim() !== ""
      ? block.heading
      : "markdown" in block
        ? firstLine(block.markdown)
        : ""
  const hint = source.trim().replace(/\s+/g, " ")
  return hint.length > HINT_LENGTH
    ? `${hint.slice(0, HINT_LENGTH - 1).trimEnd()}…`
    : hint
}

/** One row of the Outline: a Block and where it sits. */
export type OutlineRow = {
  id: string
  block: BlockValues
  /** 0 for a Block of the Region itself, 1 for one in a Container, and so on. */
  depth: number
  /** The Container it is in, or null for a Block of the Region itself. */
  parentId: string | null
  /** Its place in that list, and how many Blocks the list has. */
  index: number
  count: number
  /** A Container whose Blocks show, so a Block can be put in it here. */
  open: boolean
}

/**
 * The rows of `blocks`, depth first: each Container is followed by its own
 * Blocks, unless it is in `collapsed`.
 */
export function outlineRows(
  blocks: readonly BlockValues[],
  collapsed: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null
): OutlineRow[] {
  return blocks.flatMap((block, index) => {
    const id = block.id ?? ""
    const open =
      (block.blockType as string) === "container" && !collapsed.has(id)
    const row = {
      id,
      block,
      depth,
      parentId,
      index,
      count: blocks.length,
      open,
    }
    return collapsed.has(id)
      ? [row]
      : [row, ...outlineRows(childrenOf(block), collapsed, depth + 1, id)]
  })
}

/** How far a row is indented per level, in pixels: 1rem. */
const INDENT = 16

/** What dropping a dragged row does. */
export type DropOutcome =
  | { kind: "none" }
  | { kind: "refused"; reason: string }
  | { kind: "move"; list: BlockList; index: number }

/**
 * Where the row `activeId` lands when dropped over the row `overId`, dragged
 * `offset` levels sideways (left is negative). `rows` are the rows shown
 * while it is dragged, without its own Blocks.
 *
 * As in an outliner, the row goes where `overId` was, and its depth is the
 * one it was dragged to, within what that place allows: no deeper than one
 * level under the row above it (when that is an open Container), and no
 * shallower than the row below it. Its Container is then the nearest row
 * above it one level up.
 */
function dropPlace(
  rows: readonly OutlineRow[],
  activeId: string,
  overId: string,
  offset: number
): { parentId: string | null; index: number; depth: number } | null {
  const from = rows.findIndex((row) => row.id === activeId)
  const to = rows.findIndex((row) => row.id === overId)
  if (from < 0 || to < 0) return null
  const active = rows[from]!
  // The rows without it: it goes in at `to`, between `previous` and `next`.
  const others = rows.filter((row) => row.id !== activeId)
  const before = others.slice(0, to)
  const previous = before.at(-1)
  const next = others[to]
  const deepest = previous ? previous.depth + (previous.open ? 1 : 0) : 0
  const shallowest = next?.depth ?? 0
  const depth = Math.min(Math.max(active.depth + offset, shallowest), deepest)
  const parentId =
    depth === 0
      ? null
      : ([...before].reverse().find((row) => row.depth === depth - 1)?.id ??
        null)
  return {
    parentId,
    index: before.filter((row) => row.parentId === parentId).length,
    depth,
  }
}

/**
 * What dropping the row `activeId` over `overId` in `region` does: a move to
 * its new place, nothing when that is where it was (or it was dropped
 * outside the list), or a refusal that says why, when the depth or the width
 * of the place forbids the Block there.
 */
export function dropOutcome(
  doc: EditorDocument,
  region: Region,
  rows: readonly OutlineRow[],
  activeId: string,
  overId: string | null,
  offset: number
): DropOutcome {
  const found = findBlock(doc, activeId)
  const place =
    overId === null ? null : dropPlace(rows, activeId, overId, offset)
  if (!found || !place) return { kind: "none" }
  const { parentId, index } = place
  if (parentId === found.parentId && index === found.index) {
    return { kind: "none" }
  }
  const list = { region, parentId }
  const reason = placementProblem(doc, found.block, list)
  return reason ? { kind: "refused", reason } : { kind: "move", list, index }
}

// ── The panel ────────────────────────────────────────────────────────────────

export function OutlinePanel({
  inherited,
  onSelectBlock,
}: {
  /**
   * Page mode: the Blocks of the Layout the Page uses, shown locked in the
   * Header and Footer. Omit for a Page with no Layout.
   */
  inherited?: {
    header?: readonly BlockValues[]
    footer?: readonly BlockValues[]
  }
  /**
   * Called after a row selects its Block. The editor's caller opens the Block
   * tab and scrolls the canvas to the Block with it.
   */
  onSelectBlock?: (id: string) => void
}) {
  const {
    doc,
    selectedId,
    select,
    moveBlock,
    moveBlockTo,
    removeBlock,
    onInsertRequest,
  } = useEditor()
  const [announcement, setAnnouncement] = useState("")
  const tree = useRef<HTMLDivElement>(null)
  /** The button to give focus back to once a move has re-rendered the rows. */
  const refocus = useRef<{ id: string; direction: "up" | "down" } | null>(null)
  /** The row to give focus to once a removal has re-rendered the rows. */
  const refocusRow = useRef<string | null>(null)
  /** The Containers whose Blocks are hidden. */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [revealedFor, setRevealedFor] = useState<string | null>(null)
  /** The row being dragged, the row it is over, and how many levels sideways. */
  const [drag, setDrag] = useState<{
    id: string
    overId: string | null
    offset: number
  } | null>(null)
  /** Why the last drop was refused, in its Region, until the next drag. */
  const [refusal, setRefusal] = useState<{
    region: Region
    reason: string
  } | null>(null)

  // A Block selected in the canvas may be in a collapsed Container: the
  // Containers around it open in this render, so its row is there to scroll to.
  if (selectedId !== revealedFor) {
    setRevealedFor(selectedId)
    const around =
      selectedId === null
        ? []
        : (findBlock(doc, selectedId)?.ancestors ?? []).map((b) => b.id)
    if (around.some((id) => id && collapsed.has(id))) {
      setCollapsed(new Set([...collapsed].filter((id) => !around.includes(id))))
    }
  }

  const toggle = (id: string, open: boolean) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (open) next.delete(id)
      else next.add(id)
      return next
    })

  const sensors = useSensors(
    // A few pixels of movement start a drag, so a plain click still selects.
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // On touch a short hold starts it, so a swipe still scrolls the panel.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    })
  )

  useLayoutEffect(() => {
    const row = refocusRow.current
    if (row === null) return
    refocusRow.current = null
    ;[
      ...(tree.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ??
        []),
    ]
      .find((el) => el.dataset.blockId === row)
      ?.focus()
  }, [doc])

  useLayoutEffect(() => {
    const target = refocus.current
    if (!target) return
    refocus.current = null
    const button = (direction: string) =>
      [
        ...(tree.current?.querySelectorAll<HTMLButtonElement>(
          `[data-move="${direction}"]`
        ) ?? []),
      ].find((el) => el.dataset.blockId === target.id)
    const wanted = button(target.direction)
    const other = button(target.direction === "up" ? "down" : "up")
    ;(wanted && !wanted.disabled ? wanted : other)?.focus()
  }, [doc])

  // A Block selected in the canvas may be off screen in a long tree.
  useEffect(() => {
    if (selectedId === null) return
    const row = [
      ...(tree.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ??
        []),
    ].find((el) => el.dataset.blockId === selectedId)
    row?.scrollIntoView?.({ block: "nearest" })
  }, [selectedId])

  if (doc.kind === "theme") {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        The Theme has no Blocks.
      </p>
    )
  }

  const owned: readonly Region[] =
    doc.kind === "page" ? ["page"] : ["header", "footer"]
  const lockedNote: Record<Region, string> =
    doc.kind === "page"
      ? {
          header: "From the Layout. Edit it in Layout mode.",
          page: "",
          footer: "From the Layout. Edit it in Layout mode.",
        }
      : {
          header: "",
          page: "Each Page has its own Blocks. Open a Page to edit them.",
          footer: "",
        }

  const blocksOf = (region: Region): readonly BlockValues[] =>
    owned.includes(region)
      ? blocksIn(doc, region)
      : (inherited?.[region as "header" | "footer"] ?? [])

  // A Container being dragged takes its Blocks with it, so they are hidden.
  const rowsOf = (region: Region) =>
    outlineRows(
      blocksIn(doc, region),
      drag ? new Set([...collapsed, drag.id]) : collapsed
    )

  const labelOf = (id: string | number) => {
    const found = findBlock(doc, String(id))
    return found && owned.includes(found.region)
      ? blockLabel(found.block)
      : "Block"
  }
  const move = (
    region: Region,
    from: number,
    direction: "up" | "down",
    parentId: string | null = null
  ) => {
    const blocks = blocksOfList(doc, { region, parentId }) ?? []
    const block = blocks[from]
    const to = direction === "up" ? from - 1 : from + 1
    if (!block?.id || to < 0 || to >= blocks.length) return
    refocus.current = { id: block.id, direction }
    moveBlock(region, from, to, parentId)
    setAnnouncement(
      `${blockLabel(block)} moved to position ${to + 1} of ${blocks.length}.`
    )
  }

  /** Adds a Block at the end of the Container `parent`, through the picker. */
  const addTo = (region: Region) => (parent: BlockValues) => {
    if (parent.id) {
      onInsertRequest(region, childrenOf(parent).length, parent.id)
    }
  }

  /** Removes a Block from its Container; focus goes to the Container's row. */
  const remove = (id: string) => {
    const found = findBlock(doc, id)
    if (!found) return
    refocusRow.current = found.parentId
    removeBlock(id)
    setAnnouncement(`${blockLabel(found.block)} removed.`)
  }

  /** Where a drop's `move` puts the Block `id`, said for a screen reader. */
  const where = (id: string, list: BlockList, index: number) => {
    const size =
      (blocksOfList(doc, list)?.length ?? 0) +
      (findBlock(doc, id)?.parentId === (list.parentId ?? null) ? 0 : 1)
    const inside = list.parentId
      ? "a Container"
      : `the ${REGION_LABEL[list.region]}`
    return `position ${index + 1} of ${size} in ${inside}`
  }

  /** What dropping the dragged row now would do. */
  const outcomeIn = (
    region: Region,
    id: string,
    overId: string | null,
    offset: number
  ) => dropOutcome(doc, region, rowsOf(region), id, overId, offset)

  const levels = (event: DragMoveEvent) => Math.round(event.delta.x / INDENT)

  const onDragMove = (event: DragMoveEvent) => {
    const overId = event.over ? String(event.over.id) : null
    const offset = levels(event)
    setDrag((current) =>
      current && (current.overId !== overId || current.offset !== offset)
        ? { ...current, overId, offset }
        : current
    )
  }

  const onDragEnd = (region: Region) => (event: DragEndEvent) => {
    const id = String(event.active.id)
    const label = labelOf(id)
    const outcome = outcomeIn(
      region,
      id,
      event.over ? String(event.over.id) : null,
      levels(event)
    )
    setDrag(null)
    if (outcome.kind === "move") {
      moveBlockTo(id, outcome.list, outcome.index)
      setAnnouncement(
        `${label} moved to ${where(id, outcome.list, outcome.index)}.`
      )
    } else if (outcome.kind === "refused") {
      setRefusal({ region, reason: outcome.reason })
      setAnnouncement(`${label} was not moved. ${outcome.reason}`)
    } else {
      setAnnouncement(`${label} was not moved.`)
    }
  }

  const announcements = (region: Region): Announcements => ({
    onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over || !drag) return undefined
      const id = String(active.id)
      const outcome = outcomeIn(region, id, String(over.id), drag.offset)
      return outcome.kind === "move"
        ? `${labelOf(id)} is over ${where(id, outcome.list, outcome.index)}.`
        : outcome.kind === "refused"
          ? `${labelOf(id)} can't go here. ${outcome.reason}`
          : `${labelOf(id)} is where it was.`
    },
    // The drop says what it did in the panel's own status.
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) => `${labelOf(active.id)} was not moved.`,
  })

  /**
   * The tree's keys: Up and Down walk the rows, Home and End go to the first
   * and the last; Right opens a Container, then goes to its first Block; Left
   * closes it, or goes to the Container a Block is in. Enter or Space on a
   * row selects it (the row's own handler).
   */
  const onTreeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = event.target
    if (!(row instanceof HTMLElement)) return
    if (row.getAttribute("role") !== "treeitem") return
    const rows = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="treeitem"]:not([aria-disabled="true"])'
      ),
    ]
    const at = rows.indexOf(row)
    const expanded = row.getAttribute("aria-expanded")
    const id = row.dataset.blockId ?? ""
    let next: HTMLElement | undefined
    switch (event.key) {
      case "ArrowDown":
        next = rows[at + 1]
        break
      case "ArrowUp":
        next = rows[at - 1]
        break
      case "Home":
        next = rows[0]
        break
      case "End":
        next = rows.at(-1)
        break
      case "ArrowRight":
        if (expanded === "false") {
          event.preventDefault()
          toggle(id, true)
          return
        }
        if (expanded === "true") next = rows[at + 1]
        break
      case "ArrowLeft": {
        if (expanded === "true") {
          event.preventDefault()
          toggle(id, false)
          return
        }
        const parentId = row.dataset.parentId
        if (parentId) next = rows.find((el) => el.dataset.blockId === parentId)
        break
      }
      default:
        return
    }
    if (next) {
      event.preventDefault()
      next.focus()
    }
  }

  const choose = (id: string) => {
    select(id)
    onSelectBlock?.(id)
  }

  // One row is in the tab order: the selected Block, or the Container that
  // hides it, else the first row.
  const shownIds = owned.flatMap((region) => rowsOf(region).map((r) => r.id))
  const selected = selectedId === null ? null : findBlock(doc, selectedId)
  const tabbableId =
    (selected &&
      [...selected.ancestors.map((b) => b.id), selected.block.id]
        .filter((id): id is string => !!id && shownIds.includes(id))
        .at(-1)) ||
    shownIds[0]

  return (
    <div
      ref={tree}
      className="flex flex-col gap-4 p-3"
      onKeyDown={onTreeKeyDown}
    >
      {(["header", "page", "footer"] as const).map((region) => {
        const editable = owned.includes(region)
        const blocks = blocksOf(region)
        const rows = editable ? rowsOf(region) : []
        // Rows leave room for a Container's toggle when there is one, so the
        // labels of a list line up.
        const toggles = rows.some((row) => childrenOf(row.block).length > 0)
        // While a row of this Region is dragged: the level it would land at,
        // and why it can't, when it can't.
        const dragged =
          drag && rows.some((row) => row.id === drag.id) ? drag : null
        const landing =
          dragged && dragged.overId !== null
            ? dropPlace(rows, dragged.id, dragged.overId, dragged.offset)
            : null
        const pending = dragged
          ? outcomeIn(region, dragged.id, dragged.overId, dragged.offset)
          : null
        const problem =
          pending?.kind === "refused"
            ? pending.reason
            : !dragged && refusal?.region === region
              ? refusal.reason
              : null
        const headingId = `outline-${region}`
        return (
          <div
            key={region}
            role="group"
            aria-labelledby={headingId}
            className="flex flex-col gap-1.5"
          >
            <div className="flex min-h-7 items-center justify-between gap-2">
              <h2
                id={headingId}
                className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {!editable && <Lock aria-hidden className="size-3" />}
                {REGION_LABEL[region]}
              </h2>
              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Add a Block to the ${REGION_LABEL[region]}`}
                  // At the end of the region; the canvas's "+" picks a place.
                  onClick={() => onInsertRequest(region, blocks.length)}
                >
                  <Plus aria-hidden />
                </Button>
              )}
            </div>

            {!editable && lockedNote[region] && (
              <p className="text-xs text-muted-foreground">
                {lockedNote[region]}
              </p>
            )}

            {editable && blocks.length === 0 && (
              <p className="text-xs text-muted-foreground">No Blocks yet.</p>
            )}

            {blocks.length > 0 &&
              (editable ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  // Rows come and go mid-drag: a dragged Container's Blocks hide.
                  measuring={{
                    droppable: { strategy: MeasuringStrategy.Always },
                  }}
                  onDragStart={({ active }) => {
                    setRefusal(null)
                    setDrag({ id: String(active.id), overId: null, offset: 0 })
                  }}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEnd(region)}
                  onDragCancel={() => setDrag(null)}
                  accessibility={{ announcements: announcements(region) }}
                >
                  <SortableContext
                    items={rows.map((row) => row.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul
                      role="tree"
                      aria-label={`${REGION_LABEL[region]} Blocks`}
                      className="flex flex-col gap-1"
                    >
                      {rows.map((row) => (
                        <Row
                          key={row.id}
                          row={row}
                          selected={row.id === selectedId}
                          tabbable={row.id === tabbableId}
                          expanded={
                            childrenOf(row.block).length > 0
                              ? row.open
                              : undefined
                          }
                          landing={
                            row.id === dragged?.id
                              ? {
                                  depth: landing?.depth ?? row.depth,
                                  refused: pending?.kind === "refused",
                                }
                              : undefined
                          }
                          toggleSlot={toggles}
                          onSelect={choose}
                          onToggle={toggle}
                          onMove={(direction) =>
                            move(region, row.index, direction, row.parentId)
                          }
                          onAdd={addTo(region)}
                          onRemove={remove}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                  {/* The row under the pointer is a copy, so the row in the
                      list can show the level it would land at: dnd-kit takes
                      a move of the dragged row's own box off the pointer's. */}
                  <DragOverlay dropAnimation={null}>
                    {dragged && (
                      <DraggedRow
                        block={findBlock(doc, dragged.id)?.block}
                        refused={pending?.kind === "refused"}
                      />
                    )}
                  </DragOverlay>
                </DndContext>
              ) : (
                <ul
                  role="tree"
                  aria-label={`${REGION_LABEL[region]} Blocks`}
                  className="flex flex-col gap-1"
                >
                  {blocks.map((block, index) => (
                    <LockedRow key={block.id ?? index} block={block} />
                  ))}
                </ul>
              ))}

            {/* Under the list, so that showing it mid-drag moves no row. */}
            {problem && <p className="text-xs text-destructive">{problem}</p>}
          </div>
        )
      })}
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

// ── Rows ─────────────────────────────────────────────────────────────────────

const ROW_CLASS =
  "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** What a row shows: the label and the hint, each on its own line. */
function RowText({ block, hintId }: { block: BlockValues; hintId: string }) {
  const hint = blockHint(block)
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="font-medium">{blockLabel(block)}</span>
      {hint && (
        <span id={hintId} className="truncate text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </span>
  )
}

/** The copy of a dragged row that follows the pointer. */
function DraggedRow({
  block,
  refused,
}: {
  block: BlockValues | undefined
  refused: boolean
}) {
  if (!block) return null
  return (
    <div
      aria-hidden
      className={cn(
        ROW_CLASS,
        "cursor-grabbing shadow-md",
        refused && "border-destructive"
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      <RowText block={block} hintId="outline-hint-dragged" />
    </div>
  )
}

/** A row in a locked region: shown, but it cannot be selected or moved. */
function LockedRow({ block }: { block: BlockValues }) {
  const hintId = `outline-hint-${block.id ?? "x"}`
  return (
    <li
      role="treeitem"
      aria-level={1}
      aria-selected={false}
      aria-disabled="true"
      aria-label={blockLabel(block)}
      aria-describedby={blockHint(block) ? hintId : undefined}
      className={cn(ROW_CLASS, "bg-muted/40 text-muted-foreground")}
    >
      <RowText block={block} hintId={hintId} />
    </li>
  )
}

/** A row's Move up or Move down button. */
function MoveButton({
  id,
  label,
  direction,
  disabled,
  onMove,
}: {
  id: string
  label: string
  direction: "up" | "down"
  disabled: boolean
  onMove: (direction: "up" | "down") => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Move ${label} ${direction}`}
      data-move={direction}
      data-block-id={id}
      disabled={disabled}
      onClick={() => onMove(direction)}
    >
      {direction === "up" ? (
        <ChevronUp aria-hidden />
      ) : (
        <ChevronDown aria-hidden />
      )}
    </Button>
  )
}

/** A Container row's "+": a Block at the end of the Container. */
function AddButton({
  block,
  onAdd,
}: {
  block: BlockValues
  onAdd: (parent: BlockValues) => void
}) {
  if ((block.blockType as string) !== "container") return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label="Add a Block to this Container"
      onClick={() => onAdd(block)}
    >
      <Plus aria-hidden />
    </Button>
  )
}

/**
 * A Container's toggle, which shows or hides its Blocks; an empty space the
 * same size on a row with nothing to toggle, when `slot` keeps one.
 */
function ToggleButton({
  id,
  label,
  expanded,
  slot,
  onToggle,
}: {
  id: string
  label: string
  expanded: boolean | undefined
  slot: boolean
  onToggle: (id: string, open: boolean) => void
}) {
  if (expanded === undefined) {
    return slot ? (
      <span
        aria-hidden
        className="size-[calc(var(--btn-height)*0.75)] shrink-0"
      />
    ) : null
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
      onClick={() => onToggle(id, !expanded)}
    >
      {expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
    </Button>
  )
}

/**
 * A click on the row selects it, but not one on its buttons: selecting opens
 * the Block tab, which would take the Outline, and focus, away mid-task.
 */
const selectOnClick =
  (id: string, onSelect: (id: string) => void) =>
  (event: MouseEvent<HTMLElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button") !== null
    )
      return
    onSelect(id)
  }

/** Enter or Space on the row itself selects it; its buttons keep their own keys. */
const selectKeys =
  (id: string, onSelect: (id: string) => void) =>
  (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(id)
    }
  }

/**
 * One Block's row, at any depth. The rows of a Region are one flat list, a
 * Container's Blocks right after it, so `aria-level` says how deep each is
 * and the row is indented a step per level. Any row can be dragged; one in a
 * Container has a Remove button.
 */
function Row({
  row,
  selected,
  tabbable,
  expanded,
  landing,
  toggleSlot,
  onSelect,
  onToggle,
  onMove,
  onAdd,
  onRemove,
}: {
  row: OutlineRow
  selected: boolean
  tabbable: boolean
  /** Whether a Container's Blocks show; undefined for a row with none. */
  expanded: boolean | undefined
  /** While the row is dragged: the level it would land at, and whether it may. */
  landing?: { depth: number; refused: boolean }
  toggleSlot: boolean
  onSelect: (id: string) => void
  onToggle: (id: string, open: boolean) => void
  onMove: (direction: "up" | "down") => void
  onAdd: (parent: BlockValues) => void
  onRemove: (id: string) => void
}) {
  const { id, block, depth } = row
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id })
  // One step in per level, from the Region's own rows; the dragged row's
  // place in the list shows the level it would land at.
  const indent = landing?.depth ?? depth
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginInlineStart: indent > 0 ? `${indent * INDENT}px` : undefined,
  }
  const label = blockLabel(block)
  const hintId = `outline-hint-${id}`

  return (
    <li
      ref={setNodeRef}
      style={style}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={expanded}
      aria-label={label}
      aria-describedby={blockHint(block) ? hintId : undefined}
      data-block-id={id}
      data-parent-id={row.parentId ?? undefined}
      tabIndex={tabbable ? 0 : -1}
      {...listeners}
      onClick={selectOnClick(id, onSelect)}
      onKeyDown={selectKeys(id, onSelect)}
      className={cn(
        ROW_CLASS,
        "cursor-grab active:cursor-grabbing",
        selected && "border-primary bg-accent",
        // Where the dragged row would land, at that level.
        isDragging && "border-dashed opacity-60",
        landing?.refused && "border-destructive"
      )}
    >
      <GripVertical
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
      <ToggleButton
        id={id}
        label={label}
        expanded={expanded}
        slot={toggleSlot}
        onToggle={onToggle}
      />
      <RowText block={block} hintId={hintId} />
      <span className="flex shrink-0">
        <MoveButton
          id={id}
          label={label}
          direction="up"
          disabled={row.index === 0}
          onMove={onMove}
        />
        <MoveButton
          id={id}
          label={label}
          direction="down"
          disabled={row.index === row.count - 1}
          onMove={onMove}
        />
        <AddButton block={block} onAdd={onAdd} />
        {depth > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${label}`}
            onClick={() => onRemove(id)}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </span>
    </li>
  )
}
