"use client"

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, ChevronUp, Lock, Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { catalogue } from "../../blocks/catalogue"
import { regionCatalogueByType } from "../../site/regions/catalogue"
import type { RegionBlockType } from "../../site/regions/types"
import { BLOCK_TYPES, type BlockValues } from "../pageForm"
import { useEditor } from "./EditorProvider"
import { blocksIn, type Region } from "./state"

/**
 * The Outline: the Header, Page and Footer Block tree of the document being
 * edited. A row names the Block (its catalogue label) with a text hint, and
 * selecting it selects the Block. Blocks reorder within their region by drag
 * or, from the keyboard, with each row's Move up and Move down buttons.
 *
 * Each region the document owns has a "+" that opens the Block picker to add
 * a Block at the end of it.
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

/**
 * The move a drop makes within `blocks`: null when the Block was dropped on
 * itself, outside the list, or either end is not in this list (another region).
 */
export function moveForDrop(
  blocks: readonly BlockValues[],
  activeId: string,
  overId: string | null
): { from: number; to: number } | null {
  if (overId === null || activeId === overId) return null
  const from = blocks.findIndex((block) => block.id === activeId)
  const to = blocks.findIndex((block) => block.id === overId)
  return from < 0 || to < 0 ? null : { from, to }
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
  const { doc, selectedId, select, moveBlock, onInsertRequest } = useEditor()
  const [announcement, setAnnouncement] = useState("")
  const tree = useRef<HTMLDivElement>(null)
  /** The button to give focus back to once a move has re-rendered the rows. */
  const refocus = useRef<{ id: string; direction: "up" | "down" } | null>(null)

  const sensors = useSensors(
    // A few pixels of movement start a drag, so a plain click still selects.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

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

  const labelOf = (id: string | number) => {
    for (const region of owned) {
      const block = blocksIn(doc, region).find((b) => b.id === id)
      if (block) return blockLabel(block)
    }
    return "Block"
  }
  const position = (region: Region, id: string | number | undefined) => {
    const blocks = blocksIn(doc, region)
    return {
      place: blocks.findIndex((b) => b.id === id) + 1,
      of: blocks.length,
    }
  }

  const move = (region: Region, from: number, direction: "up" | "down") => {
    const blocks = blocksIn(doc, region)
    const block = blocks[from]
    const to = direction === "up" ? from - 1 : from + 1
    if (!block?.id || to < 0 || to >= blocks.length) return
    refocus.current = { id: block.id, direction }
    moveBlock(region, from, to)
    setAnnouncement(
      `${blockLabel(block)} moved to position ${to + 1} of ${blocks.length}.`
    )
  }

  const onDragEnd = (region: Region) => (event: DragEndEvent) => {
    const drop = moveForDrop(
      blocksIn(doc, region),
      String(event.active.id),
      event.over ? String(event.over.id) : null
    )
    if (drop) moveBlock(region, drop.from, drop.to)
  }

  const announcements = (region: Region): Announcements => {
    const where = (id: string | number | undefined) => {
      const { place, of } = position(region, id)
      return `position ${place} of ${of}`
    }
    return {
      onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over ? `${labelOf(active.id)} is over ${where(over.id)}.` : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? `${labelOf(active.id)} dropped at ${where(over.id)}.`
          : `${labelOf(active.id)} was not moved.`,
      onDragCancel: ({ active }) => `${labelOf(active.id)} was not moved.`,
    }
  }

  /** Arrow keys walk the rows; Enter or Space selects the focused one. */
  const onTreeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    if (!(event.target instanceof HTMLElement)) return
    if (event.target.getAttribute("role") !== "treeitem") return
    const rows = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="treeitem"]:not([aria-disabled="true"])'
      ),
    ]
    const at = rows.indexOf(event.target)
    const next = rows[at + (event.key === "ArrowDown" ? 1 : -1)]
    if (next) {
      event.preventDefault()
      next.focus()
    }
  }

  const choose = (id: string) => {
    select(id)
    onSelectBlock?.(id)
  }

  // One row is in the tab order: the selected Block, else the first one.
  const ownedIds = owned.flatMap((region) =>
    blocksIn(doc, region).flatMap((b) => (b.id ? [b.id] : []))
  )
  const tabbableId =
    selectedId !== null && ownedIds.includes(selectedId)
      ? selectedId
      : ownedIds[0]

  return (
    <div
      ref={tree}
      className="flex flex-col gap-4 p-3"
      onKeyDown={onTreeKeyDown}
    >
      {(["header", "page", "footer"] as const).map((region) => {
        const editable = owned.includes(region)
        const blocks = blocksOf(region)
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
                  onDragEnd={onDragEnd(region)}
                  accessibility={{ announcements: announcements(region) }}
                >
                  <SortableContext
                    items={blocks.map((b) => b.id ?? "")}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul
                      role="tree"
                      aria-label={`${REGION_LABEL[region]} Blocks`}
                      className="flex flex-col gap-1"
                    >
                      {blocks.map((block, index) => (
                        <SortableRow
                          key={block.id ?? index}
                          block={block}
                          selected={block.id === selectedId}
                          tabbable={block.id === tabbableId}
                          isFirst={index === 0}
                          isLast={index === blocks.length - 1}
                          onSelect={choose}
                          onMove={(direction) => move(region, index, direction)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
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

function SortableRow({
  block,
  selected,
  tabbable,
  isFirst,
  isLast,
  onSelect,
  onMove,
}: {
  block: BlockValues
  selected: boolean
  tabbable: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: (id: string) => void
  onMove: (direction: "up" | "down") => void
}) {
  const id = block.id ?? ""
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const label = blockLabel(block)
  const hintId = `outline-hint-${id}`

  const button = (
    direction: "up" | "down",
    disabled: boolean,
    icon: ReactNode
  ) => (
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
      {icon}
    </Button>
  )

  return (
    <li
      ref={setNodeRef}
      style={style}
      role="treeitem"
      aria-level={1}
      aria-selected={selected}
      aria-label={label}
      aria-describedby={blockHint(block) ? hintId : undefined}
      tabIndex={tabbable ? 0 : -1}
      {...listeners}
      onClick={() => onSelect(id)}
      onKeyDown={(event) => {
        // Only the row itself selects; its buttons keep their own keys.
        if (event.target !== event.currentTarget) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect(id)
        }
      }}
      className={cn(
        ROW_CLASS,
        "cursor-grab active:cursor-grabbing",
        selected && "border-primary bg-accent",
        isDragging && "relative z-10 opacity-80 shadow-md"
      )}
    >
      <RowText block={block} hintId={hintId} />
      <span className="flex shrink-0">
        {button("up", isFirst, <ChevronUp aria-hidden />)}
        {button("down", isLast, <ChevronDown aria-hidden />)}
      </span>
    </li>
  )
}
