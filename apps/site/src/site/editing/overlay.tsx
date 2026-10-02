"use client"

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react"

import type { CanvasRequest } from "../../admin/editor/bridge"
import type { Region } from "../../admin/editor/state"
import { catalogue } from "../../blocks/catalogue"
import type { BlockType } from "../blocks/types"
import { regionCatalogueByType, type RegionBlockType } from "../regions"
import { BLOCK_SELECTOR } from "./BlockFrame"

/**
 * The Visual Editor's overlay on the canvas. It draws over the Site's own
 * markup and adds nothing to it:
 *
 *  - the Block under the pointer is outlined and labelled with its name, and
 *    inside Containers with theirs: "Container › Button";
 *  - a click selects the innermost Block under it: it asks the Admin to
 *    (`select`), and the Admin answers with the selection in its next
 *    document;
 *  - the selected Block has a toolbar (move up and down in its own list,
 *    duplicate, delete), each a request to the Admin;
 *  - a "+" above and below the hovered and the selected Block, and one in an
 *    empty Page, asks the Admin for a Block at that place (`insert-request`).
 *
 * Only Blocks of an `editable` region are touched: the rest (the Layout in
 * Page mode, the Page in Layout mode, everything in Theme mode) is locked, so
 * it is not outlined, selected or offered a "+".
 *
 * The overlay is drawn from the Blocks' boxes, measured when the page's markup
 * or size changes (see `useGeometry`). Its colours are the editor's own, not
 * the Theme's, so a Theme being edited cannot make the controls unreadable.
 */

const ACCENT = "#1d4ed8"
const INK = "#0f172a"
const Z = 2147483000
const LABEL_HEIGHT = 20
const TOOLBAR_HEIGHT = 32

type Box = { left: number; top: number; width: number; height: number }

type Measured = {
  id: string
  region: Region
  /** The Container it is in, or null for a Block of the region itself. */
  parentId: string | null
  index: number
  blockType: string
  box: Box
}

type Geometry = { blocks: Measured[]; main: Box | null }

const REGIONS: readonly Region[] = ["page", "header", "footer"]

/** What a Block is called: its name in the page or region catalogue. */
function labelOf(region: Region, blockType: string): string {
  const entry =
    region === "page"
      ? catalogue[blockType as BlockType]
      : regionCatalogueByType[blockType as RegionBlockType]
  return entry?.label ?? blockType
}

/** The smallest box around `rects`, in the page's coordinates. */
function union(rects: readonly DOMRect[], window: Window): Box | null {
  // A child that takes no room (hidden, or out of flow) sits at the origin
  // and would stretch the box to it.
  const real = rects.filter((r) => r.width > 0 || r.height > 0)
  const used = real.length > 0 ? real : rects
  if (used.length === 0) return null
  const left = Math.min(...used.map((r) => r.left))
  const top = Math.min(...used.map((r) => r.top))
  const right = Math.max(...used.map((r) => r.right))
  const bottom = Math.max(...used.map((r) => r.bottom))
  return {
    left: left + window.scrollX,
    top: top + window.scrollY,
    width: right - left,
    height: bottom - top,
  }
}

function measure(): Geometry {
  const blocks: Measured[] = []
  for (const el of document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    const region = el.dataset.blockRegion as Region
    const index = Number(el.dataset.blockIndex)
    const id = el.dataset.blockId
    if (!id || !REGIONS.includes(region) || !Number.isInteger(index)) continue
    const box = union(
      Array.from(el.children, (child) => child.getBoundingClientRect()),
      window
    )
    if (!box) continue
    blocks.push({
      id,
      region,
      parentId: el.dataset.blockParent ?? null,
      index,
      box,
      blockType: el.dataset.blockType ?? "",
    })
  }
  const main = document.querySelector("main")
  return {
    blocks,
    main: main ? union([main.getBoundingClientRect()], window) : null,
  }
}

const same = (a: Geometry, b: Geometry) =>
  JSON.stringify(a) === JSON.stringify(b)

function closestBlock(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>(BLOCK_SELECTOR)
    : null
}

const NOTHING: Geometry = { blocks: [], main: null }

/**
 * The Blocks' boxes, kept current: measured when the overlay mounts, whenever
 * the page's markup changes (the Admin posted a new document), and when the
 * page changes size (the window, images and fonts loading).
 */
