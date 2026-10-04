"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"

import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"

import {
  blockGroups,
  catalogue,
  catalogueEntries,
} from "../../blocks/catalogue"
import { regionCatalogue } from "../../site/regions/catalogue"
import type { BlockValues } from "../pageForm"
import { moveInGrid, type GridKey } from "./pickerGrid"
import { CONTAINER_LEVELS } from "../../blocks/Container"
import type { Region } from "./state"

/**
 * The Block picker: a large command-style dialog (most of the viewport on a
 * desktop, a full-screen sheet on a phone), opened by a "+" in the Outline or
 * between Blocks on the canvas. It searches the Blocks a region takes, under a
 * heading per group, as a responsive grid of big thumbnails each with its name
 * and one-line description, and inserts the chosen one with the catalogue's
 * default values. The arrow keys move over the grid, Enter inserts. The Page offers the whole Block catalogue; a
 * Header or Footer only the Blocks allowed there (the Footer also takes
 * Newsletter and Call to action, which are Page Blocks). A Container offers
 * the Page's Blocks that fit where it is: in a column only those that fit a
 * narrow one, and at the third level no Container (ADR-0007).
 *
 * The picker only chooses. Whoever opens it says what inserting does
 * (`onInsert`: the editor's `insertBlock`, which also selects the new Block).
 */

/**
 * Where the Block goes: the `index` place in `region`, or in the Blocks of
 * its Container `parentId`.
 */
export type InsertTarget = {
  region: Region
  index: number
  parentId?: string | null
}

/** One Block the picker offers. */
export type PickerEntry = {
  blockType: string
  label: string
  description: string
  /** `/block-thumbnails/<slug>.svg`. */
  thumbnail: string
  /** What a new Block of this type starts from. */
  defaults: object
}

export type PickerGroup = { heading: string; entries: PickerEntry[] }

/**
 * Where in a Container the Block goes: how many Containers deep the list is,
 * and whether it is narrower than the page (in columns, or at Reading width).
 */
export type PickerInside = { level: number; narrow: boolean }

const REGION_HEADING = { header: "Header", footer: "Footer" } as const

/**
 * The groups of Blocks `region` offers, in the order the picker shows them,
 * or the Blocks a Container `inside` it takes.
 */
export function pickerGroups(
  region: Region,
  inside?: PickerInside
): PickerGroup[] {
  if (region === "page") {
    const fits = (entry: (typeof catalogueEntries)[number]) =>
      !inside ||
      ((!inside.narrow || entry.fitsNarrow) &&
        (entry.blockType !== "container" || inside.level < CONTAINER_LEVELS))
    return blockGroups
      .map((heading) => ({
        heading,
        entries: catalogueEntries
          .filter((entry) => entry.group === heading && fits(entry))
          .map((entry) => ({
            blockType: entry.blockType,
            label: entry.label,
            description: entry.description,
            thumbnail: entry.thumbnail,
            defaults: entry.defaults,
          })),
      }))
      .filter((group) => group.entries.length > 0)
  }
  return [
    {
      heading: REGION_HEADING[region],
      entries: regionCatalogue(region, Boolean(inside))
        // A Container goes three levels deep in a region, as on a Page.
        .filter(
          (entry) =>
            entry.blockType !== "container" ||
            !inside ||
            inside.level < CONTAINER_LEVELS
        )
        .map((entry) => ({
          blockType: entry.blockType,
          label: entry.label,
          description: entry.description,
          thumbnail: entry.thumbnail,
          // A shared Block (Newsletter, Call to action) starts from the Page
          // catalogue's values.
          defaults: entry.shared
            ? catalogue[entry.blockType].defaults
            : entry.defaults,
        })),
    },
  ]
}

/**
 * The groups with only the entries that match `query`: every word of it must
 * appear, in any case, in the Block's label, description or group. Groups
 * left empty are dropped. A blank query matches everything.
 */
export function filterGroups(
  groups: PickerGroup[],
  query: string
): PickerGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return groups
  return groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => {
        const haystack =
          `${entry.label} ${entry.description} ${group.heading}`.toLowerCase()
        return words.every((word) => haystack.includes(word))
      }),
    }))
    .filter((group) => group.entries.length > 0)
}

export function BlockPicker({
  target,
  inside,
  onClose,
  onInsert,
}: {
  /** Where a Block is wanted; null keeps the picker closed. */
  target: InsertTarget | null
  /** Where the target is, when it is in a Container. */
  inside?: PickerInside
  onClose: () => void
  onInsert: (
    region: Region,
    index: number,
    block: BlockValues,
    parentId?: string | null
  ) => void
}) {
  // Not rendered at all while closed: the dialog's title sits outside its
  // popup and would otherwise stay in the page as a heading.
  if (!target) return null
  return (
    <CommandDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      // No fade or zoom: a Staff User who searches right away, and the
      // contrast checks, see the final colours, not a half-faded dialog.
      className={DIALOG_CLASS}
      showCloseButton
      title={inside ? "Add a Block to the Container" : "Add a Block"}
      description={
        inside?.narrow
          ? "Search the Blocks that fit a column, then press Enter to add one."
          : "Search the Blocks you can add, then press Enter to add one."
      }
    >
      <PickerBody
        target={target}
        inside={inside}
        onPick={(entry) => {
          // A copy: editing the new Block must never edit the catalogue. The
          // editor's state is still typed on the form's Block values, which
          // the catalogue's stored-shape defaults are not.
          const block = structuredClone(entry.defaults) as BlockValues
          onClose()
          if (target.parentId == null) {
            onInsert(target.region, target.index, block)
          } else {
            onInsert(target.region, target.index, block, target.parentId)
          }
        }}
      />
    </CommandDialog>
  )
}

