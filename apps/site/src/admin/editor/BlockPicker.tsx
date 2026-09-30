"use client"

import { useState } from "react"

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
import type { Region } from "./state"

/**
 * The Block picker: a command-style dialog, opened by a "+" in the Outline or
 * between Blocks on the canvas, that searches the Blocks a region takes,
 * grouped and with a thumbnail each, and inserts the chosen one with the
 * catalogue's default values. The Page offers the whole Block catalogue; a
 * Header or Footer only the Blocks allowed there (the Footer also takes
 * Newsletter and Call to action, which are Page Blocks).
 *
 * The picker only chooses. Whoever opens it says what inserting does
 * (`onInsert`: the editor's `insertBlock`, which also selects the new Block).
 */

/** Where the Block goes: the `index` place in `region`. */
export type InsertTarget = { region: Region; index: number }

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

const REGION_HEADING = { header: "Header", footer: "Footer" } as const

/** The groups of Blocks `region` offers, in the order the picker shows them. */
export function pickerGroups(region: Region): PickerGroup[] {
  if (region === "page") {
    return blockGroups
      .map((heading) => ({
        heading,
        entries: catalogueEntries
          .filter((entry) => entry.group === heading)
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
      entries: regionCatalogue(region).map((entry) => ({
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
  onClose,
  onInsert,
}: {
  /** Where a Block is wanted; null keeps the picker closed. */
  target: InsertTarget | null
  onClose: () => void
  onInsert: (region: Region, index: number, block: BlockValues) => void
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
      className="duration-0"
      title="Add a Block"
      description="Search the Blocks you can add, then press Enter to add one."
    >
      <PickerBody
        target={target}
        onPick={(entry) => {
          // A copy: editing the new Block must never edit the catalogue. The
          // editor's state is still typed on the form's Block values, which
          // the catalogue's stored-shape defaults are not.
          const block = structuredClone(entry.defaults) as BlockValues
          onClose()
          onInsert(target.region, target.index, block)
        }}
      />
    </CommandDialog>
  )
}

function PickerBody({
  target,
  onPick,
}: {
  target: InsertTarget
  onPick: (entry: PickerEntry) => void
}) {
  const [query, setQuery] = useState("")
  const [highlighted, setHighlighted] = useState("")
  const groups = filterGroups(pickerGroups(target.region), query)
  const visible = groups.flatMap((group) => group.entries)
  // Enter adds the highlighted Block, so it must always be one on screen: the
  // first, when a new search leaves the old highlight out.
  const current = visible.some((entry) => entry.blockType === highlighted)
    ? highlighted
    : (visible[0]?.blockType ?? "")

  return (
    // The matching is ours, so cmdk must not filter again.
    <Command
      shouldFilter={false}
      value={current}
      onValueChange={setHighlighted}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search Blocks"
        aria-label="Search Blocks"
      />
      <CommandList className="max-h-[60vh]">
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.entries.map((entry) => (
              <CommandItem
                key={entry.blockType}
                value={entry.blockType}
                onSelect={() => onPick(entry)}
              >
                {/* Decorative: the visible label names the Block. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.thumbnail}
                  alt=""
                  width={64}
                  height={48}
                  className="h-12 w-16 shrink-0 rounded-sm border bg-background object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{entry.label}</span>{" "}
                  <span className="block text-xs text-foreground/70">
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