function useGeometry(): Geometry {
  const [store] = useState(() => {
    let snapshot = NOTHING
    const listeners = new Set<() => void>()
    const update = () => {
      const next = measure()
      if (same(snapshot, next)) return
      snapshot = next
      listeners.forEach((listener) => listener())
    }
    const subscribe = (listener: () => void) => {
      listeners.add(listener)
      update()
      const mutations = new MutationObserver(update)
      mutations.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
      const resizes =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(update)
      resizes?.observe(document.body)
      window.addEventListener("resize", update)
      window.addEventListener("load", update, true)
      void document.fonts?.ready.then(update)
      return () => {
        listeners.delete(listener)
        mutations.disconnect()
        resizes?.disconnect()
        window.removeEventListener("resize", update)
        window.removeEventListener("load", update, true)
      }
    }
    return { subscribe, get: () => snapshot }
  })
  return useSyncExternalStore(store.subscribe, store.get, () => NOTHING)
}

export function CanvasOverlay({
  editable,
  selectedId,
  send,
}: {
  /** The regions a Staff User can edit now; the rest is locked. */
  editable: readonly Region[]
  /** The selected Block, by id. */
  selectedId: string | null
  /** Tells the Admin what the Staff User asked for. */
  send: (request: CanvasRequest) => void
}) {
  const editableKey = editable.join(",")
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const geometry = useGeometry()

  // The pointer and clicks, for the whole canvas. A Block is found from what
  // was hit, and counts only when its region is editable.
  useEffect(() => {
    const regions = editableKey === "" ? [] : editableKey.split(",")
    const editableBlock = (target: EventTarget | null) => {
      if (root?.contains(target as Node)) return null
      const el = closestBlock(target)
      const id = el?.dataset.blockId
      return id && regions.includes(el.dataset.blockRegion ?? "") ? id : null
    }
    const onOver = (event: MouseEvent) => {
      // On the overlay's own controls the Block stays as it was.
      if (root?.contains(event.target as Node)) return
      setHoveredId(editableBlock(event.target))
    }
    const onOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) setHoveredId(null)
    }
    const onClick = (event: MouseEvent) => {
      const id = editableBlock(event.target)
      if (id) send({ type: "select", id })
    }
    document.addEventListener("mouseover", onOver)
    document.addEventListener("mouseout", onOut)
    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseout", onOut)
      document.removeEventListener("click", onClick, true)
      setHoveredId(null)
    }
  }, [root, editableKey, send])

  // A Block selected from the Outline may be off screen: bring it into view,
  // moving the canvas only as far as it takes (a Block already in view stays).
  useEffect(() => {
    if (selectedId === null) return
    const regions = editableKey === "" ? [] : editableKey.split(",")
    const el = document.querySelector<HTMLElement>(
      `[data-block-id="${CSS.escape(selectedId)}"]`
    )
    if (!el || !regions.includes(el.dataset.blockRegion ?? "")) return
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView?.({
      block: "nearest",
      behavior: calm ? "auto" : "smooth",
    })
  }, [selectedId, editableKey])

  const blocks = useMemo(
    () => geometry.blocks.filter((b) => editable.includes(b.region)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `editableKey` is `editable`'s content
    [geometry.blocks, editableKey]
  )
  const find = (id: string | null) =>
    id === null ? undefined : blocks.find((b) => b.id === id)
  const hovered = find(hoveredId)
  const selected = find(selectedId)

  // A "+" for each edge of the Blocks in play; two Blocks that meet share one.
  const pluses = new Map<
    string,
    { at: Box; region: Region; index: number; label: string }
  >()
  for (const block of [hovered, selected]) {
    if (!block || block.parentId !== null) continue
    const { box, region, index } = block
    const edges = [
      { index, y: box.top, label: "Add Block above" },
      { index: index + 1, y: box.top + box.height, label: "Add Block below" },
    ]
    for (const edge of edges) {
      const key = `${region}:${edge.index}`
      if (pluses.has(key)) continue
      pluses.set(key, {
        at: { ...box, top: edge.y, height: 0 },
        region,
        index: edge.index,
        label: edge.label,
      })
    }
  }
  const emptyPage =
    editable.includes("page") &&
    !geometry.blocks.some((b) => b.region === "page")
      ? geometry.main
      : null

  /** The Blocks in the same list as `block`: its region's, or its Container's. */
  const siblings = (block: Measured) =>
    blocks.filter(
      (b) => b.region === block.region && b.parentId === block.parentId
    )
  /** A Block's name, after those of the Containers it is in. */
  const pathLabel = (block: Measured) => {
    const names = [labelOf(block.region, block.blockType)]
    for (
      let parent = find(block.parentId);
      parent;
      parent = find(parent.parentId)
    ) {
      names.unshift(labelOf(parent.region, parent.blockType))
    }
    return names.join(" › ")
  }

  return (
    <div
      ref={setRoot}
      data-canvas-overlay=""
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        zIndex: Z,
        pointerEvents: "none",
        font: "600 12px/20px system-ui, sans-serif",
      }}
    >
      {hovered && hovered !== selected && (
        <Frame block={hovered} label={pathLabel(hovered)} kind="hover" />
      )}
      {selected && (
        <Frame block={selected} label={pathLabel(selected)} kind="selected" />
      )}

      {[...pluses.values()].map(({ at, region, index, label }) => (
        <PlusButton
          key={`${region}:${index}`}
          at={at}
          label={label}
          onPress={() => send({ type: "insert-request", region, index })}
        />
      ))}

      {emptyPage && (
        <div
          style={{
            position: "absolute",
            left: emptyPage.left,
            top: emptyPage.top + 48,
            width: emptyPage.width,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            aria-label="Add Block"
            onClick={() =>
              send({ type: "insert-request", region: "page", index: 0 })
            }
            style={{ ...controlStyle, padding: "0 16px", gap: 6, height: 36 }}
          >
            <Plus size={16} aria-hidden /> Add a Block
          </button>
        </div>
      )}

      {selected && (
        <Toolbar
          block={selected}
          first={selected.index === 0}
          last={
            selected.index ===
            Math.max(...siblings(selected).map((b) => b.index))
          }
          send={send}
        />
      )}
    </div>
  )
}