/**
 * Sized by the viewport, not the content: a full-screen sheet below `sm`, then
 * 90% of the width (up to 80rem) and 85% of the height, centred. The Popup's
 * own `grid` becomes a flex column so the list takes the height left under the
 * search box and scrolls inside it.
 */
const DIALOG_CLASS = [
  // No fade or zoom (see above).
  "duration-0",
  "flex flex-col gap-0",
  "top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none!",
  "sm:top-1/2 sm:left-1/2 sm:h-[85vh] sm:w-[90vw] sm:max-w-7xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-(--card-radius)!",
].join(" ")

const GRID_KEYS = new Set<string>([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
])

/** How many entries sit side by side in the picker's grid right now. */
function measureColumns(list: HTMLElement | null): number {
  let columns = 1
  for (const items of list?.querySelectorAll("[cmdk-group-items]") ?? []) {
    const options = Array.from(items.children) as HTMLElement[]
    const first = options[0]
    if (!first) continue
    const inFirstRow = options.filter((o) => o.offsetTop === first.offsetTop)
    columns = Math.max(columns, inFirstRow.length)
  }
  return columns
}

function PickerBody({
  target,
  inside,
  onPick,
}: {
  target: InsertTarget
  inside: PickerInside | undefined
  onPick: (entry: PickerEntry) => void
}) {
  const [query, setQuery] = useState("")
  const [highlighted, setHighlighted] = useState("")
  const list = useRef<HTMLDivElement>(null)
  const groups = filterGroups(pickerGroups(target.region, inside), query)
  const visible = groups.flatMap((group) => group.entries)
  // Enter adds the highlighted Block, so it must always be one on screen: the
  // first, when a new search leaves the old highlight out.
  const current = visible.some((entry) => entry.blockType === highlighted)
    ? highlighted
    : (visible[0]?.blockType ?? "")

  // The arrows can move the highlight out of sight in the scrolling list.
  useEffect(() => {
    list.current
      ?.querySelector('[cmdk-item][aria-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest" })
  }, [current])

  /**
   * Arrows over the grid. They belong to the grid as long as they do not
   * edit the search text: Left and Right move the caret while there is text
   * and the caret is not at the edge they point to.
   */
  function onKeyDown(event: KeyboardEvent) {
    if (!GRID_KEYS.has(event.key)) return
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const input = event.target as HTMLInputElement
    if (query) {
      if (event.key === "ArrowLeft" && input.selectionStart !== 0) return
      if (event.key === "ArrowRight" && input.selectionEnd !== query.length)
        return
    }
    const group = groups.findIndex((g) =>
      g.entries.some((entry) => entry.blockType === current)
    )
    if (group < 0) return
    const from = {
      group,
      index: groups[group]!.entries.findIndex((e) => e.blockType === current),
    }
    const to = moveInGrid(
      groups.map((g) => g.entries.length),
      measureColumns(list.current),
      from,
      event.key as GridKey
    )
    // Stops cmdk's own up/down, which would walk the grid as a single column.
    event.preventDefault()
    setHighlighted(groups[to.group]!.entries[to.index]!.blockType)
  }

  return (
    // The matching is ours, so cmdk must not filter again.
    <Command
      shouldFilter={false}
      value={current}
      onValueChange={setHighlighted}
      onKeyDown={onKeyDown}
      // Room for the dialog's close button beside the search box.
      className="**:data-[slot=command-input-wrapper]:pr-10"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search Blocks"
        aria-label="Search Blocks"
      />
      <CommandList
        ref={list}
        className="max-h-none min-h-0 flex-1 scroll-py-10 p-1"
      >
        {groups.map((group) => (
          <CommandGroup
            key={group.heading}
            heading={group.heading}
            // Headings stay in view while their grid scrolls under them. Not
            // `overflow-hidden`, which would stop them sticking.
            className="overflow-visible **:[[cmdk-group-heading]]:sticky **:[[cmdk-group-heading]]:top-0 **:[[cmdk-group-heading]]:z-10 **:[[cmdk-group-heading]]:bg-popover **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-sm **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-foreground **:[[cmdk-group-items]]:grid **:[[cmdk-group-items]]:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] **:[[cmdk-group-items]]:gap-3 **:[[cmdk-group-items]]:p-2"
          >
            {group.entries.map((entry) => (
              <CommandItem
                key={entry.blockType}
                value={entry.blockType}
                onSelect={() => onPick(entry)}
                // A card: thumbnail over name and description. The trailing
                // check icon of the shared item is not part of it.
                className="flex-col items-stretch gap-2 border p-2 data-selected:ring-2 data-selected:ring-ring *:[svg]:hidden"
              >
                {/* Decorative: the visible label names the Block. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.thumbnail}
                  alt=""
                  width={160}
                  height={100}
                  className="aspect-[8/5] w-full rounded-sm border bg-background object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium">
                    {entry.label}
                  </span>{" "}
                  <span className="block text-sm text-foreground/70">
                    {entry.description}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div aria-live="polite" className="text-center text-sm">
        {visible.length === 0 && (
          <p className="py-6 text-muted-foreground">No Blocks match.</p>
        )}
      </div>
    </Command>
  )
}