const controlStyle: CSSProperties = {
  pointerEvents: "auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #fff",
  borderRadius: 6,
  background: INK,
  color: "#fff",
  cursor: "pointer",
  font: "600 13px/1 system-ui, sans-serif",
}

/** A Block's outline and its name. */
function Frame({
  block,
  label,
  kind,
}: {
  block: Measured
  label: string
  kind: "hover" | "selected"
}) {
  const { box } = block
  const above = box.top >= LABEL_HEIGHT
  return (
    <>
      <div
        data-canvas-outline={kind}
        style={{
          position: "absolute",
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          outline: `2px ${kind === "hover" ? "dashed" : "solid"} ${ACCENT}`,
          outlineOffset: -2,
          pointerEvents: "none",
        }}
      />
      <span
        data-canvas-label=""
        style={{
          position: "absolute",
          left: box.left,
          top: above ? box.top - LABEL_HEIGHT : box.top,
          height: LABEL_HEIGHT,
          padding: "0 8px",
          background: ACCENT,
          color: "#fff",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </>
  )
}

function PlusButton({
  at,
  label,
  onPress,
}: {
  at: Box
  label: string
  onPress: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onPress}
      style={{
        ...controlStyle,
        position: "absolute",
        left: at.left + at.width / 2,
        top: at.top,
        width: 24,
        height: 24,
        borderRadius: 12,
        background: ACCENT,
        transform: "translate(-50%, -50%)",
      }}
    >
      <Plus size={16} aria-hidden />
    </button>
  )
}

function Toolbar({
  block,
  first,
  last,
  send,
}: {
  block: Measured
  first: boolean
  last: boolean
  send: (request: CanvasRequest) => void
}) {
  const { box } = block
  const above = box.top >= TOOLBAR_HEIGHT + 4
  const button = (
    name: string,
    icon: ReactNode,
    request: CanvasRequest,
    disabled = false
  ) => (
    <button
      type="button"
      aria-label={name}
      title={name}
      disabled={disabled}
      onClick={() => send(request)}
      style={{
        ...controlStyle,
        border: "none",
        width: 28,
        height: 28,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {icon}
    </button>
  )
  return (
    <div
      role="toolbar"
      aria-label="Block toolbar"
      style={{
        position: "absolute",
        left: box.left + box.width,
        top: above ? box.top - TOOLBAR_HEIGHT - 4 : box.top + 4,
        transform: above
          ? "translateX(-100%)"
          : "translateX(calc(-100% - 4px))",
        display: "flex",
        gap: 2,
        padding: 2,
        borderRadius: 6,
        background: INK,
        pointerEvents: "auto",
        height: TOOLBAR_HEIGHT,
      }}
    >
      {button(
        "Move up",
        <ArrowUp size={16} aria-hidden />,
        { type: "move", id: block.id, direction: "up" },
        first
      )}
      {button(
        "Move down",
        <ArrowDown size={16} aria-hidden />,
        { type: "move", id: block.id, direction: "down" },
        last
      )}
      {button("Duplicate", <Copy size={16} aria-hidden />, {
        type: "duplicate",
        id: block.id,
      })}
      {button("Delete", <Trash2 size={16} aria-hidden />, {
        type: "delete",
        id: block.id,
      })}
    </div>
  )
}
